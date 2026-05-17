'use client';

import React from 'react';
import type { Booking } from './types';
import { SHARED_STYLES, fmtDate, fmtTime } from './types';

type Props = { bookings: Booking[]; };

export default function BookingsTab({ bookings }: Props) {
  return (
    <div style={{ animation:'fadeUp .4s ease both' }}>
      <style>{SHARED_STYLES}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="section-title" style={{ marginBottom:0 }}>My bookings</div>
        <a href="/courts" className="add-btn">+ Book court</a>
      </div>

      <div className="section-card" style={{ marginBottom:0 }}>
        {bookings.length === 0
          ? <div className="empty-state">No bookings yet — <a href="/courts">book your first court!</a></div>
          : bookings.map((b, i) => (
            <div key={b.id} className="booking-row" style={{ animationDelay:`${i * 0.05}s` }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{b.courts?.name || 'Court'}</div>
                <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)', marginBottom:2 }}>
                  {b.courts?.type === 'indoor' ? 'Indoor' : 'Outdoor'} · {fmtDate(b.start_time)}
                </div>
                <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>
                  {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--accent)' }}>₱{b.total_price}</div>
                <span className={`status-badge status-${b.status}`}>{b.status}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}