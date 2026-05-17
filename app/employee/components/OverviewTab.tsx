'use client';

import React from 'react';
import type { Booking, FoodOrder, ShopOrder, CoachingSession, Court } from './types';
import { SHARED_STYLES } from './types';

type Props = {
  bookings: Booking[];
  foodOrders: FoodOrder[];
  shopOrders: ShopOrder[];
  sessions: CoachingSession[];
  courts: Court[];
  setActiveTab: (tab: string) => void;
};

export default function OverviewTab({ bookings, foodOrders, shopOrders, sessions, courts, setActiveTab }: Props) {
  const todayRevenue =
    bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.total_price || 0), 0) +
    foodOrders.filter(f => ['confirmed','delivered'].includes(f.status)).reduce((s, f) => s + (f.total_price || 0), 0) +
    shopOrders.filter(o => ['confirmed','completed'].includes(o.status)).reduce((s, o) => s + (o.total_price || 0), 0);

  const pendingBookings  = bookings.filter(b => b.status === 'pending').length;
  const pendingFood      = foodOrders.filter(f => f.status === 'pending').length;
  const pendingShop      = shopOrders.filter(s => s.status === 'pending').length;
  const allClear         = pendingBookings === 0 && pendingFood === 0 && pendingShop === 0;

  const stats = [
    { label:"Today's revenue", val:`₱${todayRevenue.toLocaleString()}`, sub:'Confirmed only' },
    { label:'Bookings',        val:bookings.filter(b => b.status === 'confirmed').length, sub:'confirmed today' },
    { label:'Food orders',     val:foodOrders.filter(f => ['confirmed','delivered','ready','preparing'].includes(f.status)).length, sub:`${pendingFood} pending` },
    { label:'Shop orders',     val:shopOrders.filter(o => ['confirmed','completed','ready','preparing'].includes(o.status)).length, sub:`${pendingShop} pending` },
    { label:'Sessions',        val:sessions.filter(s => ['confirmed','completed'].includes(s.status)).length, sub:`${sessions.filter(s => s.status === 'pending').length} pending` },
    { label:'Courts open',     val:courts.filter(c => c.is_available).length, sub:`of ${courts.length} total` },
  ];

  return (
    <div>
      <style>{SHARED_STYLES}</style>

      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif", marginBottom:4 }}>
          {new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
        </div>
        <h1 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:800, textTransform:'uppercase' }}>
          Today's <span style={{ color:'var(--accent)' }}>summary</span>
        </h1>
      </div>

      {/* STAT CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay:`${i * 0.06}s` }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val">{s.val}</div>
            <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* PENDING ACTIONS */}
      <div className="table-wrap">
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:15, fontWeight:700, textTransform:'uppercase' }}>
          Pending actions
        </div>
        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          {pendingBookings > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--warning-bg)', borderRadius:8, border:'1px solid var(--warning-text)' }}>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--warning-text)' }}>
                {pendingBookings} booking{pendingBookings > 1 ? 's' : ''} need confirmation
              </span>
              <button className="btn primary" onClick={() => setActiveTab('bookings')}>View</button>
            </div>
          )}
          {pendingFood > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--warning-bg)', borderRadius:8, border:'1px solid var(--warning-text)' }}>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--warning-text)' }}>
                {pendingFood} food order{pendingFood > 1 ? 's' : ''} to prepare
              </span>
              <button className="btn primary" onClick={() => setActiveTab('food')}>View</button>
            </div>
          )}
          {pendingShop > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--warning-bg)', borderRadius:8, border:'1px solid var(--warning-text)' }}>
              <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--warning-text)' }}>
                {pendingShop} shop order{pendingShop > 1 ? 's' : ''} to prepare
              </span>
              <button className="btn primary" onClick={() => setActiveTab('shop')}>View</button>
            </div>
          )}
          {allClear && (
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--success-text)', textAlign:'center', padding:'16px 0' }}>
              ✓ All caught up! No pending actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}