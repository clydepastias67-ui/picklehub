'use client';

import React from 'react';
import type { Booking, CoachingSession, FoodOrder, ShopOrder } from './types';
import { SHARED_STYLES, fmtDate, fmtTime } from './types';

type Props = {
  bookings: Booking[];
  sessions: CoachingSession[];
  foodOrders: FoodOrder[];
  shopOrders: ShopOrder[];
  setActiveTab: (tab: string) => void;
};

export default function OverviewTab({ bookings, sessions, foodOrders, shopOrders, setActiveTab }: Props) {
  const totalSpent       = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.total_price || 0), 0)
                         + foodOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0)
                         + shopOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0);
  const confirmedCount   = bookings.filter(b => b.status === 'confirmed').length;
  const upcomingCount    = bookings.filter(b => b.status === 'confirmed' && new Date(b.start_time) > new Date()).length;

  const stats = [
    { label:'Total bookings',  value: confirmedCount },
    { label:'Upcoming',        value: upcomingCount },
    { label:'Food orders',     value: foodOrders.filter(o => o.status !== 'cancelled').length },
    { label:'Total spent',     value: `₱${totalSpent.toLocaleString()}` },
  ];

  return (
    <div>
      <style>{SHARED_STYLES}</style>

      {/* STAT CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12, marginBottom:32 }}>
        {stats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ animationDelay:`${i * 0.08}s` }}>
            <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>{stat.label}</div>
            <div style={{ fontSize:32, fontWeight:800, lineHeight:1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* RECENT BOOKINGS */}
      <div className="section-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div className="section-title" style={{ marginBottom:0 }}>Recent bookings</div>
          <button className="view-all-btn" onClick={() => setActiveTab('bookings')}>View all</button>
        </div>
        {bookings.length === 0
          ? <div className="empty-state">No bookings yet — <a href="/courts">book a court</a> to get started!</div>
          : bookings.slice(0, 4).map((b, i) => (
            <div key={b.id} className="booking-row" style={{ animationDelay:`${i * 0.06}s` }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{b.courts?.name || 'Court'}</div>
                <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{fmtDate(b.start_time)} · {fmtTime(b.start_time)} – {fmtTime(b.end_time)}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>₱{b.total_price}</div>
                <span className={`status-badge status-${b.status}`}>{b.status}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* RECENT COACHING */}
      <div className="section-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div className="section-title" style={{ marginBottom:0 }}>Coaching sessions</div>
          <button className="view-all-btn" onClick={() => setActiveTab('coaching')}>View all</button>
        </div>
        {sessions.length === 0
          ? <div className="empty-state">No sessions booked — <a href="/coaching">find a coach</a>!</div>
          : sessions.slice(0, 3).map((s, i) => (
            <div key={s.id} className="booking-row" style={{ animationDelay:`${i * 0.06}s` }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{s.coaches?.name || 'Coach'}</div>
                <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{s.coaches?.skill_level} · {fmtDate(s.session_time)}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>₱{s.price}</div>
                <span className={`status-badge status-${s.status}`}>{s.status}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}