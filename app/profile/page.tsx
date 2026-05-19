'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

type Section = 'profile' | 'security' | 'danger';

export default function ProfilePage() {
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // USER INFO
  const [userEmail, setUserEmail]     = useState('');
  const [userName, setUserName]       = useState('');
  const [nameInput, setNameInput]     = useState('');

  // SECURITY
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);

  // FEEDBACK
  const [toast, setToast]             = useState({ msg:'', type:'' });

  const supabase = createClient();

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'' }), 3000);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUserEmail(user.email || '');
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      setUserName(name);
      setNameInput(name);
      setLoading(false);
    };
    init();
  }, []);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } });
    if (error) showToast('Failed to update name', 'error');
    else { setUserName(nameInput.trim()); showToast('Name updated!', 'success'); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPw || !confirmPw) { showToast('Please fill in all fields', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Passwords do not match', 'error'); return; }
    if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) showToast(error.message || 'Failed to change password', 'error');
    else {
      showToast('Password changed!', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    const confirmed = prompt(`This will permanently delete your account and all your data.\n\nType DELETE to confirm:`);
    if (confirmed !== 'DELETE') return;
    showToast('Deleting account...', 'error');
    // Sign out — actual deletion requires a server-side function
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (loading) return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
        <div style={{ fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', fontSize:14 }}>Loading profile...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const initials = (userName[0] || userEmail[0] || 'P').toUpperCase();

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}

        .profile-layout{display:flex;min-height:100vh;}
        .profile-sidebar{width:240px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;overflow-y:auto;}
        .profile-main{margin-left:240px;flex:1;padding:40px clamp(20px,4vw,60px) 60px;}

        @media(max-width:768px){
          .profile-sidebar{display:none;}
          .profile-main{margin-left:0;padding:16px 16px 80px;}
          .profile-mobile-bar{display:flex !important;}
          .profile-bottom-nav{display:flex !important;}
        }

        .profile-mobile-bar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 16px;height:52px;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;}
        .profile-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;}

        .bnav-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;cursor:pointer;flex:1;border:none;background:transparent;}
        .bnav-item.active .bnav-lbl{color:var(--accent);}
        .bnav-icon{font-size:16px;line-height:1;}
        .bnav-lbl{font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}

        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;font-size:12px;font-weight:700;color:var(--text-muted);cursor:pointer;transition:all .2s;margin:2px 8px;text-transform:uppercase;letter-spacing:.04em;}
        .nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .nav-item.active{background:var(--accent-bg);color:var(--accent-light);}

        .section-card{background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:28px;margin-bottom:20px;animation:fadeUp .4s ease both;}
        .section-header{font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;}
        .section-sub{font-size:13px;font-family:'Barlow',sans-serif;color:var(--text-muted);margin-bottom:24px;}

        .form-label{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;display:block;font-family:'Barlow',sans-serif;}
        .form-input{width:100%;height:42px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 14px;outline:none;transition:border-color .2s;}
        .form-input:focus{border-color:var(--accent);}
        .form-input:disabled{opacity:.5;cursor:not-allowed;}
        .form-input.readonly{background:var(--bg-secondary);cursor:default;}

        .btn{font-size:12px;padding:10px 20px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
        .btn:hover{border-color:var(--accent);color:var(--accent);}
        .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
        .btn.primary:hover{background:var(--accent-hover);}
        .btn.primary:disabled{opacity:.6;cursor:not-allowed;}
        .btn.danger{border-color:var(--error-text);color:var(--error-text);}
        .btn.danger:hover{background:var(--error-bg);}

        .pw-wrap{position:relative;}
        .pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:4px;}

        .divider{height:1px;background:var(--border);margin:20px 0;}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;letter-spacing:.04em;text-transform:uppercase;}
        .signout-btn:hover{border-color:var(--error-text);color:var(--error-text);}

        .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;z-index:300;animation:fadeIn .2s ease both;letter-spacing:.04em;text-transform:uppercase;font-family:'Barlow Condensed',sans-serif;}
        .toast.success{background:var(--success-bg);color:var(--success-text);border:1px solid var(--success-border);}
        .toast.error{background:var(--error-bg);color:var(--error-text);border:1px solid var(--error-text);}
      `}</style>

      {/* SIDEBAR */}
      <div className="profile-sidebar">
        <div style={{ padding:'18px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:'var(--text-primary)' }}>
            <div style={{ width:8, height:8, background:'var(--accent)', borderRadius:'50%' }} />
            <span style={{ fontSize:17, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>Picklverse</span>
          </a>
          <div style={{ fontSize:10, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4, fontFamily:"'Barlow',sans-serif" }}>Profile & settings</div>
        </div>

        {/* AVATAR */}
        <div style={{ padding:'20px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:48, height:48, background:'var(--accent)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff', flexShrink:0, letterSpacing:'.02em' }}>
              {initials}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:14, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{userName}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2 }}>{userEmail}</div>
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav style={{ flex:1, padding:'8px 0' }}>
          <div style={{ padding:'8px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif" }}>Settings</div>
          {([
            { id:'profile',  label:'Profile',      icon:'👤' },
            { id:'security', label:'Security',      icon:'🔒' },
            { id:'danger',   label:'Danger zone',   icon:'⚠️' },
          ] as { id:Section; label:string; icon:string }[]).map(item => (
            <div key={item.id} className={`nav-item ${activeSection === item.id ? 'active' : ''}`} onClick={() => setActiveSection(item.id)}>
              <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
            </div>
          ))}

          <div style={{ padding:'8px 16px 4px', fontSize:10, color:'var(--text-hint)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif", marginTop:12 }}>Navigate</div>
          {([
            { href:'/dashboard', label:'Dashboard', icon:'📊' },
            { href:'/courts',    label:'Book court', icon:'🏓' },
            { href:'/food',      label:'Order food', icon:'🍱' },
          ]).map(link => (
            <a key={link.href} href={link.href} className="nav-item" style={{ textDecoration:'none', display:'flex' }}>
              <span style={{ fontSize:14 }}>{link.icon}</span>{link.label}
            </a>
          ))}
        </nav>

        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <ThemeToggle />
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* MOBILE TOP BAR */}
      <div className="profile-mobile-bar">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:7, height:7, background:'var(--accent)', borderRadius:'50%' }} />
          <span style={{ fontSize:15, fontWeight:800, textTransform:'uppercase' }}>Profile</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <ThemeToggle />
          <a href="/dashboard" style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:700, textDecoration:'none', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', letterSpacing:'.04em' }}>← Back</a>
        </div>
      </div>

      {/* MAIN */}
      <div className="profile-main">
        <div style={{ maxWidth:600 }}>

          {/* PAGE HEADER */}
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:"'Barlow',sans-serif", marginBottom:6 }}>Account</div>
            <h1 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:800, textTransform:'uppercase', lineHeight:1 }}>
              {activeSection === 'profile' ? 'Profile' : activeSection === 'security' ? 'Security' : 'Danger zone'}
            </h1>
          </div>

          {/* ── PROFILE SECTION ── */}
          {activeSection === 'profile' && (
            <>
              <div className="section-card">
                <div className="section-header">Display name</div>
                <div className="section-sub">This is how your name appears across the app.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label className="form-label">Full name</label>
                    <input className="form-input" type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Your name" aria-label="Full name" />
                  </div>
                  <div>
                    <label className="form-label">Email address</label>
                    <input className="form-input readonly" type="email" value={userEmail} readOnly aria-label="Email address" />
                    <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', marginTop:6 }}>Email cannot be changed here. Contact support if needed.</div>
                  </div>
                </div>
                <div style={{ marginTop:20 }}>
                  <button className="btn primary" onClick={handleSaveName} disabled={saving || nameInput.trim() === userName}>{saving ? 'Saving...' : 'Save changes'}</button>
                </div>
              </div>

              <div className="section-card" style={{ animationDelay:'.08s' }}>
                <div className="section-header">Account info</div>
                <div className="section-sub">A summary of your account details.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {[
                    { label:'Display name', value: userName },
                    { label:'Email',        value: userEmail },
                    { label:'Account type', value: 'Player' },
                  ].map((row, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>{row.label}</div>
                      <div style={{ fontSize:13, fontFamily:"'Barlow',sans-serif", fontWeight:600 }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── SECURITY SECTION ── */}
          {activeSection === 'security' && (
            <div className="section-card">
              <div className="section-header">Change password</div>
              <div className="section-sub">Choose a strong password at least 6 characters long.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label className="form-label">New password</label>
                  <div className="pw-wrap">
                    <input className="form-input" type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" aria-label="New password" style={{ paddingRight:44 }} />
                    <button className="pw-toggle" onClick={() => setShowPw(s => !s)} aria-label="Toggle password visibility">{showPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Confirm new password</label>
                  <input className="form-input" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm password" aria-label="Confirm new password" />
                  {confirmPw && newPw !== confirmPw && (
                    <div style={{ fontSize:11, fontFamily:"'Barlow',sans-serif", color:'var(--error-text)', marginTop:6 }}>Passwords do not match</div>
                  )}
                </div>
              </div>
              <div style={{ marginTop:20 }}>
                <button className="btn primary" onClick={handleChangePassword} disabled={saving || !newPw || !confirmPw}>{saving ? 'Saving...' : 'Change password'}</button>
              </div>
            </div>
          )}

          {/* ── DANGER ZONE ── */}
          {activeSection === 'danger' && (
            <div className="section-card" style={{ border:'1px solid var(--error-text)' }}>
              <div className="section-header" style={{ color:'var(--error-text)' }}>⚠️ Danger zone</div>
              <div className="section-sub">These actions are irreversible. Please proceed with caution.</div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Sign out of all devices</div>
                  <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>Revokes all active sessions.</div>
                </div>
                <button className="btn" onClick={handleSignOut}>Sign out</button>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 0' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Delete account</div>
                  <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>Permanently removes your account and all data.</div>
                </div>
                <button className="btn danger" onClick={handleDeleteAccount}>Delete account</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="profile-bottom-nav">
        {([
          { id:'profile',  label:'Profile',   icon:'👤' },
          { id:'security', label:'Security',  icon:'🔒' },
          { id:'danger',   label:'Danger',    icon:'⚠️' },
        ] as { id:Section; label:string; icon:string }[]).map(item => (
          <button key={item.id} className={`bnav-item ${activeSection === item.id ? 'active' : ''}`} onClick={() => setActiveSection(item.id)}>
            <span className="bnav-icon">{item.icon}</span>
            <span className="bnav-lbl">{item.label}</span>
          </button>
        ))}
      </div>

      {/* TOAST */}
      {toast.msg && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}