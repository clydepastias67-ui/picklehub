'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';
import OverviewTab    from './components/OverviewTab';
import BookingsTab    from './components/BookingsTab';
import CoachingTab    from './components/CoachingTab';
import TournamentsTab from './components/TournamentsTab';
import QuickLinksTab  from './components/QuickLinksTab';
import type { Booking, CoachingSession, Tournament } from './components/types';

const TABS = [
  { id:'overview',    label:'Overview',    icon:'📊' },
  { id:'bookings',    label:'Bookings',    icon:'📅' },
  { id:'coaching',    label:'Coaching',    icon:'👤' },
  { id:'tournaments', label:'Tournaments', icon:'🏆' },
  { id:'links',       label:'Quick links', icon:'🔗' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [loading, setLoading]         = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail]     = useState('');
  const [userName, setUserName]       = useState('');

  // ── DATA ──
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [sessions, setSessions]       = useState<CoachingSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player');

      const [{ data:b }, { data:s }, { data:t }] = await Promise.all([
        supabase.from('bookings').select('*,courts(name,type)').eq('user_id', user.id).order('start_time', { ascending:false }),
        supabase.from('coaching_sessions').select('*,coaches(name,skill_level)').eq('user_id', user.id).order('session_time', { ascending:false }),
        supabase.from('tournament_registrations').select('*,tournaments(name,date,status,format)').eq('user_id', user.id).order('created_at', { ascending:false }),
      ]);

      setBookings(b || []);
      setSessions(s || []);
      setTournaments(t || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (loading) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14 }}>Loading your dashboard...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab bookings={bookings} sessions={sessions} setActiveTab={setActiveTab} />;
      case 'bookings':    return <BookingsTab bookings={bookings} />;
      case 'coaching':    return <CoachingTab sessions={sessions} />;
      case 'tournaments': return <TournamentsTab tournaments={tournaments} />;
      case 'links':       return <QuickLinksTab />;
      default:            return null;
    }
  };

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}

        .dash-sidebar{width:220px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;transition:transform .3s;overflow-y:auto;}
        .dash-main{margin-left:220px;min-height:100vh;}

        @media(max-width:768px){
          .dash-sidebar{transform:translateX(-100%);}
          .dash-sidebar.open{transform:translateX(0);animation:slideIn .25s ease;}
          .dash-main{margin-left:0 !important;}
          .dash-mobile-bar{display:flex !important;}
          .dash-bottom-nav{display:flex !important;}
        }

        .dash-nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;color:var(--text-muted);cursor:pointer;transition:all .2s;margin:1px 8px;text-transform:uppercase;letter-spacing:.04em;}
        .dash-nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .dash-nav-item.active{background:var(--accent-bg);color:var(--accent-light);}

        .dash-mobile-bar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 16px;height:52px;align-items:center;justify-content:space-between;width:100%;position:sticky;top:0;z-index:40;}
        .dash-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;padding:0 4px;}
        .dash-bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;cursor:pointer;flex:1;border:none;background:transparent;}
        .dash-bnav-item.active .dash-bnav-lbl{color:var(--accent);}
        .dash-bnav-icon{font-size:16px;line-height:1;}
        .dash-bnav-lbl{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;letter-spacing:.04em;text-transform:uppercase;}
        .signout-btn:hover{border-color:var(--error-text);color:var(--error-text);}
      `}</style>

      {/* SIDEBAR */}
      <div className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding:'18px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--text-primary)' }}>
            <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }} />
            <span style={{ fontSize:17, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>PickleHub</span>
          </a>
          <div style={{ fontSize:10, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4, fontFamily:"'Barlow',sans-serif" }}>Player dashboard</div>
        </div>

        {/* USER INFO */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', flexShrink:0 }}>
              {(userName[0] || userEmail[0] || 'P').toUpperCase()}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userName}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userEmail}</div>
            </div>
          </div>
        </div>

        {/* STATS SUMMARY */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, flexShrink:0 }}>
          {[
            { label:'Bookings', val: bookings.filter(b => b.status === 'confirmed').length },
            { label:'Sessions', val: sessions.length },
          ].map((s, i) => (
            <div key={i} style={{ background:'var(--bg-secondary)', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:18, fontWeight:800 }}>{s.val}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", textTransform:'uppercase', letterSpacing:'.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <nav style={{ flex:1, padding:'8px 0' }}>
          <div style={{ padding:'8px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif" }}>Menu</div>
          {TABS.map(tab => (
            <div key={tab.id} className={`dash-nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}>
              <span style={{ fontSize:14 }}>{tab.icon}</span>{tab.label}
            </div>
          ))}
        </nav>

        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <ThemeToggle />
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="dash-mobile-bar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7, height:7, background:'var(--accent)', borderRadius:'50%' }} />
          <span style={{ fontSize:15, fontWeight:800, textTransform:'uppercase' }}>Dashboard</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu" style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', fontSize:20 }}>☰</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="dash-main">
        <div style={{ maxWidth:720, margin:'0 auto', padding:'clamp(16px,3vw,32px) clamp(12px,3vw,28px) 80px' }}>
          {/* PAGE HEADER */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif", marginBottom:4 }}>
              {new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric' })}
            </div>
            <h1 style={{ fontSize:'clamp(22px,4vw,32px)', fontWeight:800, textTransform:'uppercase', lineHeight:1 }}>
              Hey, <span style={{ color:'var(--accent)' }}>{userName}</span>
            </h1>
          </div>
          {renderTab()}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="dash-bottom-nav">
        {TABS.map(tab => (
          <button key={tab.id} className={`dash-bnav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <span className="dash-bnav-icon">{tab.icon}</span>
            <span className="dash-bnav-lbl">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:40 }} />}
    </div>
  );
}