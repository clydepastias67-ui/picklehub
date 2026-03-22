'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';
import { redirectToPayment } from '@/lib/usePayMongo';
import Navbar from '@/lib/Navbar';

type Tournament = {
  id: string;
  name: string;
  description: string;
  date: string;
  max_players: number;
  entry_fee: number;
  status: 'open' | 'ongoing' | 'completed';
};

type Registration = {
  tournament_id: string;
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'ongoing' | 'completed'>('all');
  const [registering, setRegistering] = useState('');
  const [successId, setSuccessId] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id: user.id, email: user.email });

      const [{ data: tData }, { data: rData }] = await Promise.all([
        supabase.from('tournaments').select('*').order('date', { ascending: true }),
        supabase.from('tournament_registrations').select('tournament_id').eq('user_id', user.id),
      ]);

      setTournaments(tData || []);
      setRegistrations(rData || []);

      // Get registration counts per tournament
      if (tData) {
        const countMap: Record<string, number> = {};
        await Promise.all(tData.map(async t => {
          const { count } = await supabase.from('tournament_registrations').select('*', { count: 'exact', head: true }).eq('tournament_id', t.id);
          countMap[t.id] = count || 0;
        }));
        setCounts(countMap);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const isRegistered = (id: string) => registrations.some(r => r.tournament_id === id);

  const handleRegister = async (tournament: Tournament) => {
    if (!user) return;
    setRegistering(tournament.id); setError('');
    try {
      const supabase = createClient();
      const { data: regData, error } = await supabase.from('tournament_registrations').insert({
        tournament_id: tournament.id,
        user_id: user.id,
      }).select().single();
      if (error) throw error;
      setRegistrations(prev => [...prev, { tournament_id: tournament.id }]);
      setCounts(prev => ({ ...prev, [tournament.id]: (prev[tournament.id] || 0) + 1 }));
      // Only redirect to PayMongo if there's an entry fee
      if (tournament.entry_fee > 0) {
        await redirectToPayment({
          amount: tournament.entry_fee,
          description: `PickleHub Tournament - ${tournament.name}`,
          referenceId: regData.id,
          type: 'tournament',
        });
      } else {
        setSuccessId(tournament.id);
        setTimeout(() => setSuccessId(''), 3000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
      setTimeout(() => setError(''), 3000);
      setRegistering('');
    }
  };

  const handleUnregister = async (tournamentId: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from('tournament_registrations').delete().eq('tournament_id', tournamentId).eq('user_id', user.id);
    setRegistrations(prev => prev.filter(r => r.tournament_id !== tournamentId));
    setCounts(prev => ({ ...prev, [tournamentId]: Math.max(0, (prev[tournamentId] || 1) - 1) }));
  };

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => t.status === filter);

  const statusColor: Record<string, string> = { open: 'var(--success-text)', ongoing: 'var(--warning-text)', completed: 'var(--text-muted)' };
  const statusBg: Record<string, string> = { open: 'var(--success-bg)', ongoing: 'var(--warning-bg)', completed: 'var(--bg-hover)' };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14 }}>Loading tournaments...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .filter-pill{padding:7px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border:1px solid var(--border);cursor:pointer;transition:all .2s;background:transparent;color:var(--text-muted);}
        .filter-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);}
        .filter-pill:hover:not(.active){border-color:var(--border-hover);color:var(--text-secondary);}

        .t-card{background:var(--card-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .2s;animation:fadeUp .5s ease both;}
        .t-card:hover{border-color:var(--border-hover);}
        .t-card.registered{border-color:var(--accent);}

        .reg-btn{height:44px;padding:0 24px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .2s;border:none;display:flex;align-items:center;gap:8px;}
        .reg-btn.register{background:var(--accent);color:#fff;}
        .reg-btn.register:hover{background:var(--accent-hover);}
        .reg-btn.unregister{background:transparent;border:1px solid var(--border-hover);color:var(--text-muted);}
        .reg-btn.unregister:hover{border-color:var(--error-text);color:var(--error-text);}
        .reg-btn:disabled{background:var(--bg-hover);color:var(--text-muted);cursor:not-allowed;}

        .progress-bar{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:8px;}
        .progress-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .5s ease;}

        .stat-chip{display:flex;align-items:center;gap:6px;fontFamily:'Barlow',sans-serif;font-size:13px;color:var(--text-secondary);}

        .toast{position:fixed;bottom:24px;right:24px;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;z-index:100;animation:fadeIn .2s ease both;text-transform:uppercase;letter-spacing:.04em;}
        .toast-success{background:var(--accent);color:#fff;}
        .toast-error{background:var(--error-bg);color:var(--error-text);border:1px solid var(--error-border);}
      `}</style>

      {/* NAV */}
      <Navbar activeLink="/tournaments" />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 32, animation: 'fadeUp .5s ease both' }}>
          <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Tournaments</div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 8 }}>
            Compete & <span style={{ color: 'var(--accent)' }}>win</span>
          </h1>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 15, color: 'var(--text-muted)' }}>Register for ladders, round robins, leagues and tournaments.</p>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28, animation: 'fadeUp .5s .1s ease both' }}>
          {[
            { label: 'Open now', val: tournaments.filter(t => t.status === 'open').length, color: 'var(--success-text)' },
            { label: 'Ongoing', val: tournaments.filter(t => t.status === 'ongoing').length, color: 'var(--warning-text)' },
            { label: 'You registered', val: registrations.length, color: 'var(--accent)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', animation: 'fadeUp .5s .15s ease both' }}>
          {(['all', 'open', 'ongoing', 'completed'] as const).map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All tournaments' : f}
            </button>
          ))}
        </div>

        {/* TOURNAMENT LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14, padding: '60px 0', textAlign: 'center' }}>
              No tournaments found.{filter === 'open' ? ' Check back soon!' : ''}
            </div>
          ) : filtered.map((t, i) => {
            const registered = isRegistered(t.id);
            const count = counts[t.id] || 0;
            const spotsLeft = t.max_players - count;
            const pct = Math.min((count / t.max_players) * 100, 100);
            const isFull = spotsLeft <= 0;

            return (
              <div key={t.id} className={`t-card ${registered ? 'registered' : ''}`} style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase' }}>{t.name}</h3>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: statusBg[t.status], color: statusColor[t.status] }}>
                          {t.status}
                        </span>
                        {registered && (
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: 'var(--accent-bg)', color: 'var(--accent)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            ✓ Registered
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{t.description}</p>
                      )}

                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1" stroke="var(--text-muted)" strokeWidth="1.2"/><path d="M4 1v2M10 1v2M1 6h12" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(t.date)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="var(--text-muted)" strokeWidth="1.2"/><path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-secondary)' }}>{count}/{t.max_players} players</span>
                        </div>
                        {t.entry_fee > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>₱{t.entry_fee}</span>
                            <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>entry fee</span>
                          </div>
                        )}
                        {t.entry_fee === 0 && (
                          <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--success-text)', fontWeight: 700 }}>Free entry</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          <span>{count} registered</span>
                          <span style={{ color: isFull ? 'var(--error-text)' : spotsLeft <= 5 ? 'var(--warning-text)' : 'var(--text-muted)' }}>
                            {isFull ? 'Full' : `${spotsLeft} spots left`}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: isFull ? 'var(--error-text)' : pct > 80 ? 'var(--warning-text)' : 'var(--accent)' }} />
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <div style={{ flexShrink: 0 }}>
                      {t.status === 'open' && (
                        registered ? (
                          <button className="reg-btn unregister" onClick={() => handleUnregister(t.id)}>
                            ✓ Unregister
                          </button>
                        ) : (
                          <button
                            className="reg-btn register"
                            onClick={() => handleRegister(t)}
                            disabled={isFull || registering === t.id}
                          >
                            {registering === t.id ? 'Registering...' : isFull ? 'Full' : <>Register <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 3l4 4-4 4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></>}
                          </button>
                        )
                      )}
                      {t.status === 'ongoing' && registered && (
                        <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--warning-text)', fontWeight: 700 }}>In progress</span>
                      )}
                      {t.status === 'completed' && (
                        <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>Completed</span>
                      )}
                    </div>
                  </div>

                  {successId === t.id && (
                    <div style={{ marginTop: 14, background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--success-text)', animation: 'fadeIn .3s ease both' }}>
                      ✓ Successfully registered for {t.name}! Check your dashboard for details.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <div className="toast toast-error">{error}</div>}
    </div>
  );
}