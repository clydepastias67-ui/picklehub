'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';
import type { Notif } from './components/types';

// ── LAZY-LOADED TAB COMPONENTS ──
// Each tab is only downloaded & rendered when the user navigates to it
const OverviewTab    = dynamic(() => import('./components/OverviewTab'));
const BookingsTab    = dynamic(() => import('./components/BookingsTab'));
const CourtsTab      = dynamic(() => import('./components/CourtsTab'));
const MenuTab        = dynamic(() => import('./components/MenuTab'));
const ShopTab        = dynamic(() => import('./components/ShopTab'));
const CoachingTab    = dynamic(() => import('./components/CoachingTab'));
const TournamentsTab = dynamic(() => import('./components/TournamentsTab'));
const AdminsTab      = dynamic(() => import('./components/AdminsTab'));
const EmployeesTab   = dynamic(() => import('./components/EmployeesTab'));

const TABS = [
  { id:'overview',    label:'Overview',      icon:'▦' },
  { id:'bookings',    label:'Bookings',      icon:'📅' },
  { id:'courts',      label:'Courts',        icon:'🏓' },
  { id:'menu',        label:'Food & drinks', icon:'🍱' },
  { id:'shop',        label:'Shop',          icon:'🛍' },
  { id:'coaching',    label:'Coaching',      icon:'👤' },
  { id:'tournaments', label:'Tournaments',   icon:'🏆' },
  { id:'admins',      label:'Admin users',   icon:'🔐' },
  { id:'employees',   label:'Employees',     icon:'👷' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [isAdmin, setIsAdmin]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail]     = useState('');
  const [actionMsg, setActionMsg]     = useState('');

  // ── NOTIFICATIONS ──
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [toastNotif, setToastNotif]   = useState<Notif|null>(null);
  const unreadCount = notifs.filter(n => !n.read).length;

  const supabase = createClient();

  const toast = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2500); };

  const pushNotif = (n: Omit<Notif, 'id'|'time'|'read'>) => {
    const notif: Notif = { ...n, id: crypto.randomUUID(), time: new Date(), read: false };
    setNotifs(prev => [notif, ...prev].slice(0, 50));
    setToastNotif(notif);
    setTimeout(() => setToastNotif(null), 4000);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUserEmail(user.email || '');
      const { data: adminData } = await supabase.from('admins').select('email').eq('email', user.email).single();
      if (!adminData) { window.location.href = '/dashboard'; return; }
      setIsAdmin(true);
      setLoading(false);
    };
    init();

    // ── REALTIME SUBSCRIPTIONS (notifications only — no fetchAll!) ──
    const channel = supabase.channel('admin-notifs')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bookings' }, () => {
        pushNotif({ type:'booking', title:'New Court Booking', body:'A court was just booked' });
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'food_orders' }, () => {
        pushNotif({ type:'food', title:'New Food Order', body:'A new food order was placed' });
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'shop_orders' }, () => {
        pushNotif({ type:'shop', title:'New Shop Order', body:'A new shop order was placed' });
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'coaching_sessions' }, () => {
        pushNotif({ type:'coaching', title:'New Coaching Session', body:'A coaching session was booked' });
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'tournament_registrations' }, () => {
        pushNotif({ type:'tournament', title:'Tournament Registration', body:'Someone registered for a tournament' });
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'products' }, payload => {
        const p = payload.new as { name:string; stock:number; low_stock_threshold?:number };
        const threshold = p.low_stock_threshold ?? 5;
        if (p.stock === 0) pushNotif({ type:'stock', title:'Out of Stock', body:`${p.name} is out of stock!` });
        else if (p.stock <= threshold) pushNotif({ type:'stock', title:'Low Stock Alert', body:`${p.name} only has ${p.stock} left` });
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'menu_items' }, payload => {
        const m = payload.new as { name:string; stock?:number };
        if ((m.stock ?? 99) === 0) pushNotif({ type:'stock', title:'Menu Item Out of Stock', body:`${m.name} is out of stock!` });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (loading) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }}/>
        <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14 }}>Verifying admin access...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!isAdmin) return null;

  // ── TAB RENDERER ──
  const renderTab = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab toast={toast} />;
      case 'bookings':    return <BookingsTab toast={toast} />;
      case 'courts':      return <CourtsTab toast={toast} />;
      case 'menu':        return <MenuTab toast={toast} />;
      case 'shop':        return <ShopTab toast={toast} />;
      case 'coaching':    return <CoachingTab toast={toast} />;
      case 'tournaments': return <TournamentsTab toast={toast} />;
      case 'admins':      return <AdminsTab toast={toast} userEmail={userEmail} />;
      case 'employees':   return <EmployeesTab toast={toast} />;
      default:            return null;
    }
  };

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}

        .sidebar{width:230px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;transition:transform .3s;overflow-y:auto;}
        .main{margin-left:230px;min-height:100vh;}
        @media(max-width:900px){
          .sidebar{display:none;}
          .sidebar.open{display:flex;transform:none;}
          .main{margin-left:0 !important;width:100% !important;}
          .mobile-bar{display:flex !important;}
          .admin-bottom-nav{display:flex !important;}
        }

        .nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;color:var(--text-muted);cursor:pointer;transition:all .2s;margin:1px 8px;text-transform:uppercase;letter-spacing:.04em;}
        .nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .nav-item.active{background:var(--accent-bg);color:var(--accent-light);}

        .toast{position:fixed;bottom:24px;right:24px;background:var(--accent);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;z-index:300;animation:fadeIn .2s ease both;letter-spacing:.04em;text-transform:uppercase;}

        .mobile-bar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 20px;height:52px;align-items:center;justify-content:space-between;width:100%;}

        .admin-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;padding:0 4px;}
        .abn-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;cursor:pointer;flex:1;border:none;background:transparent;transition:all .2s;}
        .abn-item.active .abn-label{color:var(--accent);}
        .abn-icon{font-size:16px;line-height:1;}
        .abn-label{font-size:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
        .signout-btn:hover{border-color:var(--error-text);color:var(--error-text);}
      `}</style>

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding:'18px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--text-primary)' }}>
            <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }}/>
            <span style={{ fontSize:17, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>Picklverse</span>
          </a>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:10, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4, fontFamily:"'Barlow',sans-serif" }}>Admin panel</div>
            <button onClick={() => setNotifOpen(o => !o)} title="Notifications" aria-label="Notifications" style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:4, color:'var(--text-secondary)', fontSize:18, lineHeight:1 }}>
              🔔
              {unreadCount > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow',sans-serif" }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          </div>
        </div>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>{userEmail[0]?.toUpperCase() || 'A'}</div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:12, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Admin</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userEmail}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:'8px 0' }}>
          <div style={{ padding:'8px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif" }}>Sections</div>
          {TABS.map(tab => (
            <div key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}>
              <span style={{ fontSize:14 }}>{tab.icon}</span>{tab.label}
            </div>
          ))}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <ThemeToggle />
          <div style={{ display:'flex', gap:8 }}>
            <a href="/dashboard" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:'var(--text-muted)', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.04em', transition:'all .2s' }}>
              👤 Player
            </a>
            <a href="/employee" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:'var(--text-muted)', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.04em', transition:'all .2s' }}>
              👷 Staff
            </a>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="mobile-bar">
        <span style={{ fontSize:15, fontWeight:800, textTransform:'uppercase' }}>Admin</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <button onClick={() => setNotifOpen(o => !o)} title="Notifications" aria-label="Notifications" style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color:'var(--text-primary)', fontSize:18, lineHeight:1, padding:4 }}>
            🔔{unreadCount > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow',sans-serif" }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu" aria-label="Toggle menu" style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', fontSize:20 }}>☰</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main">
        <div style={{ padding:'clamp(16px,3vw,28px) clamp(12px,3vw,28px) 80px' }}>
          {renderTab()}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="admin-bottom-nav">
        {[
          { id:'overview', icon:'▦', label:'Home' },
          { id:'bookings', icon:'📅', label:'Bookings' },
          { id:'courts',   icon:'🏓', label:'Courts' },
          { id:'menu',     icon:'🍱', label:'Menu' },
          { id:'admins',   icon:'🔐', label:'Admins' },
        ].map(item => (
          <button key={item.id} className={`abn-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
            <span className="abn-icon">{item.icon}</span>
            <span className="abn-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ACTION TOAST */}
      {actionMsg && <div className="toast">{actionMsg}</div>}

      {/* SIDEBAR OVERLAY (mobile) */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:40 }}/>}

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
                  <div key={n.id} onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read:true } : x))} style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:n.read ? 'transparent' : 'var(--accent-bg)', transition:'background .2s', display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>
                      {n.type==='booking'?'📅':n.type==='food'?'🍱':n.type==='shop'?'🛍':n.type==='coaching'?'👤':n.type==='tournament'?'🏆':'⚠️'}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{n.title}</div>
                      <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', marginBottom:4 }}>{n.body}</div>
                      <div style={{ fontSize:11, color:'var(--text-hint)', fontFamily:"'Barlow',sans-serif" }}>{n.time.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                    {!n.read && <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%', flexShrink:0, marginTop:4 }}/>}
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
            {toastNotif.type==='booking'?'📅':toastNotif.type==='food'?'🍱':toastNotif.type==='shop'?'🛍':toastNotif.type==='coaching'?'👤':toastNotif.type==='tournament'?'🏆':'⚠️'}
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