'use client';

import React from 'react';
import type { Booking } from './types';
import { SHARED_STYLES } from './types';

type Props = { bookings: Booking[]; onUpdate: (id: string, status: string) => void; };

export default function BookingsTab({ bookings, onUpdate }: Props) {
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });

  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <h1 className="section-title">Today's bookings</h1>
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Court</th><th>Time</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
            <tbody>
              {bookings.length === 0
                ? <tr><td colSpan={5}><div className="empty">No bookings today</div></td></tr>
                : bookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight:600 }}>{b.courts?.name || '—'}</td>
                    <td>{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td style={{ color:'var(--accent)', fontWeight:700 }}>₱{b.total_price?.toLocaleString()}</td>
                    <td>
                      <div className="actions">
                        {b.status === 'pending'    && <button className="btn primary" onClick={() => onUpdate(b.id, 'confirmed')}>Confirm</button>}
                        {b.status === 'confirmed'  && <button className="btn success" onClick={() => onUpdate(b.id, 'checked-in')}>Check in</button>}
                        {b.status !== 'cancelled' && b.status !== 'checked-in' && (
                          <button className="btn" style={{ borderColor:'var(--error-border)', color:'var(--error-text)' }} onClick={() => onUpdate(b.id, 'cancelled')}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}