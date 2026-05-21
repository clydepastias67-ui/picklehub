import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

// Use service role key for webhook — bypasses RLS since this is server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify PayMongo webhook signature to reject forged requests
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('PAYMONGO_WEBHOOK_SECRET is not set');
    return false;
  }

  // PayMongo sends: "t=<timestamp>,te=<test_sig>,li=<live_sig>"
  const parts: Record<string, string> = {};
  signatureHeader.split(',').forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) parts[key.trim()] = value.trim();
  });

  const timestamp = parts['t'];
  // Use live signature in production, test signature in development
  const signature = process.env.NODE_ENV === 'production' ? parts['li'] : parts['te'];

  if (!timestamp || !signature) return false;

  // PayMongo HMAC: HMAC-SHA256 of "<timestamp>.<rawBody>"
  const expectedSig = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return expectedSig === signature;
}

export async function POST(req: Request) {
  try {
    // Read raw body first — must happen before json() for signature verification
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('paymongo-signature');

    if (!verifySignature(rawBody, signatureHeader)) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType = body.data?.attributes?.type;
    const paymentData = body.data?.attributes?.data;

    // Handle both link and checkout session payment events
    if (eventType !== 'link.payment.paid' && eventType !== 'checkout_session.payment.paid') {
      return NextResponse.json({ received: true });
    }

    // Checkout sessions store type/referenceId in metadata; links use remarks
    let type: string, referenceId: string;
    if (eventType === 'checkout_session.payment.paid') {
      const metadata = body.data?.attributes?.metadata || {};
      type = metadata.type;
      referenceId = metadata.referenceId;
    } else {
      const remarks = paymentData?.attributes?.remarks || '';
      [type, referenceId] = remarks.split(':');
    }

    if (!type || !referenceId) {
      console.error('Invalid payment metadata/remarks:', { type, referenceId });
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 });
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

      const { error: updateError } = await supabaseAdmin
        .from('shop_orders')
        .update({ status: 'confirmed' })
        .eq('payment_reference', referenceId);

      if (updateError) {
        console.error('Failed to confirm shop orders:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Decrement stock atomically via RPC — prevents race conditions on concurrent payments
      const purchaseOrders = orders.filter(o => o.type === 'purchase');
      await Promise.all(purchaseOrders.map(async order => {
        await supabaseAdmin.rpc('decrement_product_stock', {
          item_id: order.product_id,
          qty: order.quantity,
        });
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

      // Decrement stock atomically via RPC — prevents race conditions on concurrent payments
      const items = order.items as { id: string; qty: number }[];
      await Promise.all(items.map(async item => {
        await supabaseAdmin.rpc('decrement_menu_stock', {
          item_id: item.id,
          qty: item.qty,
        });
      }));

      console.log(`✅ Food payment confirmed: order ${referenceId}`);
      return NextResponse.json({ received: true });
    }

    // ── Tournament: no status column — payment confirms the registration row exists ──
    if (type === 'tournament') {
      const { data: reg, error } = await supabaseAdmin
        .from('tournament_registrations')
        .select('id, tournament_id, user_id')
        .eq('id', referenceId)
        .single();

      if (error || !reg) {
        console.error('Tournament registration not found:', error);
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
      }

      console.log(`✅ Tournament payment confirmed: registration ${referenceId}`);
      return NextResponse.json({ received: true });
    }

    // ── Booking / Coaching: simple status update ──
    const tableMap: Record<string, string> = {
      booking:  'bookings',
      coaching: 'coaching_sessions',
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