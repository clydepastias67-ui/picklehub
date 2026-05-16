'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Booking } from './types';

export default function BookingsTab({ toast }: { toast: (msg: string) => void }) {
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [loading, setLoading]           = useState(true);
  const [bookingSort, setBookingSort]   = useState<'start_time'|'created_at'>('start_time');
  const [bookingFilter, setBookingFilter] = useState('all');

  const supabase = createClient();

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*,courts(name)').in('status',['confirmed','pending','cancelled','checked-in']).order('start_time',{ascending:false});
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleBookingStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    await fetchBookings();
    toast(`Booking ${status}`);
  };

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
  const fmtTime = (d:string) => new Date(d).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});

  const sortedBookings = [...bookings]
    .filter(b => bookingFilter === 'all' || b.status === bookingFilter)
    .sort((a,b) => bookingSort === 'start_time'
      ? new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading bookings...</div>;

  return (
    <div>
      <style>{`
        .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
        .tbl{width:100%;border-collapse:collapse;}
        .tbl th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-secondary);white-space:nowrap;}
        .tbl td{font-size:13px;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle;font-family:'Barlow',sans-serif;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tr:hover td{background:var(--bg-hover);}
        .badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
        .badge-confirmed{background:var(--success-bg);color:var(--success-text);}
        .badge-pending{background:var(--warning-bg);color:var(--warning-text);}
        .badge-cancelled{background:var(--error-bg);color:var(--error-text);}
        .btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
        .btn:hover{border-color:var(--accent);color:var(--accent);}
        .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
        .btn.primary:hover{background:var(--accent-hover);}
        .btn.danger:hover{background:var(--error-bg);color:var(--error-text);border-color:var(--error-text);}
        .sort-btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;transition:all .2s;}
        .sort-btn.active{background:var(--accent-bg);color:var(--accent);border-color:var(--accent);}
        .actions{display:flex;gap:6px;flex-wrap:wrap;}
        .empty{text-align:center;padding:40px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
      `}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:800,textTransform:'uppercase'}}>Bookings</h1>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['all','pending','confirmed','cancelled'].map(f => (
            <button key={f} className={`sort-btn ${bookingFilter===f?'active':''}`} onClick={() => setBookingFilter(f)} style={{textTransform:'capitalize'}}>{f}</button>
          ))}
          <div style={{width:1,background:'var(--border)',margin:'0 4px'}}/>
          <button className={`sort-btn ${bookingSort==='start_time'?'active':''}`} onClick={() => setBookingSort('start_time')}>By date</button>
          <button className={`sort-btn ${bookingSort==='created_at'?'active':''}`} onClick={() => setBookingSort('created_at')}>By created</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Court</th><th>Booking date</th><th>Booked on</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {sortedBookings.length === 0
              ? <tr><td colSpan={6}><div className="empty">No bookings found</div></td></tr>
              : sortedBookings.map(b => (
                <tr key={b.id}>
                  <td style={{fontWeight:600}}>{b.courts?.name||'—'}</td>
                  <td>{fmtDate(b.start_time)} {fmtTime(b.start_time)}</td>
                  <td style={{color:'var(--text-muted)'}}>{fmtDate(b.created_at)}</td>
                  <td style={{color:'var(--accent)',fontWeight:700}}>₱{b.total_price?.toLocaleString()}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    <div className="actions">
                      {b.status==='pending' && <button className="btn primary" onClick={() => handleBookingStatus(b.id,'confirmed')}>Confirm</button>}
                      {b.status!=='cancelled' && <button className="btn danger" onClick={() => handleBookingStatus(b.id,'cancelled')}>Cancel</button>}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}