import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, userEmail, userName, courtName, courtType, startTime, endTime, totalPrice } = await req.json();

    // Prevent duplicate cancellation emails
    const { data: existing } = await supabaseAdmin
      .from('email_logs')
      .select('id')
      .eq('type', 'booking_cancellation')
      .eq('reference_id', bookingId)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Cancellation already sent' });
    }

    const bookingDate = new Date(startTime);
    const endDate = new Date(endTime);

    const formattedDate = bookingDate.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedStart = bookingDate.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const formattedEnd = endDate.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const subject = `❌ Booking cancelled — ${courtName} on ${formattedDate}`;

    await resend.emails.send({
      from: 'Picklverse <onboarding@resend.dev>',
      to: userEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',sans-serif;">
          <div style="max-width:560px;margin:40px auto;padding:0 16px;">

            <!-- Header -->
            <div style="background:#161616;border:1px solid #1e1e1e;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="width:8px;height:8px;background:#639922;border-radius:50%;display:inline-block;"></div>
                <span style="color:#fff;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">Picklverse</span>
              </div>
              <div style="color:#e05252;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Booking Cancellation</div>
            </div>

            <!-- Body -->
            <div style="background:#161616;border:1px solid #1e1e1e;border-top:none;padding:32px;">

              <!-- Cancellation badge -->
              <div style="background:rgba(224,82,82,0.1);border:1px solid rgba(224,82,82,0.3);border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
                <div style="font-size:36px;margin-bottom:8px;">❌</div>
                <div style="color:#f87171;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;">Booking Cancelled</div>
                <div style="color:#888;font-size:13px;margin-top:4px;">Your booking has been cancelled by an admin</div>
              </div>

              <p style="color:#aaa;font-size:15px;line-height:1.6;margin-bottom:24px;">
                Hi ${userName || 'there'}, we're sorry to let you know that your court booking at Picklverse has been cancelled. Please contact us if you have any questions.
              </p>

              <!-- Booking details -->
              <div style="background:#1e1e1e;border-radius:10px;padding:20px;margin-bottom:24px;">
                <div style="color:#e05252;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;font-weight:700;">Cancelled Booking</div>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:10px 0;border-bottom:1px solid #2a2a2a;">Court</td>
                    <td style="color:#fff;font-size:14px;font-weight:700;padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;">${courtName}</td>
                  </tr>
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:10px 0;border-bottom:1px solid #2a2a2a;">Type</td>
                    <td style="color:#aaa;font-size:14px;padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;">${courtType === 'indoor' ? '🏠 Indoor' : '🌤️ Outdoor'}</td>
                  </tr>
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:10px 0;border-bottom:1px solid #2a2a2a;">Date</td>
                    <td style="color:#fff;font-size:14px;font-weight:600;padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:10px 0;border-bottom:1px solid #2a2a2a;">Time</td>
                    <td style="color:#f87171;font-size:16px;font-weight:800;padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;">${formattedStart} – ${formattedEnd}</td>
                  </tr>
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:10px 0;">Amount paid</td>
                    <td style="color:#fff;font-size:16px;font-weight:800;padding:10px 0;text-align:right;">₱${Number(totalPrice).toLocaleString('en-PH')}</td>
                  </tr>
                </table>
              </div>

              <a href="https://pickelhub.vercel.app/dashboard" style="display:block;background:#639922;color:#fff;text-align:center;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">
                View my bookings →
              </a>

              <p style="color:#333;font-size:12px;text-align:center;">
                We hope to see you on the court soon 🏓
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#111;border:1px solid #1e1e1e;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
              <p style="color:#333;font-size:11px;margin:0;">© ${new Date().getFullYear()} Picklverse · Booking cancellation</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await supabaseAdmin.from('email_logs').insert({
      type: 'booking_cancellation',
      reference_id: bookingId,
      recipients: [userEmail],
      subject,
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Booking cancellation email error:', err);
    return NextResponse.json({ error: 'Failed to send cancellation email' }, { status: 500 });
  }
}