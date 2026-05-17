'use client';

import React from 'react';
import type { ShopOrder } from './types';
import { SHARED_STYLES } from './types';

type Props = { shopOrders: ShopOrder[]; onUpdate: (id: string, status: string) => void; };

export default function ShopTab({ shopOrders, onUpdate }: Props) {
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });

  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <h1 className="section-title">Shop orders</h1>
      <div className="table-wrap">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Time</th><th>Product</th><th>Type</th><th>Qty</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
            <tbody>
              {shopOrders.length === 0
                ? <tr><td colSpan={7}><div className="empty">No shop orders today</div></td></tr>
                : shopOrders.map(o => (
                  <tr key={o.id}>
                    <td>{fmtTime(o.created_at)}</td>
                    <td style={{ fontWeight:600 }}>{o.products?.name || '—'}</td>
                    <td style={{ textTransform:'capitalize' }}>{o.type}</td>
                    <td>{o.quantity}</td>
                    <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                    <td style={{ color:'var(--accent)', fontWeight:700 }}>₱{o.total_price?.toLocaleString()}</td>
                    <td>
                      <div className="actions">
                        {(o.status === 'pending' || o.status === 'confirmed') && (
                          <button className="btn primary" onClick={() => onUpdate(o.id, 'preparing')}>Prepare</button>
                        )}
                        {o.status === 'preparing' && (
                          <button className="btn primary" onClick={() => onUpdate(o.id, 'ready')}>
                            {o.type === 'rental' ? 'Ready to rent' : 'Ready for pickup'}
                          </button>
                        )}
                        {o.status === 'ready' && (
                          <button className="btn success" onClick={() => onUpdate(o.id, 'completed')}>
                            ✓ {o.type === 'rental' ? 'Rented out' : 'Picked up'}
                          </button>
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