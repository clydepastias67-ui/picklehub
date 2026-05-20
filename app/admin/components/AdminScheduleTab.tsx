'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type Court = { id:string; name:string; type:string; };
type BookingSlot = { court_id:string; date:string; hours:number[]; };
type BlockedSlot = { id:string; court_id:string; date:string; hour:number; reason?:string; };

const HOURS = Array.from({length:14},(_,i) => ({ label:`${i+6>12?i+6-12:i+6}${i+6>=12?'pm':'am'}`, hour:i+6 }));
const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const COURT_COLORS = ['#639922','#185FA5','#BA7517','#8B3AC7','#C73A3A'];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const sun = new Date(today);
  sun.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({length:7},(_,i) => { const d = new Date(sun); d.setDate(sun.getDate()+i); return d; });
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }

export default function AdminScheduleTab({ toast }: { toast:(msg:string)=>void }) {
  const [courts, setCourts]         = useState<Court[]>([]);
  const [bookings, setBookings]     = useState<BookingSlot[]>([]);
  const [blocked, setBlocked]       = useState<BlockedSlot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Block modal
  const [blockModal, setBlockModal] = useState<{ date:string; hour:number } | null>(null);
  const [blockCourts, setBlockCourts] = useState<string[]>([]);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking]     = useState(false);

  // Detail panel
  const [detail, setDetail] = useState<{ date:string; hour:number } | null>(null);

  const supabase = createClient();

  const fetchWeekData = useCallback(async (offset: number) => {
    const dates = getWeekDates(offset);
    const start = toDateStr(dates[0]);
    const end   = toDateStr(dates[6]);

    const [{ data:c },{ data:b },{ data:bl }] = await Promise.all([
      supabase.from('courts').select('id,name,type').order('name'),
      supabase.from('bookings').select('court_id,start_time,end_time').gte('start_time',`${start}T00:00:00`).lte('start_time',`${end}T23:59:59`).neq('status','cancelled'),
      supabase.from('blocked_slots').select('*').gte('date',start).lte('date',end),
    ]);

    setCourts(c||[]);

    const slots: BookingSlot[] = [];
    b?.forEach(bk => {
      const s = new Date(bk.start_time);
      const e = new Date(bk.end_time);
      const date = toDateStr(s);
      const existing = slots.find(sl => sl.court_id === bk.court_id && sl.date === date);
      const hours: number[] = [];
      for (let h = s.getHours(); h < e.getHours(); h++) hours.push(h);
      if (existing) existing.hours.push(...hours);
      else slots.push({ court_id:bk.court_id, date, hours });
    });
    setBookings(slots);
    setBlocked(bl||[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWeekData(weekOffset);
    const channel = supabase.channel(`admin-schedule-${weekOffset}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'bookings' }, () => fetchWeekData(weekOffset))
      .on('postgres_changes', { event:'*', schema:'public', table:'blocked_slots' }, () => fetchWeekData(weekOffset))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [weekOffset]);

  const handleBlock = async () => {
    if (blockCourts.length === 0 || !blockModal) return;
    setBlocking(true);
    const rows = blockCourts.map(cid => ({
      court_id:cid, date:blockModal.date, hour:blockModal.hour, reason:blockReason||null,
    }));
    const { error } = await supabase.from('blocked_slots').insert(rows);
    if (error) toast('❌ Failed to block slot');
    else { toast('Slot blocked!'); fetchWeekData(weekOffset); }
    setBlockModal(null); setBlockCourts([]); setBlockReason(''); setBlocking(false);
  };

  const handleUnblock = async (id: string) => {
    await supabase.from('blocked_slots').delete().eq('id', id);
    toast('Slot unblocked!');
    fetchWeekData(weekOffset);
  };

  const weekDates = getWeekDates(weekOffset);
  const fmtWeek   = (d: Date) => d.toLocaleDateString('en-PH', { month:'short', day:'numeric' });

  const totalSlots   = HOURS.length * 7 * courts.length;
  const totalBooked  = bookings.reduce((s,b) => s + b.hours.length, 0);
  const totalBlocked = blocked.length;
  const utilization  = totalSlots > 0 ? Math.round((totalBooked / totalSlots) * 100) : 0;

  if (loading) return <div style={{ padding:40, textAlign:'center', fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>Loading schedule...</div>;

  return (
    <div>
      <style>{`
        .cal-cell{height:22px;border-radius:3px;cursor:pointer;transition:opacity .15s;overflow:hidden;display:flex;}
        .cal-cell:hover{opacity:.75;}
        .cal-seg{flex:1;}
        .block-check{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;}
        .unblock-btn{font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--error-text);background:transparent;color:var(--error-text);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;transition:all .2s;}
        .unblock-btn:hover{background:var(--error-bg);}
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:800, textTransform:'uppercase' }}>Court schedule</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setWeekOffset(w => w-1)} style={{ width:30, height:30, borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:16 }}>‹</button>
          <span style={{ fontSize:13, fontWeight:600, minWidth:150, textAlign:'center' }}>{fmtWeek(weekDates[0])} – {fmtWeek(weekDates[6])}</span>
          <button onClick={() => setWeekOffset(w => w+1)} style={{ width:30, height:30, borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:16 }}>›</button>
        </div>
      </div>

      {/* LEGEND */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif" }}>Courts:</span>
        {courts.map((c,i) => (
          <span key={c.id} style={{ fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)' }}>
            <span style={{ width:10, height:10, borderRadius:2, background:COURT_COLORS[i % COURT_COLORS.length], display:'inline-block' }}/>{c.name}
          </span>
        ))}
        <span style={{ fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)' }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'rgba(226,75,74,.5)', display:'inline-block' }}/>Blocked
        </span>
        <span style={{ fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)' }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'var(--bg-secondary)', border:'0.5px solid var(--border)', display:'inline-block' }}/>Available
        </span>
      </div>

      {/* CALENDAR GRID */}
      <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:20, overflowX:'auto' }}>
        <div style={{ minWidth:500 }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,minmax(0,1fr))', gap:3, marginBottom:6 }}>
            <div/>
            {weekDates.map((d,di) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={di} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'var(--text-hint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{DAYS[di]}</div>
                  <div style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?'var(--accent)':'var(--text-secondary)', marginTop:2 }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {HOURS.map(({ label, hour }) => (
            <div key={hour} style={{ display:'grid', gridTemplateColumns:'52px repeat(7,minmax(0,1fr))', gap:3, marginBottom:3 }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'right', paddingRight:6, paddingTop:5 }}>{label}</div>
              {weekDates.map((d, di) => {
                const dateStr      = toDateStr(d);
                const blockedSlots = blocked.filter(bl => bl.date === dateStr && bl.hour === hour);
                const isAllBlocked = blockedSlots.length >= courts.length && courts.length > 0;

                const courtSegs = courts.map((c, ci) => {
                  const isBooked  = bookings.some(b => b.court_id === c.id && b.date === dateStr && b.hours.includes(hour));
                  const isBlocked = blockedSlots.some(bl => bl.court_id === c.id);
                  return { color: isBlocked ? 'rgba(226,75,74,.5)' : isBooked ? COURT_COLORS[ci % COURT_COLORS.length] : null };
                });

                const hasActivity = courtSegs.some(s => s.color !== null);

                return (
                  <div key={di} className="cal-cell" style={{ background: hasActivity ? 'transparent' : 'var(--bg-secondary)', border:`0.5px solid ${hasActivity?'transparent':'var(--border)'}` }}
                    onClick={() => setDetail(detail?.date === dateStr && detail?.hour === hour ? null : { date:dateStr, hour })}
                    title={`${label} — ${d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})}`}
                  >
                    {courts.map((c, ci) => {
                      const seg = courtSegs[ci];
                      return seg.color ? <div key={c.id} className="cal-seg" style={{ background:seg.color }} /> : <div key={c.id} className="cal-seg" style={{ background:'var(--bg-secondary)' }} />;
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* DETAIL PANEL */}
      {detail && (
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:20, animation:'fadeUp .3s ease both' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700 }}>
                {HOURS.find(h => h.hour === detail.hour)?.label} — {new Date(detail.date+'T00:00:00').toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setBlockModal(detail)} style={{ fontSize:12, padding:'6px 14px', borderRadius:6, background:'rgba(226,75,74,.12)', border:'1px solid rgba(226,75,74,.3)', color:'var(--error-text)', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, textTransform:'uppercase' }}>Block slot</button>
              <button onClick={() => setDetail(null)} style={{ fontSize:12, padding:'6px 14px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, textTransform:'uppercase' }}>Close</button>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {courts.map((c, ci) => {
              const isBooked  = bookings.some(b => b.court_id === c.id && b.date === detail.date && b.hours.includes(detail.hour));
              const blockedSlot = blocked.find(bl => bl.court_id === c.id && bl.date === detail.date && bl.hour === detail.hour);
              const isBlocked = !!blockedSlot;

              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-secondary)', borderRadius:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:COURT_COLORS[ci % COURT_COLORS.length], flexShrink:0 }}/>
                    <span style={{ fontSize:13, fontWeight:600 }}>{c.name}</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", textTransform:'capitalize' }}>{c.type}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {isBlocked && blockedSlot.reason && (
                      <span style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{blockedSlot.reason}</span>
                    )}
                    <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:700, textTransform:'uppercase', background:isBlocked?'rgba(226,75,74,.12)':isBooked?'rgba(99,153,34,.12)':'var(--bg-tertiary)', color:isBlocked?'var(--error-text)':isBooked?'var(--accent)':'var(--text-muted)' }}>
                      {isBlocked?'Blocked':isBooked?'Booked':'Available'}
                    </span>
                    {isBlocked && <button className="unblock-btn" onClick={() => handleUnblock(blockedSlot.id)}>Unblock</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total bookings this week', val:totalBooked, color:'var(--text-primary)' },
          { label:'Utilization', val:`${utilization}%`, color:'var(--accent)' },
          { label:'Blocked slots', val:totalBlocked, color:'var(--error-text)' },
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
            <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* BLOCK MODAL */}
      {blockModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
          onClick={e => e.target === e.currentTarget && setBlockModal(null)}>
          <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:800, textTransform:'uppercase' }}>Block slot</div>
              <button onClick={() => setBlockModal(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:22 }} aria-label="Close">✕</button>
            </div>
            <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>
              {HOURS.find(h => h.hour === blockModal.hour)?.label} — {new Date(blockModal.date+'T00:00:00').toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}
            </div>

            {/* Court selection */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8, fontFamily:"'Barlow',sans-serif" }}>Block which courts?</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:"'Barlow',sans-serif", fontSize:13 }}>
                  <input type="checkbox" className="block-check" checked={blockCourts.length === courts.length} onChange={e => setBlockCourts(e.target.checked ? courts.map(c=>c.id) : [])} />
                  All courts
                </label>
                {courts.map((c,ci) => (
                  <label key={c.id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:"'Barlow',sans-serif", fontSize:13 }}>
                    <input type="checkbox" className="block-check" checked={blockCourts.includes(c.id)} onChange={e => setBlockCourts(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                    <span style={{ width:8, height:8, borderRadius:'50%', background:COURT_COLORS[ci % COURT_COLORS.length], display:'inline-block' }}/>
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6, fontFamily:"'Barlow',sans-serif" }}>Reason (optional)</div>
              <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Maintenance, Private event" aria-label="Block reason"
                style={{ width:'100%', height:38, background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontFamily:"'Barlow',sans-serif", fontSize:14, padding:'0 12px', outline:'none' }} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleBlock} disabled={blocking || blockCourts.length === 0}
                style={{ flex:1, height:42, background:'rgba(226,75,74,.8)', color:'#fff', border:'none', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, textTransform:'uppercase', cursor:'pointer', opacity:blockCourts.length===0?0.5:1 }}>
                {blocking ? 'Blocking...' : 'Block slot'}
              </button>
              <button onClick={() => setBlockModal(null)} style={{ height:42, padding:'0 16px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}