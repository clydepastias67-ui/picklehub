'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

type Booking = {
  id: string; status: string; total_price: number; start_time: string; end_time: string;
  courts?: { name: string; type: string };
  profiles?: { full_name: string; email: string };
  checked_in?: boolean;
};
type FoodOrder = {
  id: string; status: string; total_price: number; delivery_type: string; created_at: string;
  items: { name: string; qty: number; price: number }[];
};
type ShopOrder = {
  id: string; status: string; total_price: number; type: string; quantity: number; created_at: string;
  products?: { name: string };
};
type CoachingSession = {
  id: string; status: string; price: number; session_time: string;
  coaches?: { name: string };
};
type Court = { id: string; name: string; type: string; is_available: boolean; };
type TournamentMatch = {
  id: string; tournament_id: string; format: string; round: number; match_number: number;
  bracket: string; player1_name: string | null; player2_name: string | null;
  player1_score: number; player2_score: number; winner_id: string | null; status: string;
};
type Tournament = { id: string; name: string; format: string; status: string; date: string; };

const TABS = [
  { id: 'overview',  label: 'Today',      icon: '📊' },
  { id: 'bookings',  label: 'Bookings',   icon: '📅' },
  { id: 'food',      label: 'Food',       icon: '🍱' },
  { id: 'shop',      label: 'Shop',       icon: '🛍' },
  { id: 'coaching',  label: 'Coaching',   icon: '👤' },
  { id: 'courts',    label: 'Courts',     icon: '🏓' },
  { id: 'tournaments', label: 'Tournaments', icon: '🏆' },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [foodOrders, setFoodOrders] = useState<FoodOrder[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [actionMsg, setActionMsg] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [activeTournament, setActiveTournament] = useState<string | null>(null);

  // ── NOTIFICATIONS ──
  type Notif = { id:string; type:'booking'|'food'|'shop'|'coaching'|'tournament'; title:string; body:string; time:Date; read:boolean; };
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<Notif|null>(null);
  const unreadCount = notifs.filter(n => !n.read).length;

  const pushNotif = (n: Omit<Notif,'id'|'time'|'read'>) => {
    const notif:Notif = { ...n, id: crypto.randomUUID(), time: new Date(), read: false };
    setNotifs(prev => [notif, ...prev].slice(0, 50));
    setToastNotif(notif);
    setTimeout(() => setToastNotif(null), 4000);
  };

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUserEmail(user.email || '');

      // Check if user is an admin first — admins can access staff panel too
      const { data: adminData } = await supabase
        .from('admins')
        .select('email')
        .eq('email', user.email)
        .single();

      // Check if user is an employee
      const { data: empData } = await supabase
        .from('employees')
        .select('name, role')
        .eq('email', user.email)
        .single();

      // Allow access if admin OR employee — redirect otherwise
      if (!empData && !adminData) { window.location.href = '/dashboard'; return; }
      setIsEmployee(true);
      setEmployeeName(empData?.name || user.email || (adminData ? 'Admin' : 'Employee'));

      await fetchAll();
      setLoading(false);
    };
    init();

    // ── REALTIME SUBSCRIPTIONS ──
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

  const fetchAll = async () => {
    const [
      { data: bData },
      { data: fData },
      { data: sData },
      { data: cData },
      { data: courtData },
      { data: tData },
    ] = await Promise.all([
      // Today's bookings
      supabase.from('bookings').select('*, courts(name,type)')
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .in('status', ['confirmed', 'checked-in', 'pending'])
        .order('start_time'),
      // Today's food orders
      supabase.from('food_orders').select('*')
        .gte('created_at', `${today}T00:00:00`)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false }),
      // Today's shop orders
      supabase.from('shop_orders').select('*, products(name)')
        .gte('created_at', `${today}T00:00:00`)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false }),
      // Today's coaching sessions
      supabase.from('coaching_sessions').select('*, coaches(name)')
        .gte('session_time', `${today}T00:00:00`)
        .lte('session_time', `${today}T23:59:59`)
        .order('session_time'),
      // All courts
      supabase.from('courts').select('*').order('name'),
      // Ongoing tournaments
      supabase.from('tournaments').select('*').in('status', ['ongoing','completed']).order('date', {ascending: false}).limit(20),
    ]);

    setBookings(bData || []);
    setFoodOrders(fData || []);
    setShopOrders(sData || []);
    setSessions(cData || []);
    setCourts(courtData || []);
    setTournaments(tData || []);
  };

  const toast = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 2500); };

  // Fetch matches when tournaments tab is opened or tournament selected
  const fetchMatches = async (tournamentId: string) => {
    const { data } = await supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round').order('match_number');
    setMatches(prev => [...prev.filter(m => m.tournament_id !== tournamentId), ...(data || [])]);
  };

  useEffect(() => {
    if (activeTab === 'tournaments' && tournaments.length > 0) {
      const tid = activeTournament || tournaments[0]?.id;
      if (tid) { setActiveTournament(tid); fetchMatches(tid); }
    }
  }, [activeTab, activeTournament, tournaments]);

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    await fetchAll(); toast(`Booking ${status}`);
  };

  const updateFoodStatus = async (id: string, status: string) => {
    await supabase.from('food_orders').update({ status }).eq('id', id);
    await fetchAll(); toast(`Food order ${status}`);
  };

  const updateShopStatus = async (id: string, status: string) => {
    await supabase.from('shop_orders').update({ status }).eq('id', id);
    await fetchAll(); toast(`Shop order ${status}`);
  };

  const updateCoachStatus = async (id: string, status: string) => {
    await supabase.from('coaching_sessions').update({ status }).eq('id', id);
    await fetchAll(); toast(`Session ${status}`);
  };

  const toggleCourt = async (id: string, current: boolean) => {
    await supabase.from('courts').update({ is_available: !current }).eq('id', id);
    await fetchAll(); toast(current ? 'Court closed' : 'Court opened');
  };

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

  // Sales summary
  const todayRevenue = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.total_price || 0), 0)
    + foodOrders.filter(f => f.status === 'confirmed' || f.status === 'delivered').reduce((s, f) => s + (f.total_price || 0), 0)
    + shopOrders.filter(s => s.status === 'confirmed' || s.status === 'completed').reduce((s, o) => s + (o.total_price || 0), 0);

  if (loading) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14 }}>Verifying access...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!isEmployee) return null;

  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

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

        .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:18px;animation:fadeUp .4s ease both;}
        .stat-label{font-size:11px;font-family:'Barlow',sans-serif;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;}
        .stat-val{font-size:28px;font-weight:800;line-height:1;}

        .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;animation:fadeUp .4s ease both;margin-bottom:20px;}
        .tbl{width:100%;border-collapse:collapse;}
        .tbl th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:11px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-secondary);white-space:nowrap;}
        .tbl td{font-size:13px;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle;font-family:'Barlow',sans-serif;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tr:hover td{background:var(--bg-hover);}
        @media(max-width:768px){
          .tbl-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        }

        .badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
        .badge-confirmed,.badge-completed,.badge-delivered{background:var(--success-bg);color:var(--success-text);}
        .badge-pending{background:var(--warning-bg);color:var(--warning-text);}
        .badge-cancelled{background:var(--error-bg);color:var(--error-text);}
        .badge-preparing,.badge-ready{background:rgba(56,138,221,.15);color:#85B7EB;}
        .badge-checked-in{background:var(--accent-bg);color:var(--accent-light);}

        .btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
        .btn:hover{border-color:var(--accent);color:var(--accent);}
        .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
        .btn.primary:hover{background:var(--accent-hover);}
        .btn.success{background:var(--success-bg);color:var(--success-text);border-color:var(--success-border);}

        .toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s;position:relative;border:none;flex-shrink:0;}
        .toggle.on{background:var(--accent);}
        .toggle.off{background:var(--border-hover);}
        .toggle-dot{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;}
        .toggle.on .toggle-dot{left:18px;}
        .toggle.off .toggle-dot{left:2px;}

        .section-title{font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;margin-bottom:16px;}
        .toast{position:fixed;bottom:80px;right:24px;background:var(--accent);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;z-index:300;animation:fadeIn .2s ease both;letter-spacing:.04em;text-transform:uppercase;}

        .mobile-topbar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 16px;height:52px;align-items:center;justify-content:space-between;width:100%;}
        .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;padding:0 4px;}
        .bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;cursor:pointer;flex:1;border:none;background:transparent;}
        .bnav-item.active .bnav-lbl{color:var(--accent);}
        .bnav-icon{font-size:16px;line-height:1;}
        .bnav-lbl{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;}
        .signout-btn:hover{border-color:var(--error-text);color:var(--error-text);}
        .empty{text-align:center;padding:40px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
        .actions{display:flex;gap:6px;flex-wrap:wrap;}
        @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-primary)' }}>
            <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%' }} />
            <span style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PickleHub</span>
          </a>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4, fontFamily: "'Barlow',sans-serif" }}>Staff panel</div>
            <button onClick={() => setNotifOpen(o => !o)} title="Notifications" aria-label="Notifications" style={{ position:'relative', background:'none', border:'none', cursor:'pointer', padding:4, color:'var(--text-secondary)', fontSize:18, lineHeight:1 }}>
              🔔
              {unreadCount > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow',sans-serif" }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
              {employeeName[0]?.toUpperCase() || 'E'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employeeName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Barlow',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          <div style={{ padding: '8px 16px 4px', fontSize: 10, color: 'var(--text-hint)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Barlow',sans-serif" }}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          {TABS.map(tab => (
            <div key={tab.id} className={`nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}>
              <span style={{ fontSize: 14 }}>{tab.icon}</span>{tab.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <ThemeToggle />
          <a href="/dashboard" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'7px 8px', borderRadius:8, border:'1px solid var(--border)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:'var(--text-muted)', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.04em' }}>
            👤 Player dashboard
          </a>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* MOBILE TOPBAR */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, background: 'var(--accent)', borderRadius: '50%' }} />
          <span style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase' }}>Staff</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle />
          <button onClick={() => setNotifOpen(o => !o)} title="Notifications" aria-label="Notifications" style={{ position:'relative', background:'none', border:'none', cursor:'pointer', color:'var(--text-primary)', fontSize:18, lineHeight:1, padding:4 }}>
            🔔{unreadCount > 0 && <span style={{ position:'absolute', top:0, right:0, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:14, height:14, fontSize:8, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow',sans-serif" }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} title="Menu" aria-label="Menu" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 20 }}>☰</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="emp-main">
        <div style={{ padding: 'clamp(16px,3vw,28px) clamp(12px,3vw,28px) 80px' }}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Barlow',sans-serif", marginBottom: 4 }}>
                  {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, textTransform: 'uppercase' }}>
                  Today's <span style={{ color: 'var(--accent)' }}>summary</span>
                </h1>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Today's revenue", val: `₱${todayRevenue.toLocaleString()}`, sub: 'Confirmed only' },
                  { label: "Bookings", val: bookings.filter(b => b.status === 'confirmed').length, sub: 'confirmed today' },
                  { label: "Food orders", val: foodOrders.filter(f => ['confirmed','delivered','ready','preparing'].includes(f.status)).length, sub: `${foodOrders.filter(f => f.status === 'pending').length} pending` },
                  { label: "Shop orders", val: shopOrders.filter(o => ['confirmed','completed','ready','preparing'].includes(o.status)).length, sub: `${shopOrders.filter(s => s.status === 'pending').length} pending` },
                  { label: "Sessions", val: sessions.filter(s => ['confirmed','completed'].includes(s.status)).length, sub: `${sessions.filter(s => s.status === 'pending').length} pending` },
                  { label: "Courts open", val: courts.filter(c => c.is_available).length, sub: `of ${courts.length} total` },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val">{s.val}</div>
                    <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Pending actions */}
              <div className="table-wrap">
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>
                  Pending actions
                </div>
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bookings.filter(b => b.status === 'pending').length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning-text)' }}>
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--warning-text)' }}>
                        {bookings.filter(b => b.status === 'pending').length} booking{bookings.filter(b => b.status === 'pending').length > 1 ? 's' : ''} need confirmation
                      </span>
                      <button className="btn primary" onClick={() => setActiveTab('bookings')}>View</button>
                    </div>
                  )}
                  {foodOrders.filter(f => f.status === 'pending').length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning-text)' }}>
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--warning-text)' }}>
                        {foodOrders.filter(f => f.status === 'pending').length} food order{foodOrders.filter(f => f.status === 'pending').length > 1 ? 's' : ''} to prepare
                      </span>
                      <button className="btn primary" onClick={() => setActiveTab('food')}>View</button>
                    </div>
                  )}
                  {shopOrders.filter(s => s.status === 'pending').length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--warning-bg)', borderRadius: 8, border: '1px solid var(--warning-text)' }}>
                      <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--warning-text)' }}>
                        {shopOrders.filter(s => s.status === 'pending').length} shop order{shopOrders.filter(s => s.status === 'pending').length > 1 ? 's' : ''} to prepare
                      </span>
                      <button className="btn primary" onClick={() => setActiveTab('shop')}>View</button>
                    </div>
                  )}
                  {bookings.filter(b => b.status === 'pending').length === 0 && foodOrders.filter(f => f.status === 'pending').length === 0 && shopOrders.filter(s => s.status === 'pending').length === 0 && (
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--success-text)', textAlign: 'center', padding: '16px 0' }}>✓ All caught up! No pending actions.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {activeTab === 'bookings' && (
            <div>
              <h1 className="section-title">Today's bookings</h1>
              <div className="table-wrap">
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead><tr><th>Court</th><th>Time</th><th>Status</th><th>Amount</th><th>Actions</th></tr></thead>
                    <tbody>
                      {bookings.length === 0 ? <tr><td colSpan={5}><div className="empty">No bookings today</div></td></tr> :
                      bookings.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.courts?.name || '—'}</td>
                          <td>{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</td>
                          <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                          <td style={{ color: 'var(--accent)', fontWeight: 700 }}>₱{b.total_price?.toLocaleString()}</td>
                          <td>
                            <div className="actions">
                              {b.status === 'pending' && <button className="btn primary" onClick={() => updateBookingStatus(b.id, 'confirmed')}>Confirm</button>}
                              {b.status === 'confirmed' && <button className="btn success" onClick={() => updateBookingStatus(b.id, 'checked-in')}>Check in</button>}
                              {b.status !== 'cancelled' && b.status !== 'checked-in' && <button className="btn" style={{ borderColor: 'var(--error-border)', color: 'var(--error-text)' }} onClick={() => updateBookingStatus(b.id, 'cancelled')}>Cancel</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── FOOD ORDERS ── */}
          {activeTab === 'food' && (
            <div>
              <h1 className="section-title">Food orders</h1>
              <div className="table-wrap">
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead><tr><th>Time</th><th>Items</th><th>Delivery</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
                    <tbody>
                      {foodOrders.length === 0 ? <tr><td colSpan={6}><div className="empty">No food orders today</div></td></tr> :
                      foodOrders.map(f => (
                        <tr key={f.id}>
                          <td>{fmtTime(f.created_at)}</td>
                          <td style={{ maxWidth: 180 }}>
                            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {f.items?.map((i: { name: string; qty: number }) => `${i.name} x${i.qty}`).join(', ') || '—'}
                            </div>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{f.delivery_type || 'counter'}</td>
                          <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                          <td style={{ color: 'var(--accent)', fontWeight: 700 }}>₱{f.total_price?.toLocaleString()}</td>
                          <td>
                            <div className="actions">
                              {(f.status === 'pending' || f.status === 'confirmed') && <button className="btn primary" onClick={() => updateFoodStatus(f.id, 'preparing')}>Prepare</button>}
                              {f.status === 'preparing' && <button className="btn primary" onClick={() => updateFoodStatus(f.id, 'ready')}>
                                {f.delivery_type === 'court' ? 'Ready to deliver' : 'Ready for pickup'}
                              </button>}
                              {f.status === 'ready' && f.delivery_type === 'court' && <button className="btn success" onClick={() => updateFoodStatus(f.id, 'delivered')}>✓ Delivered</button>}
                              {f.status === 'ready' && f.delivery_type !== 'court' && <button className="btn success" onClick={() => updateFoodStatus(f.id, 'delivered')}>✓ Picked up</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SHOP ORDERS ── */}
          {activeTab === 'shop' && (
            <div>
              <h1 className="section-title">Shop orders</h1>
              <div className="table-wrap">
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead><tr><th>Time</th><th>Product</th><th>Type</th><th>Qty</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
                    <tbody>
                      {shopOrders.length === 0 ? <tr><td colSpan={7}><div className="empty">No shop orders today</div></td></tr> :
                      shopOrders.map(o => (
                        <tr key={o.id}>
                          <td>{fmtTime(o.created_at)}</td>
                          <td style={{ fontWeight: 600 }}>{o.products?.name || '—'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{o.type}</td>
                          <td>{o.quantity}</td>
                          <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                          <td style={{ color: 'var(--accent)', fontWeight: 700 }}>₱{o.total_price?.toLocaleString()}</td>
                          <td>
                            <div className="actions">
                              {(o.status === 'pending' || o.status === 'confirmed') && <button className="btn primary" onClick={() => updateShopStatus(o.id, 'preparing')}>Prepare</button>}
                              {o.status === 'preparing' && <button className="btn primary" onClick={() => updateShopStatus(o.id, 'ready')}>
                                {o.type === 'rental' ? 'Ready to rent' : 'Ready for pickup'}
                              </button>}
                              {o.status === 'ready' && <button className="btn success" onClick={() => updateShopStatus(o.id, 'completed')}>✓ {o.type === 'rental' ? 'Rented out' : 'Picked up'}</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── COACHING ── */}
          {activeTab === 'coaching' && (
            <div>
              <h1 className="section-title">Today's coaching sessions</h1>
              <div className="table-wrap">
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead><tr><th>Time</th><th>Coach</th><th>Status</th><th>Price</th><th>Actions</th></tr></thead>
                    <tbody>
                      {sessions.length === 0 ? <tr><td colSpan={5}><div className="empty">No coaching sessions today</div></td></tr> :
                      sessions.map(s => (
                        <tr key={s.id}>
                          <td>{fmtTime(s.session_time)}</td>
                          <td style={{ fontWeight: 600 }}>{s.coaches?.name || '—'}</td>
                          <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                          <td style={{ color: 'var(--accent)', fontWeight: 700 }}>₱{s.price?.toLocaleString()}</td>
                          <td>
                            <div className="actions">
                              {s.status === 'pending' && <button className="btn primary" onClick={() => updateCoachStatus(s.id, 'confirmed')}>Confirm</button>}
                              {s.status === 'confirmed' && <button className="btn success" onClick={() => updateCoachStatus(s.id, 'completed')}>Complete</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── COURTS ── */}
          {activeTab === 'courts' && (
            <div>
              <h1 className="section-title">Court availability</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                {courts.map((court, i) => (
                  <div key={court.id} style={{ background: 'var(--card-bg)', border: `1px solid ${court.is_available ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 12, padding: 18, animation: `fadeUp .4s ${i * 0.06}s ease both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{court.name}</div>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{court.type}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', background: court.is_available ? 'var(--success-bg)' : 'var(--error-bg)', color: court.is_available ? 'var(--success-text)' : 'var(--error-text)' }}>
                        {court.is_available ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <button className={`toggle ${court.is_available ? 'on' : 'off'}`} onClick={() => toggleCourt(court.id, court.is_available)} title="Toggle court" aria-label="Toggle court availability">
                      <div className="toggle-dot" />
                    </button>
                    <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                      {court.is_available ? 'Tap to close court' : 'Tap to open court'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* ── TOURNAMENTS ── */}
          {activeTab === 'tournaments' && (
            <div>
              <h1 className="section-title">Tournament Brackets</h1>
              {tournaments.length === 0 ? (
                <div className="table-wrap"><div className="empty">No tournaments yet</div></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Tournament selector */}
                  {tournaments.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {tournaments.map(t => (
                        <button key={t.id} onClick={() => { setActiveTournament(t.id); fetchMatches(t.id); }} style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${activeTournament === t.id ? 'var(--accent)' : 'var(--border)'}`, background: activeTournament === t.id ? 'var(--accent)' : 'transparent', color: activeTournament === t.id ? '#fff' : 'var(--text-muted)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.name}
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: t.status === 'completed' ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.15)', fontWeight: 800 }}>{t.status}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Bracket view */}
                  {(() => {
                    const tournament = tournaments.find(t => t.id === (activeTournament || tournaments[0]?.id));
                    if (!tournament) return null;
                    const tMatches = matches.filter(m => m.tournament_id === tournament.id);
                    const formatLabel: Record<string, string> = { single_elim: 'Single Elimination', double_elim: 'Double Elimination', round_robin: 'Round Robin' };

                    if (tournament.format === 'round_robin') {
                      // Round robin: flat list of all matches
                      return (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '.06em' }}>{tournament.name} · {formatLabel[tournament.format]}</div>
                          <div className="table-wrap">
                            <table className="tbl">
                              <thead><tr><th>#</th><th>Player 1</th><th>Score</th><th>Player 2</th><th>Status</th><th>Action</th></tr></thead>
                              <tbody>
                                {tMatches.length === 0 ? <tr><td colSpan={6}><div className="empty">No matches yet</div></td></tr> :
                                tMatches.map(m => (
                                  <tr key={m.id}>
                                    <td style={{ color: 'var(--text-muted)', fontFamily: "'Barlow',sans-serif" }}>{m.match_number}</td>
                                    <td style={{ fontWeight: 600 }}>{m.player1_name || 'TBD'}</td>
                                    <td style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: "'Barlow',sans-serif" }}>{m.player1_score} – {m.player2_score}</td>
                                    <td style={{ fontWeight: 600 }}>{m.player2_name || 'TBD'}</td>
                                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                                    <td>
                                      {m.status !== 'completed' && m.status !== 'bye' && (
                                        <button className="btn primary" onClick={() => window.location.href = `/scoreboard/${m.id}`}>▶ Score</button>
                                      )}
                                      {m.status === 'completed' && <span style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}>✓ Done</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }

                    // Single/Double elim: tree bracket view
                    const winnerMatches = tMatches.filter(m => m.bracket === 'winners' || m.bracket === 'grand_final');
                    const rounds = Array.from(new Set(winnerMatches.map(m => m.round))).sort((a,b) => a - b);
                    const totalRounds = rounds.length;

                    // Layout constants
                    const BOX_W = 160;
                    const BOX_H = 56; // two rows of 28px
                    const COL_GAP = 80;
                    const CHAMP_W = 110;
                    const CHAMP_H = 40;

                    // For each round, compute vertical spacing between match centers
                    // Round 1 matches are tightest; each subsequent round doubles the gap
                    const r1Matches = winnerMatches.filter(m => m.round === rounds[0]);
                    const R1_MATCH_GAP = BOX_H + 24; // gap between match boxes in round 1
                    const totalHeight = Math.max(300, r1Matches.length * (BOX_H + R1_MATCH_GAP) + R1_MATCH_GAP);

                    // Compute Y center of each match box
                    const matchY: Record<string, number> = {};
                    rounds.forEach((round, ri) => {
                      const roundMatches = winnerMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
                      const spacing = (BOX_H + R1_MATCH_GAP) * Math.pow(2, ri);
                      const startY = spacing / 2 - BOX_H / 2;
                      roundMatches.forEach((m, mi) => {
                        matchY[m.id] = startY + mi * spacing + BOX_H / 2;
                      });
                    });

                    const svgWidth = totalRounds * (BOX_W + COL_GAP) + COL_GAP + CHAMP_W + 40;
                    const svgHeight = totalHeight + 60;

                    // X position of each round column
                    const colX = (ri: number) => 20 + ri * (BOX_W + COL_GAP);

                    // Connector lines between rounds
                    const lines: { x1:number;y1:number;x2:number;y2:number;x3:number;y3:number;x4:number;y4:number }[] = [];
                    rounds.forEach((round, ri) => {
                      if (ri >= rounds.length - 1) return;
                      const roundMatches = winnerMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
                      for (let i = 0; i < roundMatches.length; i += 2) {
                        const mA = roundMatches[i];
                        const mB = roundMatches[i + 1];
                        if (!mA) continue;
                        const yA = matchY[mA.id];
                        const yB = mB ? matchY[mB.id] : yA;
                        const yMid = (yA + yB) / 2;
                        const x1 = colX(ri) + BOX_W;
                        const x2 = colX(ri) + BOX_W + COL_GAP / 2;
                        const x3 = colX(ri + 1);
                        lines.push({ x1, y1: yA, x2, y2: yA, x3: x2, y3: yMid, x4: x3, y4: yMid });
                        if (mB) lines.push({ x1, y1: yB, x2, y2: yB, x3: x2, y3: yMid, x4: x3, y4: yMid });
                      }
                    });

                    // Champion connector from last round
                    const lastRound = rounds[rounds.length - 1];
                    const finalMatch = winnerMatches.find(m => m.round === lastRound);
                    const champX = colX(totalRounds - 1) + BOX_W + COL_GAP / 2;
                    const champY = finalMatch ? matchY[finalMatch.id] : svgHeight / 2;

                    return (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '.06em' }}>{tournament.name} · {formatLabel[tournament.format]}</div>
                        <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 16 }}>
                          <svg width={svgWidth} height={svgHeight} style={{ fontFamily: "'Barlow Condensed',sans-serif", overflow: 'visible' }}>
                            {/* Round labels */}
                            {rounds.map((round, ri) => (
                              <text key={round} x={colX(ri) + BOX_W / 2} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-hint)" letterSpacing="0.08em" style={{ textTransform: 'uppercase' }}>
                                {ri === rounds.length - 1 ? 'FINAL' : `ROUND ${round}`}
                              </text>
                            ))}
                            <text x={colX(totalRounds - 1) + BOX_W + COL_GAP / 2 + CHAMP_W / 2 + 4} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em">CHAMPION</text>

                            {/* Connector lines */}
                            {lines.map((l, i) => (
                              <g key={i}>
                                <line x1={l.x1} y1={l.y1 + 28} x2={l.x2} y2={l.y2 + 28} stroke="var(--border)" strokeWidth={2}/>
                                <line x1={l.x2} y1={l.y2 + 28} x2={l.x3} y2={l.y3 + 28} stroke="var(--border)" strokeWidth={2}/>
                                <line x1={l.x3} y1={l.y3 + 28} x2={l.x4} y2={l.y4 + 28} stroke="var(--border)" strokeWidth={2}/>
                              </g>
                            ))}

                            {/* Champion connector line */}
                            {finalMatch && (
                              <line x1={colX(totalRounds-1)+BOX_W} y1={champY+28} x2={champX + CHAMP_W/2 + 4} y2={champY+28} stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3"/>
                            )}

                            {/* Champion box */}
                            <rect x={champX + 4} y={champY + 28 - CHAMP_H/2} width={CHAMP_W} height={CHAMP_H} rx={8} fill="var(--accent)" />
                            <text x={champX + 4 + CHAMP_W/2} y={champY + 28 + 5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff" letterSpacing="0.06em">
                              {finalMatch?.winner_id
                                ? (finalMatch.player1_score > finalMatch.player2_score ? finalMatch.player1_name : finalMatch.player2_name) || 'CHAMPION'
                                : 'CHAMPION'}
                            </text>

                            {/* Match boxes */}
                            {winnerMatches.map(m => {
                              const x = colX(rounds.indexOf(m.round));
                              const y = (matchY[m.id] || 0) + 28;
                              const isWinner1 = m.status === 'completed' && m.player1_score > m.player2_score;
                              const isWinner2 = m.status === 'completed' && m.player2_score > m.player1_score;
                              const borderColor = m.status === 'completed' ? '#4ade80' : m.status === 'ongoing' ? 'var(--accent)' : 'var(--border)';
                              return (
                                <g key={m.id} style={{ cursor: m.status !== 'completed' && m.status !== 'bye' && m.player1_name && m.player2_name ? 'pointer' : 'default' }}
                                  onClick={() => { if (m.status !== 'completed' && m.status !== 'bye' && m.player1_name && m.player2_name) window.location.href = `/scoreboard/${m.id}`; }}>
                                  {/* Box shadow */}
                                  <rect x={x+2} y={y-BOX_H/2+2} width={BOX_W} height={BOX_H} rx={8} fill="rgba(0,0,0,.15)"/>
                                  {/* Main box */}
                                  <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H} rx={8} fill="var(--card-bg)" stroke={borderColor} strokeWidth={1.5}/>
                                  {/* Divider */}
                                  <line x1={x} y1={y} x2={x+BOX_W} y2={y} stroke="var(--border)" strokeWidth={1}/>
                                  {/* Winner highlight */}
                                  {isWinner1 && <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                                  {isWinner2 && <rect x={x} y={y} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                                  {/* Player 1 */}
                                  <text x={x+10} y={y-9} fontSize={12} fontWeight={isWinner1 ? 800 : 500} fill={m.player1_name ? (isWinner1 ? '#4ade80' : 'var(--text-primary)') : 'var(--text-hint)'} clipPath={`url(#clip-${m.id}-1)`}>{m.player1_name || 'TBD'}</text>
                                  <text x={x+BOX_W-8} y={y-9} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status !== 'pending' ? m.player1_score : ''}</text>
                                  {/* Player 2 */}
                                  <text x={x+10} y={y+17} fontSize={12} fontWeight={isWinner2 ? 800 : 500} fill={m.player2_name ? (isWinner2 ? '#4ade80' : 'var(--text-primary)') : 'var(--text-hint)'} clipPath={`url(#clip-${m.id}-2)`}>{m.player2_name || 'TBD'}</text>
                                  <text x={x+BOX_W-8} y={y+17} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status !== 'pending' ? m.player2_score : ''}</text>
                                  {/* Clip paths for long names */}
                                  <defs>
                                    <clipPath id={`clip-${m.id}-1`}><rect x={x+10} y={y-BOX_H/2} width={BOX_W-40} height={BOX_H/2}/></clipPath>
                                    <clipPath id={`clip-${m.id}-2`}><rect x={x+10} y={y} width={BOX_W-40} height={BOX_H/2}/></clipPath>
                                  </defs>
                                  {/* ▶ play icon for active matches */}
                                  {m.status !== 'completed' && m.status !== 'bye' && m.player1_name && m.player2_name && (
                                    <text x={x+BOX_W/2} y={y+36} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--accent)" letterSpacing="0.06em">▶ TAP TO SCORE</text>
                                  )}
                                  {m.status === 'completed' && (
                                    <text x={x+BOX_W/2} y={y+36} textAnchor="middle" fontSize={9} fontWeight={700} fill="#4ade80" letterSpacing="0.06em">✓ DONE</text>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* Losers bracket for double elim — keep as table below */}
                        {tournament.format === 'double_elim' && tMatches.filter(m => m.bracket === 'losers').length > 0 && (
                          <div style={{ marginTop: 32 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Losers Bracket</div>
                            <div className="table-wrap">
                              <table className="tbl">
                                <thead><tr><th>Round</th><th>Player 1</th><th>Score</th><th>Player 2</th><th>Status</th><th>Action</th></tr></thead>
                                <tbody>
                                  {tMatches.filter(m => m.bracket === 'losers').map(m => (
                                    <tr key={m.id}>
                                      <td style={{ color: 'var(--text-muted)', fontFamily: "'Barlow',sans-serif" }}>R{m.round}</td>
                                      <td style={{ fontWeight: 600 }}>{m.player1_name || 'TBD'}</td>
                                      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{m.player1_score} – {m.player2_score}</td>
                                      <td style={{ fontWeight: 600 }}>{m.player2_name || 'TBD'}</td>
                                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                                      <td>{m.status !== 'completed' && m.status !== 'bye' && m.player1_name && m.player2_name && <button className="btn primary" onClick={() => window.location.href = `/scoreboard/${m.id}`}>▶ Score</button>}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* BOTTOM NAV - mobile */}
      <div className="bottom-nav">
        {TABS.map(tab => (
          <button key={tab.id} className={`bnav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <span className="bnav-icon">{tab.icon}</span>
            <span className="bnav-lbl">{tab.label}</span>
          </button>
        ))}
      </div>

      {actionMsg && <div className="toast">{actionMsg}</div>}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 40 }} />}

      {/* ── NOTIFICATION DRAWER ── */}
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
                      {n.type === 'booking' ? '📅' : n.type === 'food' ? '🍱' : n.type === 'shop' ? '🛍' : n.type === 'coaching' ? '👤' : '🏆'}
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

      {/* ── TOAST NOTIFICATION ── */}
      {toastNotif && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:300, background:'var(--card-bg)', border:'1px solid var(--accent-border)', borderRadius:12, padding:'14px 18px', maxWidth:320, boxShadow:'0 8px 32px rgba(0,0,0,.3)', animation:'slideUp .3s ease', display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:22, flexShrink:0 }}>
            {toastNotif.type === 'booking' ? '📅' : toastNotif.type === 'food' ? '🍱' : toastNotif.type === 'shop' ? '🛍' : toastNotif.type === 'coaching' ? '👤' : '🏆'}
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