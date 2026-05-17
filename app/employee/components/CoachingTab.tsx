'use client';

import React from 'react';
import type { CoachingSession } from './types';
import { SHARED_STYLES } from './types';

type Props = { sessions: CoachingSession[]; onUpdate: (id: string, status: string) => void; };

export default function CoachingTab({ sessions, onUpdate }: Props) {
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });

  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <h1 className="section-title">Today's coaching sessions</h1>
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Time</th><th>Coach</th><th>Status</th><th>Price</th><th>Actions</th></tr></thead>
            <tbody>
              {sessions.length === 0
                ? <tr><td colSpan={5}><div className="empty">No coaching sessions today</div></td></tr>
                : sessions.map(s => (
                  <tr key={s.id}>
                    <td>{fmtTime(s.session_time)}</td>
                    <td style={{ fontWeight:600 }}>{s.coaches?.name || '—'}</td>
                    <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    <td style={{ color:'var(--accent)', fontWeight:700 }}>₱{s.price?.toLocaleString()}</td>
                    <td>
                      <div className="actions">
                        {s.status === 'pending'   && <button className="btn primary" onClick={() => onUpdate(s.id, 'confirmed')}>Confirm</button>}
                        {s.status === 'confirmed' && <button className="btn success" onClick={() => onUpdate(s.id, 'completed')}>Complete</button>}
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