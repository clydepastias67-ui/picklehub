'use client';

import React from 'react';
import type { FoodOrder } from './types';
import { SHARED_STYLES } from './types';

type Props = { foodOrders: FoodOrder[]; onUpdate: (id: string, status: string) => void; };

export default function FoodTab({ foodOrders, onUpdate }: Props) {
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });

  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <h1 className="section-title">Food orders</h1>
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Time</th><th>Items</th><th>Delivery</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
            <tbody>
              {foodOrders.length === 0
                ? <tr><td colSpan={6}><div className="empty">No food orders today</div></td></tr>
                : foodOrders.map(f => (
                  <tr key={f.id}>
                    <td>{fmtTime(f.created_at)}</td>
                    <td style={{ maxWidth:180 }}>
                      <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--text-secondary)', lineHeight:1.4 }}>
                        {f.items?.map(i => `${i.name} x${i.qty}`).join(', ') || '—'}
                      </div>
                    </td>
                    <td style={{ textTransform:'capitalize' }}>{f.delivery_type || 'counter'}</td>
                    <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                    <td style={{ color:'var(--accent)', fontWeight:700 }}>₱{f.total_price?.toLocaleString()}</td>
                    <td>
                      <div className="actions">
                        {(f.status === 'pending' || f.status === 'confirmed') && (
                          <button className="btn primary" onClick={() => onUpdate(f.id, 'preparing')}>Prepare</button>
                        )}
                        {f.status === 'preparing' && (
                          <button className="btn primary" onClick={() => onUpdate(f.id, 'ready')}>
                            {f.delivery_type === 'court' ? 'Ready to deliver' : 'Ready for pickup'}
                          </button>
                        )}
                        {f.status === 'ready' && f.delivery_type === 'court' && (
                          <button className="btn success" onClick={() => onUpdate(f.id, 'delivered')}>✓ Delivered</button>
                        )}
                        {f.status === 'ready' && f.delivery_type !== 'court' && (
                          <button className="btn success" onClick={() => onUpdate(f.id, 'delivered')}>✓ Picked up</button>
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