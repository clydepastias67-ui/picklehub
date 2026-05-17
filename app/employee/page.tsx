'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';
import OverviewTab     from './components/OverviewTab';
import BookingsTab     from './components/BookingsTab';
import FoodTab         from './components/FoodTab';
import ShopTab         from './components/ShopTab';
import CoachingTab     from './components/CoachingTab';
import CourtsTab       from './components/CourtsTab';
import TournamentsTab  from './components/TournamentsTab';
import type { Booking, FoodOrder, ShopOrder, CoachingSession, Court, Tournament, Notif } from './components/types';

const TABS = [
  { id:'overview',     label:'Today',       icon:'📊' },
  { id:'bookings',     label:'Bookings',    icon:'📅' },
  { id:'food',         label:'Food',        icon:'🍱' },
  { id:'shop',         label:'Shop',        icon:'🛍' },
  { id:'coaching',     label:'Coaching',    icon:'👤' },
  { id:'courts',       label:'Courts',      icon:'🏓' },
  { id:'tournaments',  label:'Tournaments', icon:'🏆' },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab]       = useState('overview');
  const [loading, setLoading]           = useState(true);
  const [isEmployee, setIsEmployee]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [userEmail, setUserEmail]       = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [actionMsg, setActionMsg]       = useState('');

  // ── DATA ──
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [foodOrders, setFoodOrders]   = useState<FoodOrder[]>([]);
  const [shopOrders, setShopOrders]   = useState<ShopOrder[]>([]);
  const [sessions, setSessions]       = useState<CoachingSession[]>([]);
  const [courts, setCourts]           = useState<Court[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // ── NOTIFICATIONS ──
  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [toastNotif, setToastNotif] = useState<Notif | null>(null);
  const unreadCount = notifs.filter(n => !n.read).length;

  const supabase = createClient();
  const today    = new Date().toISOString().split('T')[0];

  const toast = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2500); };

  const pushNotif = (n: Omit<Notif, 'id' | 'time' | 'read'>) => {
    const notif: Notif = { ...n, id: crypto.randomUUID(), time: new Date(), read: false };
    setNotifs(prev => [notif, ...prev].slice(0, 50));
    setToastNotif(notif);
    setTimeout(() => setToastNotif(null), 4000);
  };

  const fetchAll = async () => {
    const [{ data:b },{ data:f },{ data:s },{ data:c },{ data:co },{ data:t }] = await Promise.all([
      supabase.from('bookings').select('*,courts(name,type)').gte('start_time',`${today}T00:00:00`).lte('start_time',`${today}T23:59:59`).in('status',['confirmed','checked-in','pending']).order('start_time'),
      supabase.from('food_orders').select('*').gte('created_at',`${today}T00:00:00`).not('status','eq','cancelled').order('created_at',{ascending:false}),
      supabase.from('shop_orders').select('*,products(name)').gte('created_at',`${today}T00:00:00`).not('status','eq','cancelled').order('created_at',{ascending:false}),
      supabase.from('coaching_sessions').select('*,coaches(name)').gte('session_time',`${today}T00:00:00`).lte('session_time',`${today}T23:59:59`).order('session_time'),
      supabase.from('courts').select('*').order('name'),
      supabase.from('tournaments').select('*').in('status',['ongoing','completed']).order('date',{ascending:false}).limit(20),
    ]);
    setBookings(b||[]); setFoodOrders(f||[]); setShopOrders(s||[]);
    setSessions(c||[]); setCourts(co||[]); setTournaments(t||[]);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUserEmail(user.email || '');

      const [{ data: adminData }, { data: empData }] = await Promise.all([
        supabase.from('admins').select('email').eq('email', user.email).single(),
        supabase.from('employees').select('name,role').eq('email', user.email).single(),
      ]);

      if (!empData && !adminData) { window.location.href = '/dashboard'; return; }
      setIsEmployee(true);
      setEmployeeName(empData?.name || user.email || (adminData ? 'Admin' : 'Employee'));

      await fetchAll();
      setLoading(false);
    };
    init();

    // ── REALTIME ──
    const channel = supabase.channel('employee-notifs')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bookings' }, () => {
        pushNotif({ type:'booking', title:'New Court Booking', body:'A court was just booked' });
        fetchAll();
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'food_orders' }, () => {
        pushNotif({ type:'food', title:'New Food Order', body:'A new food order was placed' });
        fetchAll();
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'shop_orders' }, () => {
        pushNotif({ type:'shop', title:'New Shop Order', body:'A new shop order was placed' });
        fetchAll();
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'coaching_sessions' }, () => {
        pushNotif({ type:'coaching', title:'New Coaching Session', body:'A coaching session was booked' });
        fetchAll();
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'tournament_registrations' }, () => {
        pushNotif({ type:'tournament', title:'Tournament Registration', body:'Someone registered for a tournament' });
        fetchAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── STATUS UPDATERS ──
  const updateBookingStatus = async (id: string, status: string) => { await supabase.from('bookings').update({ status }).eq('id', id); await fetchAll(); toast(`Booking ${status}`); };
  const updateFoodStatus    = async (id: string, status: string) => { await supabase.from('food_orders').update({ status }).eq('id', id); await fetchAll(); toast(`Food order ${status}`); };
  const updateShopStatus    = async (id: string, status: string) => { await supabase.from('shop_orders').update({ status }).eq('id', id); await fetchAll(); toast(`Shop order ${status}`); };
  const updateCoachStatus   = async (id: string, status: string) => { await supabase.from('coaching_sessions').update({ status }).eq('id', id); await fetchAll(); toast(`Session ${status}`); };
  const toggleCourt         = async (id: string, current: boolean) => { await supabase.from('courts').update({ is_available: !current }).eq('id', id); await fetchAll(); toast(current ? 'Court closed' : 'Court opened'); };

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (loading) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14 }}>Verifying access...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!isEmployee) return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab bookings={bookings} foodOrders={foodOrders} shopOrders={shopOrders} sessions={sessions} courts={courts} setActiveTab={setActiveTab} />;
      case 'bookings':    return <BookingsTab bookings={bookings} onUpdate={updateBookingStatus} />;
      case 'food':        return <FoodTab foodOrders={foodOrders} onUpdate={updateFoodStatus} />;
      case 'shop':        return <ShopTab shopOrders={shopOrders} onUpdate={updateShopStatus} />;
      case 'coaching':    return <CoachingTab sessions={sessions} onUpdate={updateCoachStatus} />;
      case 'courts':      return <CourtsTab courts={courts} onToggle={toggleCourt} />;
      case 'tournaments': return <TournamentsTab tournaments={tournaments} />;
      default:            return null;
    }
  };

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}

        .sidebar{width:220px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;transition:transform .3s;}
        .emp-main{margin-left:220px;min-height:100vh;}
        @media(max-width:768px){
          .sidebar{display:none;}
          .sidebar.open{display:flex;}
          .emp-main{margin-left:0 !important;width:100% !important;}
          .mobile-topbar{display:flex !important;}
          .bottom-nav{display:flex !important;}
        }
        .nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;color:var(--text-muted);cursor:pointer;transition:all .2s;margin:1px 8px;text-transform:uppercase;letter-spacing:.04em;}
        .nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .nav-item.active{background:var(--accent-bg);color:var(--accent-light);}
        .toast{position:fixed;bottom:80px;right:24px;background:var(--accent);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;z-index:300;animation:fadeIn .2s ease both;letter-spacing:.04em;text-transform:uppercase;}
        .mobile-topbar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 16px;height:52px;align-items:center;justify-content:space-between;width:100%;}
        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;padding:0 4px;}
        .bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;cursor:pointer;flex:1;border:none;background:transparent;}
        .bnav-item.active .bnav-lbl{color:var(--accent);}
        .bnav-icon{font-size:16px;line-height:1;}
        .bnav-lbl{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}
        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;}
        .signout-btn:hover{border-color:var(--error-text);color:var(--error-text);}
      `}</style>

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding:'18px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--text-primary)' }}>
            <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }} />
            <span style={{ fontSize:17, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>PickleHub</span>
          </a>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:10, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4, fontFamily:"'Barlow',sans-serif" }}>Staff panel</div>
            <button onClick={() => setNotifOpen(o => !o)} aria-label="Notifications" style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:4, color:'var(--text-secondary)', fontSize:18, lineHeight:1 }}>
              🔔
              {unreadCount > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          </div>
        </div>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'var(--accent)', flexShrink:0 }}>
              {employeeName[0]?.toUpperCase() || 'E'}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{employeeName}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userEmail}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'8px 0' }}>
          <div style={{ padding:'8px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif" }}>
            {new Date().toLocaleDateString('en-PH', { weekday:'long', month:'short', day:'numeric' })}
          </div>
          {TABS.map(tab => (
            <div key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}>
              <span style={{ fontSize:14 }}>{tab.icon}</span>{tab.label}
            </div>
          ))}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <ThemeToggle />
          <a href="/dashboard" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:'var(--text-muted)', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.04em' }}>
            👤 Player dashboard
          </a>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* MOBILE TOPBAR */}
      <div className="mobile-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7, height:7, background:'var(--accent)', borderRadius:'50%' }} />
          <span style={{ fontSize:15, fontWeight:800, textTransform:'uppercase' }}>Staff</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <button onClick={() => setNotifOpen(o => !o)} aria-label="Notifications" style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color:'var(--text-primary)', fontSize:18, lineHeight:1, padding:4 }}>
            🔔{unreadCount > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu" style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', fontSize:20 }}>☰</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="emp-main">
        <div style={{ padding:'clamp(16px,3vw,28px) clamp(12px,3vw,28px) 80px' }}>
          {renderTab()}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="bottom-nav">
        {TABS.map(tab => (
          <button key={tab.id} className={`bnav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <span className="bnav-icon">{tab.icon}</span>
            <span className="bnav-lbl">{tab.label}</span>
          </button>
        ))}
      </div>

      {actionMsg && <div className="toast">{actionMsg}</div>}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:40 }} />}

      {/* NOTIFICATION DRAWER */}
      {notifOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={() => setNotifOpen(false)}>
          <div style={{ position:'absolute', top:0, right:0, bottom:0, width:'clamp(300px,35vw,420px)', background:'var(--card-bg)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', animation:'slideIn .25s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'.04em' }}>
                Notifications {unreadCount > 0 && <span style={{ fontSize:11, background:'var(--accent)', color:'#fff', borderRadius:20, padding:'2px 8px', marginLeft:6 }}>{unreadCount} new</span>}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {unreadCount > 0 && <button onClick={() => setNotifs(n => n.map(x => ({ ...x, read:true })))} style={{ background:'none', border:'none', fontSize:11, color:'var(--accent)', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:'.04em', textTransform:'uppercase' }}>Mark all read</button>}
                <button onClick={() => setNotifOpen(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>×</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {notifs.length === 0
                ? <div style={{ padding:40, textAlign:'center', fontFamily:"'Barlow',sans-serif", fontSize:14, color:'var(--text-muted)' }}>No notifications yet</div>
                : notifs.map(n => (
                  <div key={n.id} onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read:true } : x))}
                    style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:n.read?'transparent':'var(--accent-bg)', transition:'background .2s', display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>
                      {n.type==='booking'?'📅':n.type==='food'?'🍱':n.type==='shop'?'🛍':n.type==='coaching'?'👤':'🏆'}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{n.title}</div>
                      <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', marginBottom:4 }}>{n.body}</div>
                      <div style={{ fontSize:11, color:'var(--text-hint)', fontFamily:"'Barlow',sans-serif" }}>{n.time.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                    {!n.read && <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%', flexShrink:0, marginTop:4 }} />}
                  </div>
                ))
              }
            </div>
            {notifs.length > 0 && (
              <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
                <button onClick={() => setNotifs([])} style={{ background:'none', border:'none', fontSize:11, color:'var(--error-text)', cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:'.04em', textTransform:'uppercase' }}>Clear all</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastNotif && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:300, background:'var(--card-bg)', border:'1px solid var(--accent-border)', borderRadius:12, padding:'14px 18px', maxWidth:320, boxShadow:'0 8px 32px rgba(0,0,0,.3)', animation:'slideUp .3s ease', display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:22, flexShrink:0 }}>
            {toastNotif.type==='booking'?'📅':toastNotif.type==='food'?'🍱':toastNotif.type==='shop'?'🛍':toastNotif.type==='coaching'?'👤':'🏆'}
          </span>
          <div>
            <div style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>{toastNotif.title}</div>
            <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-secondary)' }}>{toastNotif.body}</div>
          </div>
          <button onClick={() => setToastNotif(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, lineHeight:1, flexShrink:0, marginLeft:4 }}>×</button>
        </div>
      )}
    </div>
  );
}