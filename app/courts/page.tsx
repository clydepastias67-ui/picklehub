'use client';

import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { redirectToPayment } from '@/lib/usePayMongo';
import Navbar from '@/lib/Navbar';

type Court = { id:string; name:string; description:string; type:'indoor'|'outdoor'; price_per_hour:number; is_available:boolean; image_url?:string; };
type Coach = { id:string; name:string; skill_level:string; price_per_session:number; };
type MenuItem = { id:string; name:string; category:string; price:number; };

const HOURS = Array.from({length:14},(_,i) => {
  const hour = i + 6;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour;
  return { label:`${display}:00 ${ampm}`, hour };
});

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const sun = new Date(today);
  sun.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({length:7}, (_,i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function CourtsPage() {
  const [courts, setCourts]         = useState<Court[]>([]);
  const [coaches, setCoaches]       = useState<Coach[]>([]);
  const [menuItems, setMenuItems]   = useState<MenuItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<Court|null>(null);
  const [filterType, setFilterType] = useState<'all'|'indoor'|'outdoor'>('all');
  const [weekOffset, setWeekOffset] = useState(0);

  // Calendar selection
  const [selectedDate, setSelectedDate]   = useState('');
  const [selectedHour, setSelectedHour]   = useState<number|null>(null);
  const [selectedDuration, setSelectedDuration] = useState(1);

  // Booked/blocked data keyed by date
  const [bookedMap, setBookedMap]   = useState<Record<string, number[]>>({});
  const [blockedMap, setBlockedMap] = useState<Record<string, number[]>>({});

  // Extras
  const [selectedCoach, setSelectedCoach]   = useState<Coach|null>(null);
  const [selectedFood, setSelectedFood]     = useState<{item:MenuItem;qty:number}[]>([]);
  const [booking, setBooking]               = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError]                   = useState('');
  const [user, setUser]                     = useState<{id:string;email?:string}|null>(null);

  const supabase = createClient();

  const fetchWeekData = useCallback(async (offset: number, courtId: string) => {
    const dates = getWeekDates(offset);
    const start = toDateStr(dates[0]);
    const end   = toDateStr(dates[6]);

    const [{ data: bookingsData }, { data: blockedData }] = await Promise.all([
      supabase.from('bookings').select('start_time,end_time')
        .eq('court_id', courtId)
        .gte('start_time', `${start}T00:00:00`)
        .lte('start_time', `${end}T23:59:59`)
        .neq('status', 'cancelled'),
      supabase.from('blocked_slots').select('date,hour')
        .eq('court_id', courtId)
        .gte('date', start)
        .lte('date', end),
    ]);

    const newBooked: Record<string, number[]> = {};
    bookingsData?.forEach(b => {
      const s = new Date(b.start_time);
      const e = new Date(b.end_time);
      const dateKey = toDateStr(s);
      if (!newBooked[dateKey]) newBooked[dateKey] = [];
      for (let h = s.getHours(); h < e.getHours(); h++) newBooked[dateKey].push(h);
    });

    const newBlocked: Record<string, number[]> = {};
    blockedData?.forEach(b => {
      if (!newBlocked[b.date]) newBlocked[b.date] = [];
      newBlocked[b.date].push(b.hour);
    });

    setBookedMap(newBooked);
    setBlockedMap(newBlocked);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id:user.id, email:user.email });

      const [{ data:c },{ data:co },{ data:m }] = await Promise.all([
        supabase.from('courts').select('*').eq('is_available', true),
        supabase.from('coaches').select('*').eq('is_available', true),
        supabase.from('menu_items').select('*').eq('is_available', true),
      ]);
      setCourts(c||[]); setCoaches(co||[]); setMenuItems(m||[]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedCourt) return;
    fetchWeekData(weekOffset, selectedCourt.id);

    const channel = supabase.channel(`courts-cal-${selectedCourt.id}-${weekOffset}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'bookings' }, () => fetchWeekData(weekOffset, selectedCourt.id))
      .on('postgres_changes', { event:'*', schema:'public', table:'blocked_slots' }, () => fetchWeekData(weekOffset, selectedCourt.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCourt, weekOffset]);

  const handleFoodQty = (item: MenuItem, delta: number) => {
    setSelectedFood(prev => {
      const existing = prev.find(f => f.item.id === item.id);
      if (!existing && delta > 0) return [...prev, { item, qty:1 }];
      return prev.map(f => f.item.id === item.id ? { ...f, qty:Math.max(0, f.qty+delta) } : f).filter(f => f.qty > 0);
    });
  };

  const courtTotal = selectedHour !== null && selectedCourt ? selectedCourt.price_per_hour * selectedDuration : 0;
  const coachTotal = selectedCoach ? selectedCoach.price_per_session : 0;
  const foodTotal  = selectedFood.reduce((s,f) => s + f.item.price * f.qty, 0);
  const grandTotal = courtTotal + coachTotal + foodTotal;

  const handleBook = async () => {
    if (!selectedCourt || selectedHour === null || !user || !selectedDate) return;
    setBooking(true); setError('');
    try {
      const startTime = new Date(`${selectedDate}T${String(selectedHour).padStart(2,'0')}:00:00`);
      const endTime   = new Date(startTime);
      endTime.setHours(endTime.getHours() + selectedDuration);
      const { data:bookingData, error:bookingError } = await supabase.from('bookings').insert({
        court_id:selectedCourt.id, user_id:user.id,
        start_time:startTime.toISOString(), end_time:endTime.toISOString(),
        total_price:grandTotal, status:'pending',
      }).select().single();
      if (bookingError) throw bookingError;
      if (selectedCoach && bookingData) await supabase.from('coaching_sessions').insert({ coach_id:selectedCoach.id, user_id:user.id, session_time:startTime.toISOString(), price:selectedCoach.price_per_session, status:'pending' });
      if (selectedFood.length > 0 && bookingData) await supabase.from('food_orders').insert({ user_id:user.id, booking_id:bookingData.id, items:selectedFood.map(f=>({id:f.item.id,name:f.item.name,qty:f.qty,price:f.item.price})), total_price:foodTotal, delivery_type:'court', status:'pending' });
      await redirectToPayment({ amount:grandTotal, description:`Picklverse Court Booking - ${selectedCourt.name} on ${selectedDate}`, referenceId:bookingData.id, type:'booking' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
      setBooking(false);
    }
  };

  const filteredCourts = courts.filter(c => filterType === 'all' || c.type === filterType);
  const weekDates = getWeekDates(weekOffset);
  const fmtWeek   = (d: Date) => d.toLocaleDateString('en-PH', { month:'short', day:'numeric' });
  const today     = new Date();
  today.setHours(0,0,0,0);

  if (loading) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14 }}>Loading courts...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (bookingSuccess) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ width:64, height:64, background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 14l6 6L23 8" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontSize:36, fontWeight:800, textTransform:'uppercase', marginBottom:12 }}>Booking confirmed!</h2>
        <p style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:15, marginBottom:8 }}>{selectedCourt?.name} · {selectedDate}</p>
        <p style={{ fontFamily:"'Barlow',sans-serif", color:'var(--accent)', fontSize:18, fontWeight:700, marginBottom:32 }}>Total: ₱{grandTotal.toLocaleString()}</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <a href="/dashboard" style={{ background:'var(--accent)', color:'#fff', padding:'12px 24px', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', textDecoration:'none' }}>Go to dashboard</a>
          <button onClick={() => { setBookingSuccess(false); setSelectedCourt(null); setSelectedHour(null); setSelectedDate(''); setSelectedCoach(null); setSelectedFood([]); }} style={{ background:'transparent', border:'1px solid var(--border-hover)', color:'var(--text-secondary)', padding:'12px 24px', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, cursor:'pointer' }}>Book another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .court-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .25s;animation:fadeUp .5s ease both;}
        .court-card:hover{border-color:var(--accent);transform:translateY(-3px);}
        .court-card.selected{border-color:var(--accent);border-width:2px;}
        .court-img{height:140px;background:var(--bg-hover);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}

        .filter-pill{padding:7px 16px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--border);cursor:pointer;transition:all .2s;background:transparent;color:var(--text-muted);}
        .filter-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);}

        .cal-cell{height:28px;border-radius:4px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:1px solid transparent;}
        .cal-cell.available{background:rgba(99,153,34,.15);border-color:rgba(99,153,34,.25);color:var(--accent);}
        .cal-cell.available:hover{background:rgba(99,153,34,.3);border-color:var(--accent);}
        .cal-cell.selected{background:var(--accent);border-color:var(--accent);color:#fff;}
        .cal-cell.booked{background:var(--bg-secondary);border-color:var(--border);color:var(--text-hint);cursor:not-allowed;}
        .cal-cell.blocked{background:rgba(226,75,74,.12);border-color:rgba(226,75,74,.25);color:var(--error-text);cursor:not-allowed;}
        .cal-cell.past{background:transparent;border-color:transparent;color:var(--text-hint);cursor:not-allowed;opacity:.4;}

        .coach-card{border:1px solid var(--border);border-radius:10px;padding:14px;cursor:pointer;transition:all .2s;background:var(--card-bg);}
        .coach-card:hover{border-color:var(--accent);}
        .coach-card.selected{border-color:var(--accent);border-width:2px;background:var(--accent-bg);}

        .food-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);}
        .food-item:last-child{border-bottom:none;}
        .qty-btn{width:26px;height:26px;border-radius:50%;border:1px solid var(--border-hover);background:transparent;color:var(--text-primary);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .15s;line-height:1;}
        .qty-btn:hover{border-color:var(--accent);background:var(--accent-bg);}

        .book-btn{width:100%;height:50px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .book-btn:hover:not(:disabled){background:var(--accent-hover);}
        .book-btn:disabled{background:var(--bg-hover);color:var(--text-muted);cursor:not-allowed;}

        .section-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;}
        .section-label{font-size:11px;color:var(--accent);letter-spacing:.1em;text-transform:uppercase;font-family:'Barlow',sans-serif;margin-bottom:12px;}
        .summary-row{display:flex;justify-content:space-between;font-family:'Barlow',sans-serif;font-size:13px;color:var(--text-muted);margin-bottom:6px;}
        .summary-total{display:flex;justify-content:space-between;font-size:18px;font-weight:800;padding-top:12px;border-top:1px solid var(--border);margin-top:8px;}

        @media(max-width:768px){.main-grid{grid-template-columns:1fr !important;}}
      `}</style>

      <Navbar activeLink="/courts" />

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom:32, animation:'fadeUp .5s ease both' }}>
          <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>Book a court</div>
          <h1 style={{ fontSize:'clamp(32px,5vw,52px)', fontWeight:800, textTransform:'uppercase', lineHeight:1, marginBottom:8 }}>
            Find your <span style={{ color:'var(--accent)' }}>perfect court</span>
          </h1>
          <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:15, color:'var(--text-muted)' }}>Select a court then pick your day and time from the calendar.</p>
        </div>

        {/* FILTERS */}
        <div style={{ display:'flex', gap:8, marginBottom:20, animation:'fadeUp .5s .1s ease both' }}>
          {(['all','indoor','outdoor'] as const).map(f => (
            <button key={f} className={`filter-pill ${filterType===f?'active':''}`} onClick={() => setFilterType(f)}>
              {f === 'all' ? 'All courts' : f}
            </button>
          ))}
        </div>

        <div className="main-grid" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24, alignItems:'start' }}>

          {/* LEFT */}
          <div>
            {/* COURT CARDS */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:24 }}>
              {filteredCourts.length === 0
                ? <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14, padding:'40px 0' }}>No courts available.</div>
                : filteredCourts.map((court, i) => (
                  <div key={court.id} className={`court-card ${selectedCourt?.id===court.id?'selected':''}`} style={{ animationDelay:`${i*0.08}s` }} onClick={() => { setSelectedCourt(court); setSelectedHour(null); setSelectedDate(''); }}>
                    <div className="court-img">
                      {court.image_url
                        ? <Image src={court.image_url} alt={court.name} fill sizes="(max-width:768px) 100vw, 400px" style={{ objectFit:'cover' }} />
                        : <div style={{ width:80, height:50, border:'2px solid var(--accent)', borderRadius:4, position:'relative' }}><div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1, background:'rgba(255,255,255,.2)' }}/><div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'var(--accent)', opacity:.4 }}/></div>
                      }
                      <div style={{ position:'absolute', top:8, right:8, background:court.type==='indoor'?'rgba(56,138,221,.15)':'var(--accent-bg)', border:`1px solid ${court.type==='indoor'?'rgba(56,138,221,.3)':'var(--accent-border)'}`, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, color:court.type==='indoor'?'#85B7EB':'var(--accent-light)', textTransform:'uppercase', letterSpacing:'0.06em', zIndex:1 }}>{court.type}</div>
                    </div>
                    <div style={{ padding:14 }}>
                      <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{court.name}</div>
                      <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--text-muted)', marginBottom:10, lineHeight:1.4 }}>{court.description || (court.type==='indoor'?'Air-conditioned indoor court':'Open air outdoor court')}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:16, fontWeight:800, color:'var(--accent)' }}>₱{court.price_per_hour}<span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>/hr</span></span>
                        <span style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>{selectedCourt?.id===court.id?'✓ Selected':'Select'}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* CALENDAR */}
            {selectedCourt && (
              <div className="section-card" style={{ animation:'fadeUp .4s ease both' }}>
                {/* Calendar header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                  <div>
                    <div className="section-label">{selectedCourt.name} — availability</div>
                    <div style={{ fontSize:18, fontWeight:700 }}>Pick a day & time</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => { setWeekOffset(w => w-1); setSelectedHour(null); setSelectedDate(''); }} disabled={weekOffset <= 0} style={{ width:30, height:30, borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', opacity:weekOffset<=0?0.4:1 }}>‹</button>
                    <span style={{ fontSize:13, fontWeight:600, minWidth:150, textAlign:'center' }}>{fmtWeek(weekDates[0])} – {fmtWeek(weekDates[6])}</span>
                    <button onClick={() => { setWeekOffset(w => w+1); setSelectedHour(null); setSelectedDate(''); }} style={{ width:30, height:30, borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                  </div>
                </div>

                {/* Duration selector */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--text-muted)' }}>Duration:</span>
                  {[1,2,3].map(d => (
                    <button key={d} onClick={() => { setSelectedDuration(d); setSelectedHour(null); }} style={{ width:36, height:28, borderRadius:6, border:`1px solid ${selectedDuration===d?'var(--accent)':'var(--border)'}`, background:selectedDuration===d?'var(--accent)':'transparent', color:selectedDuration===d?'#fff':'var(--text-muted)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>{d}hr</button>
                  ))}
                </div>

                {/* Grid */}
                <div style={{ overflowX:'auto' }}>
                  <div style={{ minWidth:480 }}>
                    {/* Day headers */}
                    <div style={{ display:'grid', gridTemplateColumns:'52px repeat(7,minmax(0,1fr))', gap:3, marginBottom:4 }}>
                      <div/>
                      {weekDates.map((d, di) => {
                        const isToday = d.toDateString() === new Date().toDateString();
                        return (
                          <div key={di} style={{ textAlign:'center', paddingBottom:4 }}>
                            <div style={{ fontSize:10, color:'var(--text-hint)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{DAYS[di]}</div>
                            <div style={{ fontSize:13, fontWeight:isToday?700:400, color:isToday?'var(--accent)':'var(--text-secondary)', marginTop:2 }}>{d.getDate()}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Hour rows */}
                    {HOURS.map(({ label, hour }) => (
                      <div key={hour} style={{ display:'grid', gridTemplateColumns:'52px repeat(7,minmax(0,1fr))', gap:3, marginBottom:3 }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'right', paddingRight:6, paddingTop:7, whiteSpace:'nowrap' }}>{label}</div>
                        {weekDates.map((d, di) => {
                          const dateStr  = toDateStr(d);
                          const isPast   = d < today || (d.toDateString() === today.toDateString() && hour < new Date().getHours());
                          const booked   = bookedMap[dateStr] || [];
                          const blocked  = blockedMap[dateStr] || [];
                          const hoursNeeded = Array.from({length:selectedDuration}, (_,i) => hour+i);
                          const isBooked  = hoursNeeded.some(h => booked.includes(h));
                          const isBlocked = hoursNeeded.some(h => blocked.includes(h));
                          const runsOver  = hour + selectedDuration > 20;
                          const isSelected = selectedDate === dateStr && selectedHour === hour;
                          const unavailable = isPast || isBooked || isBlocked || runsOver;

                          let cellClass = 'cal-cell ';
                          if (isPast || runsOver) cellClass += 'past';
                          else if (isBlocked) cellClass += 'blocked';
                          else if (isBooked) cellClass += 'booked';
                          else if (isSelected) cellClass += 'selected';
                          else cellClass += 'available';

                          return (
                            <div key={di} className={cellClass} title={isBlocked?'Blocked':isBooked?'Booked':isPast?'Past':label} onClick={() => {
                              if (unavailable) return;
                              if (isSelected) { setSelectedDate(''); setSelectedHour(null); }
                              else { setSelectedDate(dateStr); setSelectedHour(hour); }
                            }}>
                              {isBlocked ? '✕' : isBooked ? '' : isSelected ? '✓' : ''}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
                  {[
                    { color:'rgba(99,153,34,.15)', border:'rgba(99,153,34,.25)', label:'Available' },
                    { color:'var(--accent)', border:'var(--accent)', label:'Selected' },
                    { color:'var(--bg-secondary)', border:'var(--border)', label:'Booked' },
                    { color:'rgba(226,75,74,.12)', border:'rgba(226,75,74,.25)', label:'Blocked' },
                  ].map(l => (
                    <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontFamily:"'Barlow',sans-serif", fontSize:11, color:'var(--text-muted)' }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:l.color, border:`1px solid ${l.border}` }}/>
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COACHING */}
            {selectedHour !== null && (
              <div className="section-card" style={{ animation:'fadeUp .4s ease both' }}>
                <div className="section-label">Optional — Add coaching</div>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Book a coach for this session</div>
                {coaches.length === 0
                  ? <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)' }}>No coaches available.</div>
                  : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
                    {coaches.map(coach => (
                      <div key={coach.id} className={`coach-card ${selectedCoach?.id===coach.id?'selected':''}`} onClick={() => setSelectedCoach(selectedCoach?.id===coach.id?null:coach)}>
                        <div style={{ width:36, height:36, background:'var(--accent-bg)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'var(--accent)', marginBottom:8 }}>{coach.name[0]}</div>
                        <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{coach.name}</div>
                        <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:11, color:'var(--text-muted)', textTransform:'capitalize', marginBottom:6 }}>{coach.skill_level}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>₱{coach.price_per_session}</div>
                        {selectedCoach?.id === coach.id && <div style={{ fontSize:10, color:'var(--success-text)', marginTop:4, fontWeight:600 }}>✓ Added</div>}
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}

            {/* FOOD */}
            {selectedHour !== null && (
              <div className="section-card" style={{ animation:'fadeUp .4s ease both' }}>
                <div className="section-label">Optional — Order food & drinks</div>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Add to your session</div>
                {menuItems.length === 0
                  ? <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)' }}>No menu items available.</div>
                  : <div>
                    {(['snacks','drinks','meals'] as const).map(cat => {
                      const items = menuItems.filter(m => m.category === cat);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat} style={{ marginBottom:16 }}>
                          <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif", marginBottom:8 }}>{cat}</div>
                          {items.map(item => (
                            <div key={item.id} className="food-item">
                              <div>
                                <div style={{ fontSize:14, fontWeight:600 }}>{item.name}</div>
                                <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--accent)', marginTop:2 }}>₱{item.price}</div>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <button className="qty-btn" onClick={() => handleFoodQty(item,-1)}>−</button>
                                <span style={{ fontSize:14, fontWeight:700, minWidth:20, textAlign:'center' }}>{selectedFood.find(f=>f.item.id===item.id)?.qty||0}</span>
                                <button className="qty-btn" onClick={() => handleFoodQty(item,1)}>+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                }
              </div>
            )}
          </div>

          {/* SIDEBAR SUMMARY */}
          <div style={{ position:'sticky', top:76 }}>
            <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, padding:20, animation:'fadeUp .5s .2s ease both' }}>
              <div style={{ fontSize:16, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:20 }}>Booking summary</div>
              {!selectedCourt
                ? <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'24px 0' }}>Select a court to get started</div>
                : <>
                  <div style={{ background:'var(--bg-primary)', borderRadius:8, padding:14, marginBottom:16 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", marginBottom:6, letterSpacing:'0.06em', textTransform:'uppercase' }}>Court</div>
                    <div style={{ fontSize:15, fontWeight:700 }}>{selectedCourt.name}</div>
                    <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--text-muted)', marginTop:2, textTransform:'capitalize' }}>{selectedCourt.type}</div>
                    {selectedHour !== null && selectedDate && (
                      <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:12, color:'var(--accent)', marginTop:4 }}>
                        {new Date(selectedDate+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',weekday:'short'})} · {HOURS.find(h=>h.hour===selectedHour)?.label} · {selectedDuration}hr{selectedDuration>1?'s':''}
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div className="summary-row"><span>Court ({selectedDuration}hr)</span><span style={{ color:'var(--text-primary)' }}>₱{courtTotal.toLocaleString()}</span></div>
                    {selectedCoach && <div className="summary-row"><span>Coach — {selectedCoach.name}</span><span style={{ color:'var(--text-primary)' }}>₱{coachTotal.toLocaleString()}</span></div>}
                    {selectedFood.map(f => (
                      <div key={f.item.id} className="summary-row"><span>{f.item.name} x{f.qty}</span><span style={{ color:'var(--text-primary)' }}>₱{(f.item.price*f.qty).toLocaleString()}</span></div>
                    ))}
                    <div className="summary-total"><span>Total</span><span style={{ color:'var(--accent)' }}>₱{grandTotal.toLocaleString()}</span></div>
                  </div>
                  {error && <div style={{ background:'var(--error-bg)', border:'1px solid var(--error-border)', borderRadius:8, padding:'10px 14px', fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--error-text)', marginBottom:12 }}>{error}</div>}
                  <button className="book-btn" disabled={selectedHour===null||booking} onClick={handleBook}>
                    {booking
                      ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>Processing...</>
                      : selectedHour === null ? 'Select a time slot'
                      : <>Confirm booking <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                    }
                  </button>
                  <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:11, color:'var(--text-hint)', textAlign:'center', marginTop:10 }}>Payment via GCash, Maya or card · Powered by PayMongo</div>
                </>
              }
            </div>
            {/* Step indicator */}
            <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', marginTop:16 }}>
              {[{label:'Court',done:!!selectedCourt},{label:'Time',done:selectedHour!==null},{label:'Extras',done:!!selectedCoach||selectedFood.length>0},{label:'Book',done:false}].map((s,i) => (
                <React.Fragment key={s.label}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:s.done?'var(--accent)':'var(--border)', transition:'background .3s' }}/>
                    <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:10, color:s.done?'var(--accent)':'var(--text-hint)' }}>{s.label}</div>
                  </div>
                  {i < 3 && <div style={{ width:20, height:1, background:'var(--border)', marginBottom:12 }}/>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}