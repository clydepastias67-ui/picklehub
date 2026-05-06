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
  format: string;
};

type Registration = {
  tournament_id: string;
};
type TournamentMatch = {
  id: string; tournament_id: string; round: number; match_number: number;
  bracket: string; player1_name: string | null; player2_name: string | null;
  player1_score: number; player2_score: number; winner_id: string | null; status: string;
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
  const [matchMap, setMatchMap] = useState<Record<string, TournamentMatch[]>>({});
  const [expandedBracket, setExpandedBracket] = useState<string | null>(null);

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

    // Realtime: update registration counts live
    const supabase2 = createClient();
    const refreshCounts = async (tournamentId?: string) => {
      const { data: tData } = await supabase2.from('tournaments').select('id');
      if (!tData) return;
      const ids = tournamentId ? [tournamentId] : tData.map(t => t.id);
      const countMap: Record<string, number> = {};
      await Promise.all(ids.map(async id => {
        const { count } = await supabase2.from('tournament_registrations').select('*', { count: 'exact', head: true }).eq('tournament_id', id);
        countMap[id] = count || 0;
      }));
      setCounts(prev => ({ ...prev, ...countMap }));
    };

    const channel = supabase2.channel('tournaments-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tournament_registrations' }, (payload) => {
        const tid = (payload.new as {tournament_id:string}).tournament_id;
        // Immediately increment count optimistically
        setCounts(prev => ({ ...prev, [tid]: (prev[tid] || 0) + 1 }));
        // Then fetch accurate count
        refreshCounts(tid);
        // Refresh registrations for current user
        fetchData();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tournament_registrations' }, (payload) => {
        const tid = (payload.old as {tournament_id:string}).tournament_id;
        setCounts(prev => ({ ...prev, [tid]: Math.max(0, (prev[tid] || 1) - 1) }));
        refreshCounts(tid);
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchData)
      .subscribe();
    return () => { supabase2.removeChannel(channel); };
  }, []);

  const fetchMatches = async (tournamentId: string) => {
    const supabase = createClient();
    const { data } = await supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round').order('match_number');
    setMatchMap(prev => ({ ...prev, [tournamentId]: data || [] }));
  };

  const toggleBracket = (tournamentId: string) => {
    if (expandedBracket === tournamentId) { setExpandedBracket(null); return; }
    setExpandedBracket(tournamentId);
    if (!matchMap[tournamentId]) fetchMatches(tournamentId);
  };

  const isRegistered = (id: string) => registrations.some(r => r.tournament_id === id);

  const handleRegister = async (tournament: Tournament) => {
    if (!user) return;
    setRegistering(tournament.id); setError('');
    try {
      const supabase = createClient();
      const { data: regData, error } = await supabase.from('tournament_registrations').insert({
        tournament_id: tournament.id,
        user_id: user.id,
        email: user.email || '',
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

                  {/* View Bracket button for ongoing/completed */}
                  {(t.status === 'ongoing' || t.status === 'completed') && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <button onClick={() => toggleBracket(t.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🏆 {expandedBracket === t.id ? 'Hide Bracket ▲' : 'View Bracket ▼'}
                      </button>

                      {expandedBracket === t.id && (() => {
                        const tMatches = (matchMap[t.id] || []).filter(m => m.bracket === 'winners' || m.bracket === 'grand_final');
                        if (tMatches.length === 0) return <div style={{ padding: '16px 0', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>Bracket not generated yet.</div>;

                        const rounds = Array.from(new Set(tMatches.map(m => m.round))).sort((a,b) => a - b);
                        const totalRounds = rounds.length;
                        const BOX_W = 150, BOX_H = 56, COL_GAP = 70, CHAMP_W = 110, CHAMP_H = 40;
                        const r1Matches = tMatches.filter(m => m.round === rounds[0]);
                        const R1_MATCH_GAP = BOX_H + 24;
                        const totalHeight = Math.max(200, r1Matches.length * (BOX_H + R1_MATCH_GAP) + R1_MATCH_GAP);

                        const matchY: Record<string, number> = {};
                        rounds.forEach((round, ri) => {
                          const roundMatches = tMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
                          const spacing = (BOX_H + R1_MATCH_GAP) * Math.pow(2, ri);
                          const startY = spacing / 2 - BOX_H / 2;
                          roundMatches.forEach((m, mi) => { matchY[m.id] = startY + mi * spacing + BOX_H / 2; });
                        });

                        const svgWidth = totalRounds * (BOX_W + COL_GAP) + COL_GAP + CHAMP_W + 40;
                        const svgHeight = totalHeight + 60;
                        const colX = (ri: number) => 20 + ri * (BOX_W + COL_GAP);

                        const lines: { x1:number;y1:number;x2:number;y2:number;x3:number;y3:number;x4:number;y4:number }[] = [];
                        rounds.forEach((round, ri) => {
                          if (ri >= rounds.length - 1) return;
                          const roundMatches = tMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
                          for (let i = 0; i < roundMatches.length; i += 2) {
                            const mA = roundMatches[i], mB = roundMatches[i+1];
                            if (!mA) continue;
                            const yA = matchY[mA.id], yB = mB ? matchY[mB.id] : yA;
                            const yMid = (yA + yB) / 2;
                            const x1 = colX(ri) + BOX_W, x2 = colX(ri) + BOX_W + COL_GAP / 2, x3 = colX(ri + 1);
                            lines.push({ x1, y1: yA, x2, y2: yA, x3: x2, y3: yMid, x4: x3, y4: yMid });
                            if (mB) lines.push({ x1, y1: yB, x2, y2: yB, x3: x2, y3: yMid, x4: x3, y4: yMid });
                          }
                        });

                        const lastRound = rounds[rounds.length - 1];
                        const finalMatch = tMatches.find(m => m.round === lastRound);
                        const champX = colX(totalRounds - 1) + BOX_W + COL_GAP / 2;
                        const champY = finalMatch ? matchY[finalMatch.id] : svgHeight / 2;

                        return (
                          <div style={{ marginTop: 16, overflowX: 'auto', paddingBottom: 8 }}>
                            <svg width={svgWidth} height={svgHeight} style={{ fontFamily: "'Barlow Condensed',sans-serif", overflow: 'visible' }}>
                              {rounds.map((round, ri) => (
                                <text key={round} x={colX(ri) + BOX_W/2} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-hint)" letterSpacing="0.08em">{ri === rounds.length-1 ? 'FINAL' : `ROUND ${round}`}</text>
                              ))}
                              <text x={champX + CHAMP_W/2 + 4} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em">CHAMPION</text>

                              {lines.map((l, i) => (
                                <g key={i}>
                                  <line x1={l.x1} y1={l.y1+28} x2={l.x2} y2={l.y2+28} stroke="var(--border)" strokeWidth={2}/>
                                  <line x1={l.x2} y1={l.y2+28} x2={l.x3} y2={l.y3+28} stroke="var(--border)" strokeWidth={2}/>
                                  <line x1={l.x3} y1={l.y3+28} x2={l.x4} y2={l.y4+28} stroke="var(--border)" strokeWidth={2}/>
                                </g>
                              ))}

                              {finalMatch && <line x1={colX(totalRounds-1)+BOX_W} y1={champY+28} x2={champX+CHAMP_W/2+4} y2={champY+28} stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3"/>}

                              <rect x={champX+4} y={champY+28-CHAMP_H/2} width={CHAMP_W} height={CHAMP_H} rx={8} fill="var(--accent)"/>
                              <text x={champX+4+CHAMP_W/2} y={champY+28+5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff" letterSpacing="0.06em">
                                {finalMatch?.winner_id ? (finalMatch.player1_score > finalMatch.player2_score ? finalMatch.player1_name : finalMatch.player2_name) || 'CHAMPION' : 'CHAMPION'}
                              </text>

                              {tMatches.map(m => {
                                const x = colX(rounds.indexOf(m.round));
                                const y = (matchY[m.id] || 0) + 28;
                                const isW1 = m.status === 'completed' && m.player1_score > m.player2_score;
                                const isW2 = m.status === 'completed' && m.player2_score > m.player1_score;
                                const isMe1 = user && m.player1_name === user.email?.split('@')[0];
                                const isMe2 = user && m.player2_name === user.email?.split('@')[0];
                                return (
                                  <g key={m.id}>
                                    <rect x={x+2} y={y-BOX_H/2+2} width={BOX_W} height={BOX_H} rx={8} fill="rgba(0,0,0,.1)"/>
                                    <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H} rx={8} fill="var(--card-bg)" stroke={m.status==='completed'?'#4ade80':m.status==='ongoing'?'var(--accent)':'var(--border)'} strokeWidth={1.5}/>
                                    <line x1={x} y1={y} x2={x+BOX_W} y2={y} stroke="var(--border)" strokeWidth={1}/>
                                    {isW1 && <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                                    {isW2 && <rect x={x} y={y} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                                    {/* Highlight current player */}
                                    {isMe1 && <rect x={x} y={y-BOX_H/2} width={4} height={BOX_H/2} rx={2} fill="var(--accent)"/>}
                                    {isMe2 && <rect x={x} y={y} width={4} height={BOX_H/2} rx={2} fill="var(--accent)"/>}
                                    <text x={x+14} y={y-9} fontSize={12} fontWeight={isW1||isMe1?800:500} fill={m.player1_name?(isW1?'#4ade80':isMe1?'var(--accent)':'var(--text-primary)'):'var(--text-hint)'}>{m.player1_name||'TBD'}</text>
                                    <text x={x+BOX_W-8} y={y-9} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player1_score:''}</text>
                                    <text x={x+14} y={y+17} fontSize={12} fontWeight={isW2||isMe2?800:500} fill={m.player2_name?(isW2?'#4ade80':isMe2?'var(--accent)':'var(--text-primary)'):'var(--text-hint)'}>{m.player2_name||'TBD'}</text>
                                    <text x={x+BOX_W-8} y={y+17} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player2_score:''}</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        );
                      })()}
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