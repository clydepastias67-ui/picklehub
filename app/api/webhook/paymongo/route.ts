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

    // Map payment type to Supabase table
    const tableMap: Record<string, string> = {
      booking:    'bookings',
      food:       'food_orders',
      coaching:   'coaching_sessions',
      tournament: 'tournament_registrations',
      shop:       'shop_orders',
    };

    const table = tableMap[type];
    if (!table) {
      console.error('Unknown payment type:', type);
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    // Update status to confirmed
    const { error } = await supabaseAdmin
      .from(table)
      .update({ status: 'confirmed' })
      .eq('id', referenceId);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    console.log(`✅ Payment confirmed: ${type} ${referenceId}`);
    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}