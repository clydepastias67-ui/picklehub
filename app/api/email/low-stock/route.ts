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
    const { productId, productName, currentStock, threshold } = await req.json();

    // Check if we already sent a low stock alert for this product recently (within 24hrs)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLog } = await supabaseAdmin
      .from('email_logs')
      .select('id')
      .eq('type', 'low_stock')
      .eq('reference_id', productId)
      .gte('sent_at', yesterday)
      .single();

    if (recentLog) {
      return NextResponse.json({ message: 'Alert already sent recently' });
    }

    // Get all admin emails
    const { data: admins } = await supabaseAdmin
      .from('admins')
      .select('email');

    if (!admins || admins.length === 0) {
      return NextResponse.json({ error: 'No admins found' }, { status: 404 });
    }

    const adminEmails = admins.map(a => a.email);
    const subject = `⚠️ Low stock alert: ${productName}`;

    // Send email to all admins
    await resend.emails.send({
      from: 'Picklverse <onboarding@resend.dev>',
      to: adminEmails,
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
              <div style="color:#639922;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Stock Alert</div>
            </div>

            <!-- Alert body -->
            <div style="background:#161616;border:1px solid #1e1e1e;border-top:none;padding:32px;">
              <div style="background:rgba(226,75,74,0.1);border:1px solid rgba(226,75,74,0.3);border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
                <div style="font-size:32px;margin-bottom:8px;">⚠️</div>
                <div style="color:#f09595;font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;">Low stock warning</div>
              </div>

              <p style="color:#aaa;font-size:15px;line-height:1.6;margin-bottom:24px;">
                The following product has fallen below its stock threshold and may need to be restocked soon.
              </p>

              <div style="background:#1e1e1e;border-radius:10px;padding:20px;margin-bottom:24px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:8px 0;border-bottom:1px solid #222;">Product</td>
                    <td style="color:#fff;font-size:14px;font-weight:700;padding:8px 0;border-bottom:1px solid #222;text-align:right;">${productName}</td>
                  </tr>
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:8px 0;border-bottom:1px solid #222;">Current stock</td>
                    <td style="color:#f09595;font-size:20px;font-weight:800;padding:8px 0;border-bottom:1px solid #222;text-align:right;">${currentStock} left</td>
                  </tr>
                  <tr>
                    <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:8px 0;">Alert threshold</td>
                    <td style="color:#aaa;font-size:14px;padding:8px 0;text-align:right;">${threshold} or fewer</td>
                  </tr>
                </table>
              </div>

              <a href="https://pickelhub.vercel.app/admin" style="display:block;background:#639922;color:#fff;text-align:center;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">
                Update stock in admin panel →
              </a>

              <p style="color:#333;font-size:12px;text-align:center;">
                You are receiving this because you are an admin of Picklverse.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#111;border:1px solid #1e1e1e;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
              <p style="color:#333;font-size:11px;margin:0;">© ${new Date().getFullYear()} Picklverse · Automated alert</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Log the email
    await supabaseAdmin.from('email_logs').insert({
      type: 'low_stock',
      reference_id: productId,
      recipients: adminEmails,
      subject,
    });

    return NextResponse.json({ success: true, sent_to: adminEmails.length });

  } catch (err) {
    console.error('Low stock email error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}