'use client';

import React, { useState } from 'react';
import type { FoodOrder, ShopOrder } from './types';
import { SHARED_STYLES, fmtDate, fmtTime } from './types';

type Props = { foodOrders: FoodOrder[]; shopOrders: ShopOrder[]; };
type Tab = 'food' | 'shop';

export default function OrderHistoryTab({ foodOrders, shopOrders }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('food');

  const foodTotal = foodOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0);
  const shopTotal = shopOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_price || 0), 0);

  return (
    <div style={{ animation:'fadeUp .4s ease both' }}>
      <style>{SHARED_STYLES}{`
        .order-tab-btn{font-size:12px;padding:7px 18px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;transition:all .2s;}
        .order-tab-btn.active{background:var(--accent);color:#fff;border-color:var(--accent);}
        .order-row{padding:14px 0;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px;animation:fadeIn .3s ease both;}
        .order-row:last-child{border-bottom:none;}
        .order-items{display:flex;flex-wrap:wrap;gap:6px;}
        .order-item-tag{font-size:11px;padding:3px 9px;border-radius:20px;background:var(--bg-secondary);color:var(--text-secondary);font-family:'Barlow',sans-serif;}
        .status-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
        .status-pending{background:var(--warning-bg);color:var(--warning-text);}
        .status-confirmed{background:var(--success-bg);color:var(--success-text);}
        .status-preparing{background:rgba(56,138,221,.15);color:#85B7EB;}
        .status-ready{background:rgba(56,138,221,.15);color:#85B7EB;}
        .status-delivered,.status-completed{background:var(--success-bg);color:var(--success-text);}
        .status-cancelled{background:var(--error-bg);color:var(--error-text);}
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div className="section-title" style={{ marginBottom:0 }}>Order history</div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`order-tab-btn ${activeTab==='food'?'active':''}`} onClick={() => setActiveTab('food')}>
            🍱 Food ({foodOrders.length})
          </button>
          <button className={`order-tab-btn ${activeTab==='shop'?'active':''}`} onClick={() => setActiveTab('shop')}>
            🛍 Shop ({shopOrders.length})
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
        {[
          { label: activeTab==='food' ? 'Food orders' : 'Shop orders', value: activeTab==='food' ? foodOrders.length : shopOrders.length },
          { label: 'Total spent', value: `₱${(activeTab==='food' ? foodTotal : shopTotal).toLocaleString()}` },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* FOOD ORDERS */}
      {activeTab === 'food' && (
        <div className="section-card" style={{ marginBottom:0 }}>
          {foodOrders.length === 0
            ? <div className="empty-state">No food orders yet — <a href="/food">order some food!</a></div>
            : foodOrders.map((order, i) => (
              <div key={order.id} className="order-row" style={{ animationDelay:`${i * 0.04}s` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', marginBottom:4 }}>
                      {fmtDate(order.created_at)} · {fmtTime(order.created_at)} · <span style={{ textTransform:'capitalize' }}>{order.delivery_type || 'counter'}</span>
                    </div>
                    <div className="order-items">
                      {order.items?.map((item, j) => (
                        <span key={j} className="order-item-tag">{item.name} ×{item.qty}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--accent)' }}>₱{order.total_price?.toLocaleString()}</div>
                    <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* SHOP ORDERS */}
      {activeTab === 'shop' && (
        <div className="section-card" style={{ marginBottom:0 }}>
          {shopOrders.length === 0
            ? <div className="empty-state">No shop orders yet — <a href="/shop">visit the shop!</a></div>
            : shopOrders.map((order, i) => (
              <div key={order.id} className="order-row" style={{ animationDelay:`${i * 0.04}s` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>
                      {order.products?.name || 'Product'}
                    </div>
                    <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', marginBottom:4 }}>
                      {fmtDate(order.created_at)} · {fmtTime(order.created_at)}
                    </div>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--bg-secondary)', color:'var(--text-secondary)', fontFamily:"'Barlow',sans-serif", textTransform:'capitalize' }}>{order.type}</span>
                      <span style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>Qty: {order.quantity}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--accent)' }}>₱{order.total_price?.toLocaleString()}</div>
                    <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}