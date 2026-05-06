'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

type Booking = { id:string; court_id:string; start_time:string; end_time:string; total_price:number; status:string; courts?:{name:string;type:string}; };
type CoachingSession = { id:string; session_time:string; price:number; status:string; coaches?:{name:string;skill_level:string}; };
type Tournament = { id:string; tournament_id:string; tournaments?:{name:string;date:string;status:string;format:string}; };
type TournamentMatch = {
  id:string; tournament_id:string; round:number; match_number:number;
  bracket:string; player1_name:string|null; player2_name:string|null;
  player1_score:number; player2_score:number; winner_id:string|null; status:string;
};
type User = { id:string; email?:string; full_name?:string; };

export default function PlayerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matchMap, setMatchMap] = useState<Record<string, TournamentMatch[]>>({});
  const [expandedBracket, setExpandedBracket] = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id:user.id, email:user.email, full_name:user.user_metadata?.full_name });
      const { data: adminData } = await supabase.from('admins').select('email').eq('email', user.email).single();
      if (adminData) setIsAdmin(true);

      const { data: empData } = await supabase.from('employees').select('email').eq('email', user.email).single();
      if (empData) setIsEmployee(true);
      const [{ data:bookingsData },{ data:sessionsData },{ data:tournamentsData }] = await Promise.all([
        supabase.from('bookings').select('*, courts(name,type)').eq('user_id',user.id).eq('status','confirmed').order('start_time',{ascending:false}).limit(10),
        supabase.from('coaching_sessions').select('*, coaches(name,skill_level)').eq('user_id',user.id).eq('status','confirmed').order('session_time',{ascending:false}).limit(5),
        supabase.from('tournament_registrations').select('*, tournaments(name,date,status,format)').eq('user_id',user.id).limit(20),
      ]);
      setBookings(bookingsData||[]); setSessions(sessionsData||[]);
      console.log('[dashboard] tournamentsData:', tournamentsData);
      setTournaments(tournamentsData||[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSignOut = async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = '/'; };

  const fetchMatches = async (tournamentId: string) => {
    const supabase = createClient();
    const { data } = await supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round').order('match_number');
    setMatchMap(prev => ({ ...prev, [tournamentId]: data || [] }));
  };

  const toggleBracket = (tournamentId: string) => {
    if (expandedBracket === tournamentId) { setExpandedBracket(null); return; }
    setExpandedBracket(tournamentId);
    if (!matchMap[tournamentId]) fetchMatches(tournamentId);
  };
  const formatDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
  const formatTime = (d:string) => new Date(d).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});
  const totalSpent = bookings.filter(b=>b.status==='confirmed').reduce((s,b)=>s+(b.total_price||0),0);
  const confirmedBookings = bookings.filter(b=>b.status==='confirmed').length;
  const upcomingBookings = bookings.filter(b=>new Date(b.start_time)>new Date()).length;

  const navItems = [
    {id:'overview',label:'Overview'},
    {id:'bookings',label:'My bookings'},
    {id:'coaching',label:'Coaching'},
    {id:'tournaments',label:'Tournaments'},
    {id:'quicklinks',label:'Quick links'},
  ];

  if (loading) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTop:`2px solid var(--accent)`, borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14 }}>Loading your dashboard...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        /* DESKTOP: sidebar layout */
        .sidebar{width:220px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;transition:transform .3s;}
        .main{margin-left:220px;min-height:100vh;}

        /* MOBILE: no sidebar, full width content, bottom nav */
        @media(max-width:768px){
          .sidebar{display:none;}
          .sidebar.open{display:flex;transform:none;}
          .main{margin-left:0 !important;width:100% !important;}
          .mobile-topbar{display:flex !important;}
          .bottom-nav{display:flex !important;}
        }

        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text-muted);cursor:pointer;transition:all .2s;text-decoration:none;margin:1px 8px;}
        .nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .nav-item.active{background:var(--accent-bg);color:var(--accent-light);}

        .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;animation:fadeUp .5s ease both;transition:border-color .2s;}
        .stat-card:hover{border-color:var(--border-hover);}

        .booking-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);animation:fadeIn .4s ease both;gap:8px;flex-wrap:wrap;}
        .booking-row:last-child{border-bottom:none;}

        .status-badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
        .status-confirmed{background:var(--success-bg);color:var(--success-text);}
        .status-pending{background:var(--warning-bg);color:var(--warning-text);}
        .status-cancelled{background:var(--error-bg);color:var(--error-text);}

        .quick-link{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px 16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;text-decoration:none;color:var(--text-primary);transition:all .2s;cursor:pointer;}
        .quick-link:hover{border-color:var(--accent);transform:translateY(-3px);}
        .quick-link-icon{width:40px;height:40px;background:var(--accent-bg);border-radius:10px;display:flex;align-items:center;justify-content:center;}
        .quick-link-label{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;text-align:center;}

        .section-title{font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;margin-bottom:16px;}
        .view-all-btn{background:var(--accent);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
        .view-all-btn:hover{background:var(--accent-hover);}

        .empty-state{text-align:center;padding:40px 20px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
        .empty-state a{color:var(--accent);text-decoration:none;font-weight:500;}

        .mobile-topbar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 16px;height:56px;align-items:center;justify-content:space-between;width:100%;}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px;}
        .signout-btn:hover{border-color:var(--accent);color:var(--text-primary);}

        .section-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px;animation:fadeUp .5s ease both;width:100%;min-width:0;overflow:hidden;}

        /* BOTTOM NAV for mobile */
        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;padding:0 8px;}
        .bottom-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 12px;border-radius:8px;cursor:pointer;transition:all .2s;flex:1;border:none;background:transparent;}
        .bottom-nav-item.active .bnav-icon{color:var(--accent);}
        .bottom-nav-item.active .bnav-label{color:var(--accent);}
        .bnav-icon{font-size:18px;line-height:1;}
        .bnav-label{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}
        .add-btn{background:var(--accent);color:#fff;padding:8px 16px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;transition:background .2s;}
        .add-btn:hover{background:var(--accent-hover);}
      `}</style>

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen?'open':''}`}>
        <div style={{ padding:'20px 16px', borderBottom:'1px solid var(--border)' }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--text-primary)' }}>
            <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }} />
            <span style={{ fontSize:18, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>PickleHub</span>
          </a>
        </div>
        <div style={{ padding:'16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {(user?.full_name||user?.email||'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{user?.full_name||'Player'}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", marginTop:1 }}>{user?.email}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
          <div style={{ padding:'8px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif" }}>Menu</div>
          {navItems.map(item => (
            <div key={item.id} className={`nav-item ${activeTab===item.id?'active':''}`} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}>{item.label}</div>
          ))}
          <div style={{ padding:'16px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif", marginTop:8 }}>Services</div>
          {[{label:'Book a court',href:'/courts'},{label:'Order food',href:'/food'},{label:'Shop',href:'/shop'},{label:'Coaching',href:'/coaching'}].map(l => (
            <a key={l.label} href={l.href} className="nav-item">{l.label}</a>
          ))}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8 }}>
          {isAdmin && (
            <a href="/admin" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:'var(--accent-bg)', border:'1px solid var(--accent-border)', color:'var(--accent)', textDecoration:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', transition:'all .2s' }}>
              <span style={{fontSize:14}}>🔐</span> Admin panel
            </a>
          )}
          {isEmployee && (
            <a href="/employee" style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background:'var(--accent-bg)', border:'1px solid var(--accent-border)', color:'var(--accent)', textDecoration:'none', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', transition:'all .2s' }}>
              <span style={{fontSize:14}}>👷</span> Staff panel
            </a>
          )}
          <ThemeToggle />
          <button className="signout-btn" onClick={handleSignOut}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 12H2a1 1 0 01-1-1V3a1 1 0 011-1h3M9 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>
      </div>

      {/* MOBILE TOPBAR */}
      <div className="mobile-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }} />
          <span style={{ fontSize:16, fontWeight:800, textTransform:'uppercase' }}>PickleHub</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu" aria-label="Toggle menu" style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div style={{ padding:'clamp(16px,4vw,32px) clamp(12px,3vw,32px) 80px', maxWidth:'100%', overflowX:'hidden' }}>
          <div style={{ marginBottom:24, animation:'fadeUp .5s ease both', width:'100%' }}>
            <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>
              {new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
            </div>
            <h1 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, textTransform:'uppercase', letterSpacing:'-0.01em', lineHeight:1 }}>
              Welcome back, <span style={{ color:'var(--accent)' }}>{user?.full_name?.split(' ')[0]||'Player'}</span>
            </h1>
          </div>

          {/* OVERVIEW */}
          {activeTab==='overview' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12, marginBottom:32 }}>
                {[{label:'Total bookings',value:bookings.filter(b=>b.status==='confirmed').length},{label:'Upcoming',value:bookings.filter(b=>b.status==='confirmed'&&new Date(b.start_time)>new Date()).length},{label:'Confirmed',value:bookings.filter(b=>b.status==='confirmed').length},{label:'Total spent',value:`₱${totalSpent.toLocaleString()}`}].map((stat,i) => (
                  <div key={i} className="stat-card" style={{ animationDelay:`${i*0.08}s` }}>
                    <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8 }}>{stat.label}</div>
                    <div style={{ fontSize:32, fontWeight:800, lineHeight:1 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="section-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div className="section-title" style={{ marginBottom:0 }}>Recent bookings</div>
                  <button className="view-all-btn" onClick={() => setActiveTab('bookings')}>View all</button>
                </div>
                {bookings.length===0 ? <div className="empty-state">No bookings yet — <a href="/courts">book a court</a> to get started!</div> :
                  bookings.slice(0,4).map((b,i) => (
                    <div key={b.id} className="booking-row" style={{ animationDelay:`${i*0.06}s` }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{b.courts?.name||'Court'}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{formatDate(b.start_time)} · {formatTime(b.start_time)} – {formatTime(b.end_time)}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>₱{b.total_price}</div>
                        <span className={`status-badge status-${b.status}`}>{b.status}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="section-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div className="section-title" style={{ marginBottom:0 }}>Coaching sessions</div>
                  <button className="view-all-btn" onClick={() => setActiveTab('coaching')}>View all</button>
                </div>
                {sessions.length===0 ? <div className="empty-state">No sessions booked — <a href="/coaching">find a coach</a>!</div> :
                  sessions.slice(0,3).map((s,i) => (
                    <div key={s.id} className="booking-row" style={{ animationDelay:`${i*0.06}s` }}>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{s.coaches?.name||'Coach'}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{s.coaches?.skill_level} · {formatDate(s.session_time)}</div>
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
          )}

          {/* BOOKINGS */}
          {activeTab==='bookings' && (
            <div style={{ animation:'fadeUp .4s ease both' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div className="section-title" style={{ marginBottom:0 }}>My bookings</div>
                <a href="/courts" className="add-btn">+ Book court</a>
              </div>
              <div className="section-card" style={{ marginBottom:0 }}>
                {bookings.length===0 ? <div className="empty-state">No bookings yet — <a href="/courts">book your first court!</a></div> :
                  bookings.map((b,i) => (
                    <div key={b.id} className="booking-row" style={{ animationDelay:`${i*0.05}s` }}>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{b.courts?.name||'Court'}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)', marginBottom:2 }}>{b.courts?.type==='indoor'?'Indoor':'Outdoor'} · {formatDate(b.start_time)}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{formatTime(b.start_time)} – {formatTime(b.end_time)}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:'var(--accent)' }}>₱{b.total_price}</div>
                        <span className={`status-badge status-${b.status}`}>{b.status}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* COACHING */}
          {activeTab==='coaching' && (
            <div style={{ animation:'fadeUp .4s ease both' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div className="section-title" style={{ marginBottom:0 }}>Coaching sessions</div>
                <a href="/coaching" className="add-btn">+ Book session</a>
              </div>
              <div className="section-card" style={{ marginBottom:0 }}>
                {sessions.length===0 ? <div className="empty-state">No sessions booked yet — <a href="/coaching">find a coach!</a></div> :
                  sessions.map((s,i) => (
                    <div key={s.id} className="booking-row" style={{ animationDelay:`${i*0.05}s` }}>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{s.coaches?.name||'Coach'}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)', marginBottom:2 }}>{s.coaches?.skill_level} level · {formatDate(s.session_time)}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{formatTime(s.session_time)}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                        <div style={{ fontSize:16, fontWeight:800, color:'var(--accent)' }}>₱{s.price}</div>
                        <span className={`status-badge status-${s.status}`}>{s.status}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* TOURNAMENTS */}
          {activeTab==='tournaments' && (
            <div style={{ animation:'fadeUp .4s ease both' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div className="section-title" style={{ marginBottom:0 }}>My tournaments</div>
                <a href="/tournaments" className="add-btn">Browse tournaments</a>
              </div>
              <div className="section-card" style={{ marginBottom:0 }}>
                {tournaments.length===0 ? <div className="empty-state">Not registered in any tournaments — <a href="/tournaments">join one!</a></div> :
                  tournaments.map((t,i) => {
                    const tid = t.tournaments ? (t as unknown as {tournament_id:string}).tournament_id || t.id : t.id;
                    const status = t.tournaments?.status || 'open';
                    const hasBracket = status === 'ongoing' || status === 'completed';
                    return (
                      <div key={t.id} style={{ animationDelay:`${i*0.05}s`, borderBottom:'1px solid var(--border)', paddingBottom: hasBracket && expandedBracket === tid ? 16 : 0 }}>
                        <div className="booking-row" style={{ cursor: hasBracket ? 'pointer' : 'default' }} onClick={() => hasBracket && toggleBracket(tid)}>
                          <div>
                            <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{t.tournaments?.name||'Tournament'}</div>
                            <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{t.tournaments?.date?formatDate(t.tournaments.date):'—'}</div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span className={`status-badge status-${status}`}>{status}</span>
                            {hasBracket && <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>{expandedBracket===tid?'▲':'▼'}</span>}
                          </div>
                        </div>

                        {/* Bracket view */}
                        {hasBracket && expandedBracket === tid && (() => {
                          const tMatches = (matchMap[tid] || []).filter(m => m.bracket === 'winners' || m.bracket === 'grand_final');
                          if (!matchMap[tid]) return <div style={{ padding:'12px 0', fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)' }}>Loading bracket...</div>;
                          if (tMatches.length === 0) return <div style={{ padding:'12px 0', fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)' }}>Bracket not generated yet.</div>;

                          const rounds = Array.from(new Set(tMatches.map(m => m.round))).sort((a,b) => a-b);
                          const totalRounds = rounds.length;
                          const BOX_W=150, BOX_H=56, COL_GAP=70, CHAMP_W=110, CHAMP_H=40;
                          const r1Matches = tMatches.filter(m => m.round === rounds[0]);
                          const R1_GAP = BOX_H + 24;
                          const totalHeight = Math.max(160, r1Matches.length * (BOX_H + R1_GAP) + R1_GAP);
                          const matchY: Record<string,number> = {};
                          rounds.forEach((round,ri) => {
                            const rm = tMatches.filter(m => m.round===round).sort((a,b)=>a.match_number-b.match_number);
                            const spacing = (BOX_H+R1_GAP)*Math.pow(2,ri);
                            const startY = spacing/2-BOX_H/2;
                            rm.forEach((m,mi) => { matchY[m.id] = startY+mi*spacing+BOX_H/2; });
                          });
                          const svgW = totalRounds*(BOX_W+COL_GAP)+COL_GAP+CHAMP_W+40;
                          const svgH = totalHeight+60;
                          const colX = (ri:number) => 20+ri*(BOX_W+COL_GAP);
                          const lines:{x1:number;y1:number;x2:number;y2:number;x3:number;y3:number;x4:number;y4:number}[] = [];
                          rounds.forEach((round,ri) => {
                            if (ri>=rounds.length-1) return;
                            const rm = tMatches.filter(m=>m.round===round).sort((a,b)=>a.match_number-b.match_number);
                            for (let i=0;i<rm.length;i+=2) {
                              const mA=rm[i],mB=rm[i+1];
                              if (!mA) continue;
                              const yA=matchY[mA.id],yB=mB?matchY[mB.id]:yA,yMid=(yA+yB)/2;
                              const x1=colX(ri)+BOX_W,x2=colX(ri)+BOX_W+COL_GAP/2,x3=colX(ri+1);
                              lines.push({x1,y1:yA,x2,y2:yA,x3:x2,y3:yMid,x4:x3,y4:yMid});
                              if (mB) lines.push({x1,y1:yB,x2,y2:yB,x3:x2,y3:yMid,x4:x3,y4:yMid});
                            }
                          });
                          const finalMatch = tMatches.find(m=>m.round===rounds[rounds.length-1]);
                          const champX = colX(totalRounds-1)+BOX_W+COL_GAP/2;
                          const champY = finalMatch ? matchY[finalMatch.id] : svgH/2;

                          return (
                            <div style={{ overflowX:'auto', paddingBottom:8, marginTop:12 }}>
                              <svg width={svgW} height={svgH} style={{ fontFamily:"'Barlow Condensed',sans-serif", overflow:'visible' }}>
                                {rounds.map((round,ri) => (
                                  <text key={round} x={colX(ri)+BOX_W/2} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-hint)" letterSpacing="0.08em">{ri===rounds.length-1?'FINAL':`ROUND ${round}`}</text>
                                ))}
                                <text x={champX+CHAMP_W/2+4} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em">CHAMPION</text>
                                {lines.map((l,i) => (
                                  <g key={i}>
                                    <line x1={l.x1} y1={l.y1+28} x2={l.x2} y2={l.y2+28} stroke="var(--border)" strokeWidth={2}/>
                                    <line x1={l.x2} y1={l.y2+28} x2={l.x3} y2={l.y3+28} stroke="var(--border)" strokeWidth={2}/>
                                    <line x1={l.x3} y1={l.y3+28} x2={l.x4} y2={l.y4+28} stroke="var(--border)" strokeWidth={2}/>
                                  </g>
                                ))}
                                {finalMatch && <line x1={colX(totalRounds-1)+BOX_W} y1={champY+28} x2={champX+CHAMP_W/2+4} y2={champY+28} stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3"/>}
                                <rect x={champX+4} y={champY+28-CHAMP_H/2} width={CHAMP_W} height={CHAMP_H} rx={8} fill="var(--accent)"/>
                                <text x={champX+4+CHAMP_W/2} y={champY+28+5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff" letterSpacing="0.06em">
                                  {finalMatch?.winner_id?(finalMatch.player1_score>finalMatch.player2_score?finalMatch.player1_name:finalMatch.player2_name)||'CHAMPION':'CHAMPION'}
                                </text>
                                {tMatches.map(m => {
                                  const x=colX(rounds.indexOf(m.round)),y=(matchY[m.id]||0)+28;
                                  const isW1=m.status==='completed'&&m.player1_score>m.player2_score;
                                  const isW2=m.status==='completed'&&m.player2_score>m.player1_score;
                                  return (
                                    <g key={m.id}>
                                      <rect x={x+2} y={y-BOX_H/2+2} width={BOX_W} height={BOX_H} rx={8} fill="rgba(0,0,0,.1)"/>
                                      <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H} rx={8} fill="var(--card-bg)" stroke={m.status==='completed'?'#4ade80':m.status==='ongoing'?'var(--accent)':'var(--border)'} strokeWidth={1.5}/>
                                      <line x1={x} y1={y} x2={x+BOX_W} y2={y} stroke="var(--border)" strokeWidth={1}/>
                                      {isW1&&<rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                                      {isW2&&<rect x={x} y={y} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                                      <text x={x+10} y={y-9} fontSize={12} fontWeight={isW1?800:500} fill={m.player1_name?(isW1?'#4ade80':'var(--text-primary)'):'var(--text-hint)'}>{m.player1_name||'TBD'}</text>
                                      <text x={x+BOX_W-8} y={y-9} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player1_score:''}</text>
                                      <text x={x+10} y={y+17} fontSize={12} fontWeight={isW2?800:500} fill={m.player2_name?(isW2?'#4ade80':'var(--text-primary)'):'var(--text-hint)'}>{m.player2_name||'TBD'}</text>
                                      <text x={x+BOX_W-8} y={y+17} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player2_score:''}</text>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* QUICK LINKS */}
          {activeTab==='quicklinks' && (
            <div style={{ animation:'fadeUp .4s ease both' }}>
              <div className="section-title">Quick links</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 }}>
                {[
                  {label:'Book a court',href:'/courts',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke="var(--accent)" strokeWidth="1.5"/><path d="M10 6v8M6 10h8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>},
                  {label:'Order food',href:'/food',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>},
                  {label:'Shop',href:'/shop',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="8" width="14" height="9" rx="1.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M7 8V6a3 3 0 016 0v2" stroke="var(--accent)" strokeWidth="1.5"/></svg>},
                  {label:'Coaching',href:'/coaching',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6" r="3.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>},
                  {label:'Tournaments',href:'/tournaments',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l2 5h5.5l-4.5 3.3 1.7 5.2L10 12.3l-4.7 3.2 1.7-5.2L2.5 7H8L10 2z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>},
                  {label:'Home',href:'/',icon:<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>},
                ].map((l,i) => (
                  <a key={i} href={l.href} className="quick-link" style={{ animationDelay:`${i*0.06}s`, animation:'fadeUp .4s ease both' }}>
                    <div className="quick-link-icon">{l.icon}</div>
                    <div className="quick-link-label">{l.label}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40 }} />}
    </div>
  );
}