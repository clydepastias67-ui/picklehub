'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Booking, Court, Coach, MenuItem, Product, Tournament } from './types';

const SHARED_STYLES = `
  .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;animation:fadeUp .4s ease both;}
  .stat-label{font-size:11px;font-family:'Barlow',sans-serif;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;}
  .stat-val{font-size:30px;font-weight:800;line-height:1;}
  .stat-sub{font-size:12px;font-family:'Barlow',sans-serif;color:var(--text-muted);margin-top:4px;}
  .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;animation:fadeUp .4s ease both;}
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
`;

export default function OverviewTab({ toast }: { toast: (msg: string) => void }) {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [courts, setCourts]         = useState<Court[]>([]);
  const [coaches, setCoaches]       = useState<Coach[]>([]);
  const [menuItems, setMenuItems]   = useState<MenuItem[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]       = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const [{ data:b },{ data:c },{ data:co },{ data:m },{ data:p },{ data:t }] = await Promise.all([
        supabase.from('bookings').select('*,courts(name)').in('status',['confirmed','pending']).order('start_time',{ascending:false}),
        supabase.from('courts').select('*'),
        supabase.from('coaches').select('*'),
        supabase.from('menu_items').select('*'),
        supabase.from('products').select('*'),
        supabase.from('tournaments').select('*'),
      ]);
      setBookings(b||[]); setCourts(c||[]); setCoaches(co||[]);
      setMenuItems(m||[]); setProducts(p||[]); setTournaments(t||[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
  const fmtTime = (d:string) => new Date(d).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});
  const totalRevenue = bookings.filter(b=>b.status==='confirmed').reduce((s,b)=>s+(b.total_price||0),0);

  const lowStock = [
    ...products.filter(p => p.stock === 0).map(p => ({ name:p.name, stock:p.stock, out:true })),
    ...products.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold ?? 5)).map(p => ({ name:p.name, stock:p.stock, out:false })),
    ...menuItems.filter(m => (m.stock ?? 99) === 0).map(m => ({ name:m.name, stock:0, out:true })),
  ];

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading overview...</div>;

  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:'var(--accent)',letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:"'Barlow',sans-serif",marginBottom:4}}>{new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}</div>
          <h1 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,textTransform:'uppercase',lineHeight:1}}>Dashboard <span style={{color:'var(--accent)'}}>overview</span></h1>
        </div>
      </div>

      {/* LOW STOCK BANNER */}
      {lowStock.length > 0 && (
        <div style={{background:'var(--warning-bg)',border:'1px solid var(--warning-text)',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',gap:12,alignItems:'flex-start'}}>
          <span style={{fontSize:20,flexShrink:0}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,color:'var(--warning-text)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:4}}>Stock alert — {lowStock.length} item{lowStock.length>1?'s':''} need attention</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {lowStock.map((item,i) => (
                <span key={i} style={{fontSize:11,fontFamily:"'Barlow',sans-serif",background:'rgba(0,0,0,.15)',padding:'2px 8px',borderRadius:20,color:'var(--warning-text)'}}>
                  {item.name} — {item.out ? 'OUT OF STOCK' : `${item.stock} left`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REPORT */}
      <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase'}}>Weekly report email</div>
          <div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:'var(--text-muted)',marginTop:2}}>Auto-sent every Sunday 7PM · or trigger manually</div>
        </div>
        <button className="btn primary" onClick={async () => {
          try {
            const res = await fetch('/api/email/weekly-report',{method:'POST',headers:{'Content-Type':'application/json','x-cron-secret':process.env.NEXT_PUBLIC_CRON_SECRET||''}});
            const d = await res.json();
            toast(d.success ? `✅ Report sent to ${d.sent_to} admin${d.sent_to>1?'s':''}!` : `❌ ${d.error||'Failed'}`);
          } catch { toast('❌ Failed to send report'); }
        }}>Send now</button>
      </div>

      {/* STAT CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:12,marginBottom:24}}>
        {[
          {label:'Total revenue',   val:`₱${totalRevenue.toLocaleString()}`,                           sub:'Confirmed only'},
          {label:'Total bookings',  val:bookings.filter(b=>b.status==='confirmed').length,               sub:'confirmed bookings'},
          {label:'Pending',         val:bookings.filter(b=>b.status==='pending').length,                 sub:'Awaiting action'},
          {label:'Courts',          val:courts.length,                                                   sub:`${courts.filter(c=>c.is_available).length} available`},
          {label:'Coaches',         val:coaches.filter(c=>c.is_available).length,                        sub:'available now'},
          {label:'Tournaments',     val:tournaments.filter(t=>t.status==='open').length,                 sub:'open for registration'},
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{animationDelay:`${i*0.07}s`}}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* RECENT BOOKINGS TABLE */}
      <div className="table-wrap">
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:15,fontWeight:700,textTransform:'uppercase'}}>Recent confirmed bookings</div>
        </div>
        <table className="tbl">
          <thead><tr><th>Court</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {bookings.filter(b=>b.status==='confirmed').slice(0,8).map(b => (
              <tr key={b.id}>
                <td style={{fontWeight:600}}>{b.courts?.name||'—'}</td>
                <td>{fmtDate(b.start_time)} {fmtTime(b.start_time)}</td>
                <td style={{color:'var(--accent)',fontWeight:700}}>₱{b.total_price?.toLocaleString()}</td>
                <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}