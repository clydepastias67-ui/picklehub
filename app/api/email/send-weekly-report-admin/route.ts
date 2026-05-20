import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString();
    const weekEndStr = weekEnd.toISOString();

    const [
      { data: bookings },
      { data: foodOrders },
      { data: shopOrders },
      { data: coachingSessions },
      { data: tournaments },
      { data: lowStockProducts },
      { data: admins },
    ] = await Promise.all([
      supabaseAdmin.from('bookings').select('*, courts(name)').gte('created_at', weekStartStr).lte('created_at', weekEndStr),
      supabaseAdmin.from('food_orders').select('*').gte('created_at', weekStartStr).lte('created_at', weekEndStr),
      supabaseAdmin.from('shop_orders').select('*, products(name)').gte('created_at', weekStartStr).lte('created_at', weekEndStr),
      supabaseAdmin.from('coaching_sessions').select('*').gte('created_at', weekStartStr).lte('created_at', weekEndStr),
      supabaseAdmin.from('tournament_registrations').select('*').gte('created_at', weekStartStr).lte('created_at', weekEndStr),
      supabaseAdmin.from('products').select('name, stock, low_stock_threshold').lte('stock', 10),
      supabaseAdmin.from('admins').select('email'),
    ]);

    if (!admins || admins.length === 0) {
      return NextResponse.json({ error: 'No admins found' }, { status: 404 });
    }

    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
    const courtRevenue = confirmedBookings.reduce((s, b) => s + (b.total_price || 0), 0);
    const foodRevenue = foodOrders?.filter(f => f.status !== 'cancelled').reduce((s, f) => s + (f.total_price || 0), 0) || 0;
    const shopRevenue = shopOrders?.filter(s => s.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0) || 0;
    const coachRevenue = coachingSessions?.filter(c => c.status === 'confirmed' || c.status === 'completed').reduce((s, c) => s + (c.price || 0), 0) || 0;
    const totalRevenue = courtRevenue + foodRevenue + shopRevenue + coachRevenue;

    const courtCounts: Record<string, number> = {};
    confirmedBookings.forEach(b => {
      const name = b.courts?.name || 'Unknown';
      courtCounts[name] = (courtCounts[name] || 0) + 1;
    });
    const topCourts = Object.entries(courtCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const fmtDate = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    const weekLabel = `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`;
    const adminEmails = admins.map(a => a.email);
    const subject = `📊 Picklverse Weekly Report — ${weekLabel}`;

    const statRow = (label: string, value: string, color = '#aaa') => `
      <tr>
        <td style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;padding:10px 0;border-bottom:1px solid #222;">${label}</td>
        <td style="color:${color};font-size:16px;font-weight:800;padding:10px 0;border-bottom:1px solid #222;text-align:right;">${value}</td>
      </tr>`;

    await resend.emails.send({
      from: 'Picklverse <onboarding@resend.dev>',
      to: adminEmails,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',sans-serif;">
          <div style="max-width:600px;margin:40px auto;padding:0 16px;">
            <div style="background:#161616;border:1px solid #1e1e1e;border-radius:12px 12px 0 0;padding:28px 32px;">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <div style="width:8px;height:8px;background:#639922;border-radius:50%;display:inline-block;"></div>
                    <span style="color:#fff;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">Picklverse</span>
                  </div>
                  <div style="color:#639922;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Weekly Report</div>
                </div>
                <div style="text-align:right;">
                  <div style="color:#aaa;font-size:13px;">${weekLabel}</div>
                  <div style="color:#333;font-size:11px;margin-top:2px;">${new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
            <div style="background:linear-gradient(135deg,#1a2a0a,#111);border:1px solid #639922;border-top:none;padding:28px 32px;text-align:center;">
              <div style="color:#639922;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Total weekly revenue</div>
              <div style="color:#fff;font-size:48px;font-weight:800;line-height:1;">₱${totalRevenue.toLocaleString()}</div>
            </div>
            <div style="background:#161616;border:1px solid #1e1e1e;border-top:none;padding:28px 32px;">
              <div style="color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:16px;">Revenue breakdown</div>
              <table style="width:100%;border-collapse:collapse;">
                ${statRow('Court bookings', `₱${courtRevenue.toLocaleString()}`, '#639922')}
                ${statRow('Food & drinks', `₱${foodRevenue.toLocaleString()}`, '#639922')}
                ${statRow('Shop & rentals', `₱${shopRevenue.toLocaleString()}`, '#639922')}
                ${statRow('Coaching sessions', `₱${coachRevenue.toLocaleString()}`, '#639922')}
              </table>
            </div>
            <div style="background:#161616;border:1px solid #1e1e1e;border-top:none;padding:28px 32px;">
              <div style="color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:16px;">Activity this week</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
                ${[
                  { label: 'Bookings', val: bookings?.length || 0, confirmed: confirmedBookings.length },
                  { label: 'Food orders', val: foodOrders?.length || 0, confirmed: foodOrders?.filter(f => f.status !== 'cancelled').length || 0 },
                  { label: 'Shop orders', val: shopOrders?.length || 0, confirmed: shopOrders?.filter(s => s.status !== 'cancelled').length || 0 },
                  { label: 'Coach sessions', val: coachingSessions?.length || 0, confirmed: coachingSessions?.filter(c => c.status === 'completed').length || 0 },
                  { label: 'Tournament reg.', val: tournaments?.length || 0, confirmed: tournaments?.length || 0 },
                ].map(s => `
                  <div style="background:#1e1e1e;border-radius:8px;padding:14px 10px;">
                    <div style="color:#555;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${s.label}</div>
                    <div style="color:#fff;font-size:24px;font-weight:800;line-height:1;">${s.val}</div>
                    <div style="color:#639922;font-size:10px;margin-top:4px;">${s.confirmed} confirmed</div>
                  </div>
                `).join('')}
              </div>
            </div>
            ${topCourts.length > 0 ? `
            <div style="background:#161616;border:1px solid #1e1e1e;border-top:none;padding:28px 32px;">
              <div style="color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:16px;">Most booked courts</div>
              ${topCourts.map(([name, count], i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #1e1e1e;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:24px;height:24px;background:#1e1e1e;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#639922;font-size:12px;font-weight:700;">${i + 1}</div>
                    <span style="color:#fff;font-size:14px;font-weight:600;">${name}</span>
                  </div>
                  <span style="color:#639922;font-size:14px;font-weight:700;">${count} booking${count > 1 ? 's' : ''}</span>
                </div>
              `).join('')}
            </div>` : ''}
            ${lowStockProducts && lowStockProducts.length > 0 ? `
            <div style="background:#161616;border:1px solid rgba(226,75,74,0.3);border-top:none;padding:28px 32px;">
              <div style="color:#f09595;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:16px;">⚠️ Low stock items</div>
              ${lowStockProducts.map(p => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #222;">
                  <span style="color:#aaa;font-size:13px;">${p.name}</span>
                  <span style="color:${(p.stock || 0) <= (p.low_stock_threshold || 5) ? '#f09595' : '#EF9F27'};font-size:13px;font-weight:700;">${p.stock} left</span>
                </div>
              `).join('')}
            </div>` : ''}
            <div style="background:#161616;border:1px solid #1e1e1e;border-top:none;padding:24px 32px;text-align:center;">
              <a href="https://pickelhub.vercel.app/admin" style="display:inline-block;background:#639922;color:#fff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:0.06em;">
                View full dashboard →
              </a>
            </div>
            <div style="background:#111;border:1px solid #1e1e1e;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
              <p style="color:#333;font-size:11px;margin:0;">© ${new Date().getFullYear()} Picklverse · Weekly automated report · Every Sunday evening</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    await supabaseAdmin.from('email_logs').insert({
      type: 'weekly_report',
      reference_id: weekLabel,
      recipients: adminEmails,
      subject,
    });

    return NextResponse.json({ success: true, sent_to: adminEmails.length, revenue: totalRevenue });

  } catch (err) {
    console.error('Weekly report error:', err);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}