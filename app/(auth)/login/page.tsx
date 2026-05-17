'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('picklehub_email');
    if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      if (rememberMe) localStorage.setItem('picklehub_email', email);
      else localStorage.removeItem('picklehub_email');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error;
      setSuccess('Account created! Check your email to confirm your account.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <main style={{ fontFamily:"'Barlow Condensed', sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.6} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }

        .auth-wrap { display:grid; grid-template-columns:1fr 1fr; flex:1; }
        @media (max-width:768px) { .auth-wrap{grid-template-columns:1fr} .auth-left{display:none} }

        .auth-left { background:var(--sidebar-bg); padding:48px; display:flex; flex-direction:column; justify-content:space-between; border-right:1px solid var(--border); position:relative; overflow:hidden; }
        .auth-left-bg { position:absolute; inset:0; background:radial-gradient(circle at 30% 50%, var(--accent-bg) 0%, transparent 60%); pointer-events:none; }
        .circle { position:absolute; border-radius:50%; pointer-events:none; }

        .auth-logo { display:flex; align-items:center; gap:10px; font-size:20px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; text-decoration:none; color:var(--text-primary); animation:fadeIn .5s ease both; position:relative; z-index:1; }
        .logo-dot { width:10px; height:10px; background:var(--accent); border-radius:50%; animation:pulse-dot 2s ease infinite; }

        .auth-headline { animation:fadeUp .7s .1s ease both; position:relative; z-index:1; }
        .auth-tag { font-size:11px; font-family:'Barlow',sans-serif; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); margin-bottom:16px; }
        .auth-big { font-size:clamp(40px,5vw,64px); font-weight:800; line-height:.95; letter-spacing:-.02em; text-transform:uppercase; margin-bottom:28px; }
        .auth-big .outline { -webkit-text-stroke:1.5px var(--text-primary); color:transparent; }
        .auth-big .accent { color:var(--accent); }

        .auth-features { display:flex; flex-direction:column; gap:12px; }
        .auth-feature { display:flex; align-items:center; gap:12px; }
        .feat-check { width:20px; height:20px; background:var(--accent-bg); border:1px solid var(--accent-border); border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .feat-text { font-family:'Barlow',sans-serif; font-size:14px; color:var(--text-secondary); }

        .auth-stats { display:flex; gap:32px; border-top:1px solid var(--border); padding-top:24px; animation:fadeUp .7s .3s ease both; position:relative; z-index:1; }
        .stat-num { font-size:28px; font-weight:800; color:var(--accent); line-height:1; }
        .stat-label { font-family:'Barlow',sans-serif; font-size:12px; color:var(--text-muted); margin-top:2px; }

        .auth-right { background:var(--bg-primary); display:flex; align-items:center; justify-content:center; padding:48px 32px; }
        .form-wrap { width:100%; max-width:400px; animation:fadeUp .6s ease both; }
        .form-header { margin-bottom:28px; }
        .form-title { font-size:32px; font-weight:800; text-transform:uppercase; letter-spacing:-.01em; margin-bottom:6px; }
        .form-sub { font-family:'Barlow',sans-serif; font-size:14px; color:var(--text-muted); }

        .mode-toggle { display:flex; background:var(--bg-secondary); border:1px solid var(--border); border-radius:10px; padding:4px; margin-bottom:24px; }
        .mode-btn { flex:1; padding:10px; border:none; border-radius:8px; background:transparent; color:var(--text-muted); font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; transition:all .2s; }
        .mode-btn.active { background:var(--accent); color:#fff; }

        .alert { border-radius:8px; padding:12px 16px; font-family:'Barlow',sans-serif; font-size:13px; margin-bottom:16px; animation:fadeIn .3s ease both; }
        .alert-error { background:var(--error-bg); border:1px solid var(--error-border); color:var(--error-text); }
        .alert-success { background:var(--success-bg); border:1px solid var(--success-border); color:var(--success-text); }

        .field { margin-bottom:16px; }
        .field-label { font-family:'Barlow',sans-serif; font-size:11px; color:var(--text-muted); letter-spacing:.06em; text-transform:uppercase; margin-bottom:6px; display:block; }
        .field-wrap { position:relative; }
        .field-input { width:100%; height:48px; background:var(--input-bg); border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-family:'Barlow',sans-serif; font-size:15px; padding:0 16px; transition:border-color .2s; outline:none; }
        .field-input:focus { border-color:var(--accent); }
        .field-input::placeholder { color:var(--text-hint); }
        .field-input.padded { padding-right:48px; }

        .toggle-pw { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; transition:color .2s; padding:4px; }
        .toggle-pw:hover { color:var(--text-primary); }

        .forgot { display:block; text-align:right; font-family:'Barlow',sans-serif; font-size:12px; color:var(--accent); text-decoration:none; transition:color .2s; }
        .forgot:hover { color:var(--accent-light); }

        .remember-row { display:flex; align-items:center; justify-content:space-between; margin-top:16px; }
        .remember-label { display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
        .remember-box { width:18px; height:18px; background:var(--input-bg); border:1px solid var(--border-hover); border-radius:4px; display:flex; align-items:center; justify-content:center; transition:background .2s,border-color .2s; flex-shrink:0; }
        .remember-box.checked { background:var(--accent); border-color:var(--accent); }
        .remember-text { font-family:'Barlow',sans-serif; font-size:13px; color:var(--text-muted); }

        .submit-btn { width:100%; height:50px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; margin-top:20px; transition:background .2s,transform .15s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .submit-btn:hover:not(:disabled) { background:var(--accent-hover); transform:translateY(-2px); }
        .submit-btn:disabled { background:var(--bg-hover); color:var(--text-muted); cursor:not-allowed; }
        .submit-btn.loading { background:linear-gradient(90deg,var(--accent),var(--accent-light),var(--accent)); background-size:200% auto; animation:shimmer 1.5s linear infinite; }

        .switch-text { font-family:'Barlow',sans-serif; font-size:13px; color:var(--text-muted); text-align:center; margin-top:20px; }
        .switch-link { color:var(--accent); cursor:pointer; font-weight:500; transition:color .2s; }
        .switch-link:hover { color:var(--accent-light); }
        .terms { font-family:'Barlow',sans-serif; font-size:11px; color:var(--text-hint); text-align:center; margin-top:14px; line-height:1.6; }
        .terms a { color:var(--accent); text-decoration:none; }
      `}</style>

      {/* NAV */}
      <nav style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, padding:'20px 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/" className="auth-logo"><div className="logo-dot" />PickleHub</a>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <ThemeToggle />
          <a href="/" style={{ fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to home
          </a>
        </div>
      </nav>

      <div className="auth-wrap" style={{ flex:1, marginTop:64 }}>
        {/* LEFT */}
        <div className="auth-left">
          <div className="auth-left-bg" />
          <div className="circle" style={{ width:300, height:300, border:'1px solid var(--border)', top:'15%', right:-80 }} />
          <div className="circle" style={{ width:180, height:180, border:'1px solid var(--accent-border)', top:'20%', right:-40 }} />
          <a href="/" className="auth-logo"><div className="logo-dot" />PickleHub</a>
          <div className="auth-headline">
            <div className="auth-tag">Welcome to PickleHub</div>
            <div className="auth-big">Your game.<br /><span className="outline">Your courts.</span><br /><span className="accent">Your hub.</span></div>
            <div className="auth-features">
              {['Real-time court booking','GCash, Maya & card payments','Certified coaching sessions','Tournaments & leagues','Food delivered to your court'].map(f => (
                <div key={f} className="auth-feature">
                  <div className="feat-check"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                  <span className="feat-text">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="auth-stats">
            {[{num:'12',label:'Courts'},{num:'8',label:'Coaches'},{num:'500+',label:'Players'}].map(s => (
              <div key={s.label}><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-right">
          <div className="form-wrap">
            <div className="form-header">
              <div className="form-title">{mode === 'login' ? 'Sign in' : 'Create account'}</div>
              <div className="form-sub">{mode === 'login' ? 'Welcome back — enter your details to continue' : 'Join PickleHub and start playing today'}</div>
            </div>
            <div className="mode-toggle">
              <button className={`mode-btn ${mode==='login'?'active':''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign in</button>
              <button className={`mode-btn ${mode==='register'?'active':''}`} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <form onSubmit={mode==='login' ? handleLogin : handleRegister}>
              {mode === 'register' && (
                <div className="field">
                  <label className="field-label">Full name</label>
                  <div className="field-wrap"><input className="field-input" type="text" placeholder="Juan dela Cruz" value={name} onChange={e => setName(e.target.value)} required /></div>
                </div>
              )}
              <div className="field">
                <label className="field-label">Email address</label>
                <div className="field-wrap"><input className="field-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <div className="field-wrap">
                  <input className="field-input padded" type={showPassword?'text':'password'} placeholder={mode==='register'?'Min. 8 characters':'••••••••'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode==='register'?8:undefined} />
                  <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s2.8-5 7-5 7 5 7 5-2.8 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9s2.8-5 7-5 7 5 7 5-2.8 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3"/><circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>}
                  </button>
                </div>
              </div>
              {mode === 'login' && (
                <div className="remember-row">
                  <div className="remember-label" onClick={() => setRememberMe(!rememberMe)}>
                    <div className={`remember-box ${rememberMe?'checked':''}`}>{rememberMe && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                    <span className="remember-text">Remember me</span>
                  </div>
                  <a href="/forgot-password" className="forgot">Forgot password?</a>
                </div>
              )}
              <button type="submit" className={`submit-btn ${loading?'loading':''}`} disabled={loading}>
                {loading ? <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 1s linear infinite' }} />{mode==='login'?'Signing in...':'Creating account...'}</> : <>{mode==='login'?'Sign in':'Create account'}<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
              </button>
            </form>
            <div className="switch-text">
              {mode==='login' ? <>Don&apos;t have an account? <span className="switch-link" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register here</span></> : <>Already have an account? <span className="switch-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign in</span></>}
            </div>
            {mode==='register' && <div className="terms">By creating an account you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}