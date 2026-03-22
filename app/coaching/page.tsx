'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

type Coach = {
  id: string;
  name: string;
  bio: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  price_per_session: number;
  is_available: boolean;
  image_url?: string;
};

export default function CoachingPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id: user.id, email: user.email });
      const { data } = await supabase.from('coaches').select('*').eq('is_available', true).order('skill_level');
      setCoaches(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleBook = async () => {
    if (!selectedCoach || !sessionDate || !sessionTime || !user) return;
    setBooking(true); setError('');
    try {
      const supabase = createClient();
      const sessionDateTime = new Date(`${sessionDate}T${sessionTime}:00`);
      const { error } = await supabase.from('coaching_sessions').insert({
        coach_id: selectedCoach.id,
        user_id: user.id,
        session_time: sessionDateTime.toISOString(),
        price: selectedCoach.price_per_session,
        status: 'pending',
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally { setBooking(false); }
  };

  const filtered = filter === 'all' ? coaches : coaches.filter(c => c.skill_level === filter);

  const levelColor: Record<string, string> = {
    beginner: 'var(--success-text)',
    intermediate: 'var(--warning-text)',
    advanced: 'var(--error-text)',
  };
  const levelBg: Record<string, string> = {
    beginner: 'var(--success-bg)',
    intermediate: 'var(--warning-bg)',
    advanced: 'var(--error-bg)',
  };

  if (loading) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14 }}>Loading coaches...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (success) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>🏓</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Session booked!</h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>
          {selectedCoach?.name} · {sessionDate} at {sessionTime}
        </p>
        <p style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', fontSize: 18, fontWeight: 700, marginBottom: 32 }}>₱{selectedCoach?.price_per_session}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="/dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>Go to dashboard</a>
          <button onClick={() => { setSuccess(false); setSelectedCoach(null); setSessionDate(''); setSessionTime(''); }} style={{ background: 'transparent', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)', padding: '12px 24px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Book another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .filter-pill{padding:7px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border:1px solid var(--border);cursor:pointer;transition:all .2s;background:transparent;color:var(--text-muted);}
        .filter-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);}
        .filter-pill:hover:not(.active){border-color:var(--border-hover);color:var(--text-secondary);}

        .coach-card{background:var(--card-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .25s;animation:fadeUp .5s ease both;cursor:pointer;}
        .coach-card:hover{border-color:var(--accent);transform:translateY(-4px);}
        .coach-card.selected{border-color:var(--accent);border-width:2px;}

        .coach-avatar{width:64px;height:64px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--accent);flex-shrink:0;}

        .book-btn{width:100%;height:50px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .book-btn:hover:not(:disabled){background:var(--accent-hover);transform:translateY(-2px);}
        .book-btn:disabled{background:var(--bg-hover);color:var(--text-muted);cursor:not-allowed;}

        .time-btn{padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:var(--card-bg);color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;}
        .time-btn:hover{border-color:var(--accent);color:var(--text-primary);}
        .time-btn.active{background:var(--accent);color:#fff;border-color:var(--accent);}

        @media(max-width:768px){.main-grid{grid-template-columns:1fr !important;}}
      `}</style>

      {/* NAV */}
      <nav style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%' }} />
          <span style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PickleHub</span>
        </a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {['Courts', 'Food', 'Shop', 'Tournaments'].map(l => (
            <a key={l} href={`/${l.toLowerCase()}`} style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a>
          ))}
          <a href="/dashboard" style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Dashboard</a>
          <ThemeToggle />
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 32, animation: 'fadeUp .5s ease both' }}>
          <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Coaching</div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 8 }}>
            Train with the <span style={{ color: 'var(--accent)' }}>best</span>
          </h1>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 15, color: 'var(--text-muted)' }}>Book a certified coach for private lessons, group clinics, or skill drills.</p>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', animation: 'fadeUp .5s .1s ease both' }}>
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All coaches' : f}
            </button>
          ))}
        </div>

        <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* COACHES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.length === 0 ? (
              <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No coaches available for this level.</div>
            ) : filtered.map((coach, i) => (
              <div key={coach.id} className={`coach-card ${selectedCoach?.id === coach.id ? 'selected' : ''}`} style={{ animationDelay: `${i * 0.08}s` }} onClick={() => setSelectedCoach(selectedCoach?.id === coach.id ? null : coach)}>
                <div style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div className="coach-avatar">
                    {coach.image_url
                      ? <img src={coach.image_url} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : coach.name[0].toUpperCase()
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{coach.name}</div>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: levelBg[coach.skill_level], color: levelColor[coach.skill_level] }}>
                          {coach.skill_level}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>₱{coach.price_per_session}</div>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>per session</div>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                      {coach.bio || `Certified ${coach.skill_level} level coach specializing in technique and game improvement.`}
                    </p>
                    {selectedCoach?.id === coach.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}>✓ Selected</span>
                        <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>— pick a date and time on the right</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BOOKING PANEL */}
          <div style={{ position: 'sticky', top: 76 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, animation: 'fadeUp .5s .2s ease both' }}>
              <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 20 }}>Book a session</div>

              {!selectedCoach ? (
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                  Select a coach to get started
                </div>
              ) : (
                <>
                  {/* Selected coach */}
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 14, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                      {selectedCoach.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedCoach.name}</div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{selectedCoach.skill_level} · ₱{selectedCoach.price_per_session}</div>
                    </div>
                  </div>

                  {/* Date picker */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Select date</div>
                    <input
                      type="date"
                      value={sessionDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setSessionDate(e.target.value)}
                      title="Session date"
                      aria-label="Session date"
                      style={{ width: '100%', height: 40, background: 'var(--bg-primary)', border: '1px solid var(--border-hover)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: "'Barlow',sans-serif", fontSize: 14, padding: '0 12px', outline: 'none' }}
                    />
                  </div>

                  {/* Time picker */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Select time</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                      {['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'].map(t => {
                        const val = t.includes('PM') && !t.startsWith('12')
                          ? `${parseInt(t) + 12}:00`
                          : t.replace(' AM', '').replace(' PM', '').padStart(5, '0');
                        return (
                          <button key={t} className={`time-btn ${sessionTime === val ? 'active' : ''}`} onClick={() => setSessionTime(val)}>{t}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  {sessionDate && sessionTime && (
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Coach</span><span style={{ color: 'var(--text-primary)' }}>{selectedCoach.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Date</span><span style={{ color: 'var(--text-primary)' }}>{new Date(sessionDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                        <span>Time</span><span style={{ color: 'var(--text-primary)' }}>{sessionTime}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span>Total</span><span style={{ color: 'var(--accent)' }}>₱{selectedCoach.price_per_session}</span>
                      </div>
                    </div>
                  )}

                  {error && <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--error-text)', marginBottom: 12 }}>{error}</div>}

                  <button className="book-btn" disabled={!sessionDate || !sessionTime || booking} onClick={handleBook}>
                    {booking ? 'Booking...' : !sessionDate || !sessionTime ? 'Pick date & time' : <>Book session · ₱{selectedCoach.price_per_session} <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
                  </button>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 8 }}>Payment via GCash, Maya or card</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}