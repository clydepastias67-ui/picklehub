'use client';

import React from 'react';
import type { CoachingSession } from './types';
import { SHARED_STYLES, fmtDate, fmtTime } from './types';

type Props = { sessions: CoachingSession[]; };

export default function CoachingTab({ sessions }: Props) {
  return (
    <div style={{ animation:'fadeUp .4s ease both' }}>
      <style>{SHARED_STYLES}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="section-title" style={{ marginBottom:0 }}>Coaching sessions</div>
        <a href="/coaching" className="add-btn">+ Book session</a>
      </div>

      <div className="section-card" style={{ marginBottom:0 }}>
        {sessions.length === 0
          ? <div className="empty-state">No sessions booked yet — <a href="/coaching">find a coach!</a></div>
          : sessions.map((s, i) => (
            <div key={s.id} className="booking-row" style={{ animationDelay:`${i * 0.05}s` }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{s.coaches?.name || 'Coach'}</div>
                <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)', marginBottom:2 }}>
                  {s.coaches?.skill_level} level · {fmtDate(s.session_time)}
                </div>
                <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>
                  {fmtTime(s.session_time)}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'var(--accent)' }}>₱{s.price}</div>
                <span className={`status-badge status-${s.status}`}>{s.status}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}