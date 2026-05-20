import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for webhook — bypasses RLS since this is server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.data?.attributes?.type;
    const paymentData = body.data?.attributes?.data;

    // Only handle successful payments
    if (eventType !== 'link.payment.paid') {
      return NextResponse.json({ received: true });
    }

    const remarks = paymentData?.attributes?.remarks || '';
    const [type, referenceId] = remarks.split(':');

    if (!type || !referenceId) {
      console.error('Invalid remarks format:', remarks);
      return NextResponse.json({ error: 'Invalid remarks' }, { status: 400 });
    }

    // ── Shop: reference is a payment_reference shared across all cart orders ──
    if (type === 'shop') {
      const { data: orders, error: fetchError } = await supabaseAdmin
        .from('shop_orders')
        .select('id, product_id, quantity, type')
        .eq('payment_reference', referenceId);

      if (fetchError || !orders) {
        console.error('Failed to fetch shop orders:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
      }

      // Confirm all orders in this cart
      const { error: updateError } = await supabaseAdmin
        .from('shop_orders')
        .update({ status: 'confirmed' })
        .eq('payment_reference', referenceId);

      if (updateError) {
        console.error('Failed to confirm shop orders:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Decrement stock for purchase items and auto-disable if stock hits 0
      const purchaseOrders = orders.filter(o => o.type === 'purchase');
      await Promise.all(purchaseOrders.map(async order => {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('stock')
          .eq('id', order.product_id)
          .single();

        if (!product || product.stock == null) return;

        const newStock = Math.max(0, product.stock - order.quantity);
        await supabaseAdmin
          .from('products')
          .update({ stock: newStock, ...(newStock === 0 ? { is_available: false } : {}) })
          .eq('id', order.product_id);
      }));

      console.log(`✅ Shop payment confirmed: ${orders.length} order(s) for ref ${referenceId}`);
      return NextResponse.json({ received: true });
    }

    // ── Food: decrement menu item stock after confirmed ──
    if (type === 'food') {
      const { data: order, error: fetchError } = await supabaseAdmin
        .from('food_orders')
        .select('id, items')
        .eq('id', referenceId)
        .single();

      if (fetchError || !order) {
        console.error('Failed to fetch food order:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('food_orders')
        .update({ status: 'confirmed' })
        .eq('id', referenceId);

      if (updateError) {
        console.error('Failed to confirm food order:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Decrement stock for each menu item and auto-disable if it hits 0
      const items = order.items as { id: string; qty: number }[];
      await Promise.all(items.map(async item => {
        const { data: menuItem } = await supabaseAdmin
          .from('menu_items')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (!menuItem || menuItem.stock == null) return;

        const newStock = Math.max(0, menuItem.stock - item.qty);
        await supabaseAdmin
          .from('menu_items')
          .update({ stock: newStock, ...(newStock === 0 ? { is_available: false } : {}) })
          .eq('id', item.id);
      }));

      console.log(`✅ Food payment confirmed: order ${referenceId}`);
      return NextResponse.json({ received: true });
    }

    // ── All other types: simple status update ──
    const tableMap: Record<string, string> = {
      booking:    'bookings',
      coaching:   'coaching_sessions',
      tournament: 'tournament_registrations',
    };

    const table = tableMap[type];
    if (!table) {
      console.error('Unknown payment type:', type);
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update({ status: 'confirmed' })
      .eq('id', referenceId);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Send booking confirmation email to the player
    if (type === 'booking') {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, total_price, courts(name, type), profiles(email, full_name)')
        .eq('id', referenceId)
        .single();

      if (booking) {
        const court   = booking.courts as unknown as { name: string; type: string } | null;
        const profile = booking.profiles as unknown as { email: string; full_name: string } | null;

        if (profile?.email && court?.name) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pickelhub.vercel.app';
          await fetch(`${baseUrl}/api/email/booking-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cron-secret': process.env.CRON_SECRET!,
            },
            body: JSON.stringify({
              bookingId:  booking.id,
              userEmail:  profile.email,
              userName:   profile.full_name,
              courtName:  court.name,
              courtType:  court.type,
              startTime:  booking.start_time,
              endTime:    booking.end_time,
              totalPrice: booking.total_price,
            }),
          }).catch(err => console.error('Failed to send confirmation email:', err));
        }
      }
    }

    console.log(`✅ Payment confirmed: ${type} ${referenceId}`);
    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}