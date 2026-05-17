'use client';

import React from 'react';
import type { Court } from './types';
import { SHARED_STYLES } from './types';

type Props = { courts: Court[]; onToggle: (id: string, current: boolean) => void; };

export default function CourtsTab({ courts, onToggle }: Props) {
  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <h1 className="section-title">Court availability</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
        {courts.length === 0
          ? <div className="empty">No courts found</div>
          : courts.map((court, i) => (
            <div key={court.id} style={{ background:'var(--card-bg)', border:`1px solid ${court.is_available ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius:12, padding:18, animation:`fadeUp .4s ${i * 0.06}s ease both` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{court.name}</div>
                  <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--text-muted)', textTransform:'capitalize', marginTop:2 }}>{court.type}</div>
                </div>
                <span style={{ fontSize:10, padding:'3px 9px', borderRadius:20, fontWeight:700, textTransform:'uppercase', background: court.is_available ? 'var(--success-bg)' : 'var(--error-bg)', color: court.is_available ? 'var(--success-text)' : 'var(--error-text)' }}>
                  {court.is_available ? 'Open' : 'Closed'}
                </span>
              </div>
              <button className={`toggle ${court.is_available ? 'on' : 'off'}`} onClick={() => onToggle(court.id, court.is_available)} aria-label="Toggle court availability">
                <div className="toggle-dot" />
              </button>
              <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
                {court.is_available ? 'Tap to close court' : 'Tap to open court'}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}