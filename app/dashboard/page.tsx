'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

type Booking = { id:string; court_id:string; start_time:string; end_time:string; total_price:number; status:string; courts?:{name:string;type:string}; };
type CoachingSession = { id:string; session_time:string; price:number; status:string; coaches?:{name:string;skill_level:string}; };
type Tournament = { id:string; tournament_id:string; tournaments?:{name:string;date:string;status:string}; };
type User = { id:string; email?:string; full_name?:string; };

export default function PlayerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id:user.id, email:user.email, full_name:user.user_metadata?.full_name });
      const { data: adminData } = await supabase.from('admins').select('email').eq('email', user.email).single();
      if (adminData) setIsAdmin(true);
      const [{ data:bookingsData },{ data:sessionsData },{ data:tournamentsData }] = await Promise.all([
        supabase.from('bookings').select('*, courts(name,type)').eq('user_id',user.id).order('start_time',{ascending:false}).limit(10),
        supabase.from('coaching_sessions').select('*, coaches(name,skill_level)').eq('user_id',user.id).order('session_time',{ascending:false}).limit(5),
        supabase.from('tournament_registrations').select('*, tournaments(name,date,status)').eq('user_id',user.id).limit(5),
      ]);
      setBookings(bookingsData||[]); setSessions(sessionsData||[]); setTournaments(tournamentsData||[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSignOut = async () => { const supabase = createClient(); await supabase.auth.signOut(); window.location.href = '/'; };
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
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .sidebar{width:220px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;transition:transform .3s;}
        .main{margin-left:220px;flex:1;min-height:100vh;}
        @media(max-width:768px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.main{margin-left:0}}

        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;color:var(--text-muted);cursor:pointer;transition:all .2s;text-decoration:none;margin:1px 8px;}
        .nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .nav-item.active{background:var(--accent-bg);color:var(--accent-light);}

        .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;animation:fadeUp .5s ease both;transition:border-color .2s;}
        .stat-card:hover{border-color:var(--border-hover);}

        .booking-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border);animation:fadeIn .4s ease both;}
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

        .mobile-topbar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 20px;height:56px;align-items:center;justify-content:space-between;}
        @media(max-width:768px){.mobile-topbar{display:flex;}}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px;}
        .signout-btn:hover{border-color:var(--accent);color:var(--text-primary);}

        .section-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px;animation:fadeUp .5s ease both;}
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
        <div style={{ padding:'32px 32px 64px' }}>
          <div style={{ marginBottom:32, animation:'fadeUp .5s ease both' }}>
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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:32 }}>
                {[{label:'Total bookings',value:bookings.length},{label:'Upcoming',value:upcomingBookings},{label:'Confirmed',value:confirmedBookings},{label:'Total spent',value:`₱${totalSpent.toLocaleString()}`}].map((stat,i) => (
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
                  tournaments.map((t,i) => (
                    <div key={t.id} className="booking-row" style={{ animationDelay:`${i*0.05}s` }}>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{t.tournaments?.name||'Tournament'}</div>
                        <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>{t.tournaments?.date?formatDate(t.tournaments.date):'—'}</div>
                      </div>
                      <span className={`status-badge status-${t.tournaments?.status||'pending'}`}>{t.tournaments?.status||'registered'}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* QUICK LINKS */}
          {activeTab==='quicklinks' && (
            <div style={{ animation:'fadeUp .4s ease both' }}>
              <div className="section-title">Quick links</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
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