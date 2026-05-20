import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find bookings that start between 55 and 65 minutes from now
    // (5-min window on each side gives tolerance for cron drift)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: upcomingBookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        total_price,
        courts ( name ),
        profiles ( email, full_name )
      `)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .in('status', ['confirmed', 'paid']);

    if (error) throw error;

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({ message: 'No upcoming bookings in window', checked_at: now.toISOString() });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pickelhub.vercel.app';
    const results: { bookingId: string; status: string }[] = [];

    for (const booking of upcomingBookings) {
      const court   = booking.courts as unknown as { name: string } | null;
      const profile = booking.profiles as unknown as { email: string; full_name: string } | null;

      if (!profile?.email || !court?.name) {
        results.push({ bookingId: booking.id, status: 'skipped — missing email or court' });
        continue;
      }

      try {
        const res = await fetch(`${baseUrl}/api/email/court-reminder`, {
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
            startTime:  booking.start_time,
            endTime:    booking.end_time,
            totalPrice: booking.total_price,
          }),
        });

        const data = await res.json();
        results.push({ bookingId: booking.id, status: data.success ? 'sent' : (data.message || 'failed') });
      } catch {
        results.push({ bookingId: booking.id, status: 'error sending email' });
      }
    }

    return NextResponse.json({ processed: results.length, results });

  } catch (err) {
    console.error('Court reminders cron error:', err);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}