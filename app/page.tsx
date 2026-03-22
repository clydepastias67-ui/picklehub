'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email, full_name: data.user.user_metadata?.full_name });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ email: session.user.email, full_name: session.user.user_metadata?.full_name });
      else setUser(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <main style={{ fontFamily: "'Barlow Condensed', sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.7} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes countUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .nav-link { color:var(--text-muted); font-size:13px; font-family:'Barlow',sans-serif; font-weight:500; letter-spacing:.04em; text-decoration:none; transition:color .2s; }
        .nav-link:hover { color:var(--text-primary); }

        .hero-tag { display:inline-flex; align-items:center; gap:6px; background:var(--accent-bg); border:1px solid var(--accent-border); color:var(--accent-light); font-size:11px; font-family:'Barlow',sans-serif; letter-spacing:.1em; text-transform:uppercase; padding:5px 12px; border-radius:20px; margin-bottom:24px; animation:fadeIn .5s ease both; }
        .hero-tag-dot { width:6px; height:6px; background:var(--accent-light); border-radius:50%; animation:pulse-dot 2s ease infinite; }

        .hero-title { font-size:clamp(56px,10vw,120px); font-weight:800; line-height:.9; letter-spacing:-.02em; text-transform:uppercase; animation:fadeUp .7s .1s ease both; }
        .hero-title .accent { color:var(--accent); }
        .hero-title .outline { -webkit-text-stroke:2px var(--text-primary); color:transparent; }

        .hero-sub { font-family:'Barlow',sans-serif; font-size:16px; color:var(--text-muted); max-width:420px; line-height:1.7; animation:fadeUp .7s .2s ease both; }

        .btn-primary { display:inline-flex; align-items:center; gap:8px; background:var(--accent); color:#fff; border:none; padding:14px 28px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; transition:background .2s,transform .15s; text-decoration:none; }
        .btn-primary:hover { background:var(--accent-hover); transform:translateY(-2px); }

        .btn-outline { display:inline-flex; align-items:center; gap:8px; background:transparent; color:var(--text-primary); border:1px solid var(--border-hover); padding:14px 28px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; transition:border-color .2s,background .2s,transform .15s; text-decoration:none; }
        .btn-outline:hover { border-color:var(--accent); background:var(--accent-bg); transform:translateY(-2px); }

        .stat-card { border-top:1px solid var(--border); padding:28px 0; animation:countUp .6s ease both; }
        .stat-num { font-size:48px; font-weight:800; letter-spacing:-.02em; color:var(--accent); line-height:1; }
        .stat-label { font-family:'Barlow',sans-serif; font-size:13px; color:var(--text-muted); margin-top:4px; letter-spacing:.04em; }

        .feat-card { background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:28px 24px; transition:border-color .25s,transform .25s; text-decoration:none; color:var(--text-primary); display:block; }
        .feat-card:hover { border-color:var(--accent); transform:translateY(-4px); }
        .feat-icon { width:44px; height:44px; background:var(--accent-bg); border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
        .feat-title { font-size:20px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; margin-bottom:8px; }
        .feat-desc { font-family:'Barlow',sans-serif; font-size:14px; color:var(--text-muted); line-height:1.6; }

        .section-tag { font-size:11px; font-family:'Barlow',sans-serif; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:12px; }
        .section-title { font-size:clamp(36px,5vw,56px); font-weight:800; letter-spacing:-.01em; text-transform:uppercase; line-height:1; margin-bottom:16px; }
        .section-sub { font-family:'Barlow',sans-serif; font-size:15px; color:var(--text-muted); max-width:480px; line-height:1.7; }

        .step-num { font-size:72px; font-weight:800; color:var(--bg-hover); line-height:1; margin-bottom:16px; -webkit-text-stroke:1px var(--border-hover); }
        .step-title { font-size:22px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; margin-bottom:8px; }
        .step-desc { font-family:'Barlow',sans-serif; font-size:14px; color:var(--text-muted); line-height:1.6; }

        .review-card { background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:24px; }
        .review-stars { color:var(--accent); font-size:14px; margin-bottom:12px; letter-spacing:2px; }
        .review-text { font-family:'Barlow',sans-serif; font-size:14px; color:var(--text-secondary); line-height:1.7; margin-bottom:16px; }
        .review-author { font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .review-role { font-family:'Barlow',sans-serif; font-size:12px; color:var(--text-muted); margin-top:2px; }

        .cta-section { background:var(--accent); border-radius:16px; padding:64px 48px; text-align:center; margin:0 24px 80px; }
        .cta-title { font-size:clamp(40px,6vw,72px); font-weight:800; text-transform:uppercase; letter-spacing:-.02em; line-height:.95; margin-bottom:16px; color:#fff; }
        .cta-sub { font-family:'Barlow',sans-serif; font-size:15px; color:rgba(255,255,255,.7); margin-bottom:32px; }
        .btn-dark { display:inline-flex; align-items:center; gap:8px; background:var(--bg-primary); color:var(--text-primary); border:none; padding:14px 32px; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; transition:background .2s,transform .15s; text-decoration:none; }
        .btn-dark:hover { transform:translateY(-2px); }

        .user-badge { display:flex; align-items:center; gap:8px; font-family:'Barlow',sans-serif; font-size:13px; color:var(--text-secondary); }
        .user-avatar { width:28px; height:28px; background:var(--accent); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#fff; text-transform:uppercase; }
        .signout-btn { background:transparent; border:1px solid var(--border-hover); color:var(--text-muted); font-family:'Barlow',sans-serif; font-size:12px; padding:5px 12px; border-radius:6px; cursor:pointer; transition:all .2s; }
        .signout-btn:hover { border-color:var(--accent); color:var(--text-primary); }

        footer { border-top:1px solid var(--border); padding:40px 48px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
        .footer-logo { font-size:20px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; display:flex; align-items:center; gap:8px; }
        .footer-links { display:flex; gap:24px; flex-wrap:wrap; }
        .footer-link { font-family:'Barlow',sans-serif; font-size:13px; color:var(--text-muted); text-decoration:none; transition:color .2s; }
        .footer-link:hover { color:var(--text-primary); }
        .footer-copy { font-family:'Barlow',sans-serif; font-size:12px; color:var(--text-hint); width:100%; text-align:center; margin-top:16px; border-top:1px solid var(--border); padding-top:20px; }

        .mobile-menu { position:absolute; top:64px; left:0; right:0; background:var(--nav-bg); border-bottom:1px solid var(--border); padding:20px 24px; display:flex; flex-direction:column; gap:16px; z-index:99; animation:slideIn .2s ease both; }

        @media (max-width:768px) {
          .hero-title { font-size:64px; }
          .cta-section { padding:40px 24px; margin:0 16px 60px; }
          footer { padding:32px 24px; flex-direction:column; text-align:center; }
          .footer-links { justify-content:center; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:scrolled ? 'var(--nav-bg)' : 'transparent', backdropFilter:scrolled ? 'blur(12px)' : 'none', borderBottom:scrolled ? '1px solid var(--border)' : '1px solid transparent', transition:'all .3s', padding:'0 48px', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, background:'var(--accent)', borderRadius:'50%', animation:'pulse-dot 2s ease infinite' }} />
          <span style={{ fontSize:20, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>PickleHub</span>
        </div>
        <div style={{ display:'flex', gap:32, alignItems:'center' }}>
          {['Courts','Coaching','Tournaments','Shop','Food'].map(item => (
            <a key={item} href={`/${item.toLowerCase()}`} className="nav-link">{item}</a>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <ThemeToggle />
          {user ? (
            <>
              <div className="user-badge">
                <div className="user-avatar">{(user.full_name || user.email || 'U')[0].toUpperCase()}</div>
                <span>{user.full_name || user.email}</span>
              </div>
              <a href="/dashboard" className="btn-primary" style={{ padding:'8px 16px', fontSize:13 }}>Dashboard</a>
              <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <a href="/login" className="nav-link">Sign in</a>
              <a href="/login" className="btn-primary" style={{ padding:'10px 20px', fontSize:13 }}>Book now</a>
            </>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', display:'flex', flexDirection:'column', gap:5, padding:4 }} aria-label="Menu">
            {[0,1,2].map(i => (
              <span key={i} style={{ display:'block', width:22, height:1.5, background:menuOpen && i===1 ? 'transparent' : 'var(--text-primary)', transition:'all .2s', transform:menuOpen ? (i===0 ? 'rotate(45deg) translateY(6.5px)' : i===2 ? 'rotate(-45deg) translateY(-6.5px)' : '') : '' }} />
            ))}
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            {['Courts','Coaching','Tournaments','Shop','Food & drinks'].map(item => (
              <a key={item} href={`/${item.toLowerCase().replace(' & ','-')}`} className="nav-link" style={{ fontSize:16 }} onClick={() => setMenuOpen(false)}>{item}</a>
            ))}
            {user ? <button className="signout-btn" onClick={handleSignOut}>Sign out</button> : <a href="/login" className="nav-link" style={{ fontSize:16 }}>Sign in</a>}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight:'92vh', display:'flex', flexDirection:'column', justifyContent:'center', padding:'80px 48px 60px', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundImage:'radial-gradient(circle at 70% 40%, var(--accent-bg) 0%, transparent 60%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'20%', right:'8%', width:320, height:320, border:'1px solid var(--border)', borderRadius:'50%', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'25%', right:'10%', width:200, height:200, border:'1px solid var(--border)', borderRadius:'50%', pointerEvents:'none' }} />
        <div className="hero-tag"><div className="hero-tag-dot" />{user ? `Welcome back, ${user.full_name || 'Player'}!` : 'Now open for bookings'}</div>
        <h1 className="hero-title">Pick up.<br /><span className="outline">Play hard.</span><br /><span className="accent">Win big.</span></h1>
        <p className="hero-sub" style={{ marginTop:28, marginBottom:36 }}>The all-in-one pickleball hub — book courts, hire coaches, rent gear, order food, and join tournaments. All in one place.</p>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', animation:'fadeUp .7s .3s ease both' }}>
          <a href="/courts" className="btn-primary">Book a court <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          {user ? <a href="/dashboard" className="btn-outline">Go to dashboard</a> : <a href="/courts" className="btn-outline">View schedule</a>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, marginTop:72, maxWidth:480, animation:'fadeUp .7s .4s ease both' }}>
          {[{num:'12',label:'Courts available'},{num:'8',label:'Certified coaches'},{num:'24/7',label:'Online booking'}].map((s,i) => (
            <div key={i} className="stat-card" style={{ paddingRight:24, animationDelay:`${0.4+i*0.1}s` }}>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding:'80px 48px' }}>
        <div style={{ marginBottom:48 }}>
          <div className="section-tag">Everything you need</div>
          <h2 className="section-title">One hub.<br />All the action.</h2>
          <p className="section-sub">From booking your first court to hosting a tournament — PickleHub has you covered.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
          {[
            { icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="18" height="18" rx="3" stroke="var(--accent)" strokeWidth="1.5"/><path d="M11 6v10M6 11h10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>, title:'Court booking', desc:'Real-time availability. Instant confirmation. No phone calls needed.', href:'/courts' },
            { icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8" r="4" stroke="var(--accent)" strokeWidth="1.5"/><path d="M4 20c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>, title:'Coaching', desc:'Book certified coaches by skill level — beginner to advanced.', href:'/coaching' },
            { icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3l2 5h5l-4 3 1.5 5L11 13l-4.5 3 1.5-5-4-3h5L11 3z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>, title:'Tournaments', desc:'Register, compete, and track live brackets and leaderboards.', href:'/tournaments' },
            { icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 6h16M3 11h16M3 16h10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>, title:'Food & drinks', desc:'Order snacks and drinks delivered straight to your court.', href:'/food' },
            { icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="8" width="16" height="11" rx="2" stroke="var(--accent)" strokeWidth="1.5"/><path d="M8 8V6a3 3 0 016 0v2" stroke="var(--accent)" strokeWidth="1.5"/></svg>, title:'Shop & rentals', desc:'Rent rackets or buy gear — balls, shoes, apparel and more.', href:'/shop' },
            { icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="2" stroke="var(--accent)" strokeWidth="1.5"/><path d="M7 10h8M7 14h5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>, title:'Admin dashboard', desc:'Manage bookings, revenue, inventory and coaching in one place.', href:'/dashboard' },
          ].map((f,i) => (
            <a key={i} href={f.href} className="feat-card" style={{ animationDelay:`${i*0.08}s` }}>
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </a>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding:'80px 48px', borderTop:'1px solid var(--border)' }}>
        <div style={{ marginBottom:56 }}>
          <div className="section-tag">Simple process</div>
          <h2 className="section-title">How it works</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:40 }}>
          {[
            {num:'01',title:'Find a court',desc:'Browse available courts by date, time, and type. See live availability instantly.'},
            {num:'02',title:'Book & pay',desc:'Reserve your slot and pay securely via GCash, Maya, or card through PayMongo.'},
            {num:'03',title:'Get notified',desc:'Receive instant confirmation. Add extras like coaching, gear rentals, or food orders.'},
            {num:'04',title:'Play & enjoy',desc:'Show up, scan your booking, and play. Rate your experience after.'},
          ].map((s,i) => (
            <div key={i} style={{ borderTop:'1px solid var(--border)', paddingTop:24 }}>
              <div className="step-num">{s.num}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section style={{ padding:'80px 48px', borderTop:'1px solid var(--border)' }}>
        <div style={{ marginBottom:48 }}>
          <div className="section-tag">What players say</div>
          <h2 className="section-title">Loved by the community</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
          {[
            {stars:'★★★★★',text:'Booking a court used to take multiple calls. Now I do it in 30 seconds. Game changer.',name:'Juan dela Cruz',role:'Regular player'},
            {stars:'★★★★★',text:'I love that I can order food mid-session without leaving the court. The GCash payment is seamless.',name:'Maria Santos',role:'Club member'},
            {stars:'★★★★★',text:'Managing our facility used to be chaos. The admin dashboard gave us full control overnight.',name:'Paolo Reyes',role:'Court owner'},
          ].map((r,i) => (
            <div key={i} className="review-card">
              <div className="review-stars">{r.stars}</div>
              <p className="review-text">&ldquo;{r.text}&rdquo;</p>
              <div className="review-author">{r.name}</div>
              <div className="review-role">{r.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section">
        <h2 className="cta-title">Ready to play?</h2>
        <p className="cta-sub">{user ? "You're logged in — head to your dashboard or book a court now." : 'Join hundreds of players already booking through PickleHub.'}</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          {user ? (
            <><a href="/courts" className="btn-dark">Book a court</a><a href="/dashboard" className="btn-outline" style={{ borderColor:'rgba(255,255,255,.3)', color:'#fff' }}>Go to dashboard</a></>
          ) : (
            <><a href="/login" className="btn-dark">Create free account</a><a href="/courts" className="btn-outline" style={{ borderColor:'rgba(255,255,255,.3)', color:'#fff' }}>Browse courts</a></>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo"><div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }} />PickleHub</div>
        <div className="footer-links">
          {['Courts','Coaching','Tournaments','Shop','Food & drinks','Admin'].map(l => (
            <a key={l} href={`/${l.toLowerCase().replace(' & ','-').replace(' ','-')}`} className="footer-link">{l}</a>
          ))}
        </div>
        <div className="footer-copy">© 2026 PickleHub · Built with Next.js & Supabase · Payments by PayMongo</div>
      </footer>
    </main>
  );
}