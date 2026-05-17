'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tournament, TournamentMatch } from './types';
import { SHARED_STYLES } from './types';

type Props = { tournaments: Tournament[]; };

export default function TournamentsTab({ tournaments }: Props) {
  const [matches, setMatches]                 = useState<TournamentMatch[]>([]);
  const [activeTournament, setActiveTournament] = useState<string | null>(null);

  const supabase = createClient();

  const fetchMatches = async (tournamentId: string) => {
    const { data } = await supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round').order('match_number');
    setMatches(prev => [...prev.filter(m => m.tournament_id !== tournamentId), ...(data || [])]);
  };

  useEffect(() => {
    if (tournaments.length > 0) {
      const tid = activeTournament || tournaments[0]?.id;
      if (tid) { setActiveTournament(tid); fetchMatches(tid); }
    }
  }, [tournaments]);

  // Realtime bracket updates
  useEffect(() => {
    if (!activeTournament) return;
    const channel = supabase.channel(`emp-bracket-${activeTournament}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'tournament_matches', filter:`tournament_id=eq.${activeTournament}` }, () => {
        fetchMatches(activeTournament);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTournament]);

  const formatLabel: Record<string, string> = {
    single_elim:'Single Elimination', double_elim:'Double Elimination', round_robin:'Round Robin'
  };

  if (tournaments.length === 0) {
    return (
      <div>
        <style>{SHARED_STYLES}</style>
        <h1 className="section-title">Tournament Brackets</h1>
        <div className="table-wrap"><div className="empty">No tournaments yet</div></div>
      </div>
    );
  }

  const tournament = tournaments.find(t => t.id === (activeTournament || tournaments[0]?.id));
  const tMatches   = matches.filter(m => m.tournament_id === tournament?.id);

  const renderBracket = () => {
    if (!tournament) return null;

    // ── ROUND ROBIN ──
    if (tournament.format === 'round_robin') {
      return (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>Player 1</th><th>Score</th><th>Player 2</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {tMatches.length === 0
                ? <tr><td colSpan={6}><div className="empty">No matches yet</div></td></tr>
                : tMatches.map(m => (
                  <tr key={m.id}>
                    <td style={{ color:'var(--text-muted)', fontFamily:"'Barlow',sans-serif" }}>{m.match_number}</td>
                    <td style={{ fontWeight:600 }}>{m.player1_name || 'TBD'}</td>
                    <td style={{ fontWeight:800, color:'var(--accent)', fontFamily:"'Barlow',sans-serif" }}>{m.player1_score} – {m.player2_score}</td>
                    <td style={{ fontWeight:600 }}>{m.player2_name || 'TBD'}</td>
                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    <td>
                      {m.status !== 'completed' && m.status !== 'bye' && (
                        <button className="btn primary" onClick={() => window.location.href = `/scoreboard/${m.id}`}>▶ Score</button>
                      )}
                      {m.status === 'completed' && <span style={{ fontSize:12, color:'var(--success-text)', fontWeight:700 }}>✓ Done</span>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      );
    }

    // ── SINGLE / DOUBLE ELIMINATION — SVG BRACKET ──
    const winnerMatches = tMatches.filter(m => m.bracket === 'winners' || m.bracket === 'grand_final');
    const rounds        = Array.from(new Set(winnerMatches.map(m => m.round))).sort((a,b) => a - b);
    const totalRounds   = rounds.length;

    if (totalRounds === 0) return <div className="empty">No matches yet</div>;

    const BOX_W       = 160;
    const BOX_H       = 56;
    const COL_GAP     = 80;
    const CHAMP_W     = 110;
    const CHAMP_H     = 40;
    const R1_MATCH_GAP = BOX_H + 24;

    const r1Matches   = winnerMatches.filter(m => m.round === rounds[0]);
    const totalHeight = Math.max(300, r1Matches.length * (BOX_H + R1_MATCH_GAP) + R1_MATCH_GAP);

    const matchY: Record<string, number> = {};
    rounds.forEach((round, ri) => {
      const roundMatches = winnerMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
      const spacing      = (BOX_H + R1_MATCH_GAP) * Math.pow(2, ri);
      const startY       = spacing / 2 - BOX_H / 2;
      roundMatches.forEach((m, mi) => { matchY[m.id] = startY + mi * spacing + BOX_H / 2; });
    });

    const svgWidth  = totalRounds * (BOX_W + COL_GAP) + COL_GAP + CHAMP_W + 40;
    const svgHeight = totalHeight + 60;
    const colX      = (ri: number) => 20 + ri * (BOX_W + COL_GAP);

    const lines: { x1:number;y1:number;x2:number;y2:number;x3:number;y3:number;x4:number;y4:number }[] = [];
    rounds.forEach((round, ri) => {
      if (ri >= rounds.length - 1) return;
      const roundMatches = winnerMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
      for (let i = 0; i < roundMatches.length; i += 2) {
        const mA = roundMatches[i];
        const mB = roundMatches[i + 1];
        if (!mA) continue;
        const yA   = matchY[mA.id];
        const yB   = mB ? matchY[mB.id] : yA;
        const yMid = (yA + yB) / 2;
        const x1   = colX(ri) + BOX_W;
        const x2   = colX(ri) + BOX_W + COL_GAP / 2;
        const x3   = colX(ri + 1);
        lines.push({ x1, y1:yA, x2, y2:yA, x3:x2, y3:yMid, x4:x3, y4:yMid });
        if (mB) lines.push({ x1, y1:yB, x2, y2:yB, x3:x2, y3:yMid, x4:x3, y4:yMid });
      }
    });

    const lastRound  = rounds[rounds.length - 1];
    const finalMatch = winnerMatches.find(m => m.round === lastRound);
    const champX     = colX(totalRounds - 1) + BOX_W + COL_GAP / 2;
    const champY     = finalMatch ? matchY[finalMatch.id] : svgHeight / 2;

    return (
      <>
        <div style={{ overflowX:'auto', overflowY:'visible', paddingBottom:16 }}>
          <svg width={svgWidth} height={svgHeight} style={{ fontFamily:"'Barlow Condensed',sans-serif", overflow:'visible' }}>
            {/* Round labels */}
            {rounds.map((round, ri) => (
              <text key={round} x={colX(ri) + BOX_W / 2} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-hint)" letterSpacing="0.08em">
                {ri === rounds.length - 1 ? 'FINAL' : `ROUND ${round}`}
              </text>
            ))}
            <text x={colX(totalRounds-1) + BOX_W + COL_GAP/2 + CHAMP_W/2 + 4} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em">CHAMPION</text>

            {/* Connector lines */}
            {lines.map((l, i) => (
              <g key={i}>
                <line x1={l.x1} y1={l.y1+28} x2={l.x2} y2={l.y2+28} stroke="var(--border)" strokeWidth={2}/>
                <line x1={l.x2} y1={l.y2+28} x2={l.x3} y2={l.y3+28} stroke="var(--border)" strokeWidth={2}/>
                <line x1={l.x3} y1={l.y3+28} x2={l.x4} y2={l.y4+28} stroke="var(--border)" strokeWidth={2}/>
              </g>
            ))}

            {/* Champion connector */}
            {finalMatch && (
              <line x1={colX(totalRounds-1)+BOX_W} y1={champY+28} x2={champX+CHAMP_W/2+4} y2={champY+28} stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3"/>
            )}

            {/* Champion box */}
            <rect x={champX+4} y={champY+28-CHAMP_H/2} width={CHAMP_W} height={CHAMP_H} rx={8} fill="var(--accent)"/>
            <text x={champX+4+CHAMP_W/2} y={champY+28+5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff" letterSpacing="0.06em">
              {finalMatch?.winner_id
                ? (finalMatch.player1_score > finalMatch.player2_score ? finalMatch.player1_name : finalMatch.player2_name) || 'CHAMPION'
                : 'CHAMPION'}
            </text>

            {/* Match boxes */}
            {winnerMatches.map(m => {
              const x        = colX(rounds.indexOf(m.round));
              const y        = (matchY[m.id] || 0) + 28;
              const isWin1   = m.status === 'completed' && m.player1_score > m.player2_score;
              const isWin2   = m.status === 'completed' && m.player2_score > m.player1_score;
              const bColor   = m.status === 'completed' ? '#4ade80' : m.status === 'ongoing' ? 'var(--accent)' : 'var(--border)';
              const canScore = m.status !== 'completed' && m.status !== 'bye' && m.player1_name && m.player2_name;
              return (
                <g key={m.id} style={{ cursor: canScore ? 'pointer' : 'default' }} onClick={() => { if (canScore) window.location.href = `/scoreboard/${m.id}`; }}>
                  <rect x={x+2} y={y-BOX_H/2+2} width={BOX_W} height={BOX_H} rx={8} fill="rgba(0,0,0,.15)"/>
                  <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H} rx={8} fill="var(--card-bg)" stroke={bColor} strokeWidth={1.5}/>
                  <line x1={x} y1={y} x2={x+BOX_W} y2={y} stroke="var(--border)" strokeWidth={1}/>
                  {isWin1 && <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                  {isWin2 && <rect x={x} y={y} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                  <text x={x+10} y={y-9} fontSize={12} fontWeight={isWin1?800:500} fill={m.player1_name?(isWin1?'#4ade80':'var(--text-primary)'):'var(--text-hint)'}>{m.player1_name||'TBD'}</text>
                  <text x={x+BOX_W-8} y={y-9} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player1_score:''}</text>
                  <text x={x+10} y={y+17} fontSize={12} fontWeight={isWin2?800:500} fill={m.player2_name?(isWin2?'#4ade80':'var(--text-primary)'):'var(--text-hint)'}>{m.player2_name||'TBD'}</text>
                  <text x={x+BOX_W-8} y={y+17} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player2_score:''}</text>
                  <defs>
                    <clipPath id={`clip-${m.id}-1`}><rect x={x+10} y={y-BOX_H/2} width={BOX_W-40} height={BOX_H/2}/></clipPath>
                    <clipPath id={`clip-${m.id}-2`}><rect x={x+10} y={y} width={BOX_W-40} height={BOX_H/2}/></clipPath>
                  </defs>
                  {canScore && <text x={x+BOX_W/2} y={y+36} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--accent)" letterSpacing="0.06em">▶ TAP TO SCORE</text>}
                  {m.status==='completed' && <text x={x+BOX_W/2} y={y+36} textAnchor="middle" fontSize={9} fontWeight={700} fill="#4ade80" letterSpacing="0.06em">✓ DONE</text>}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Losers bracket table for double elim */}
        {tournament.format === 'double_elim' && tMatches.filter(m => m.bracket === 'losers').length > 0 && (
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)', marginBottom:12 }}>Losers Bracket</div>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Round</th><th>Player 1</th><th>Score</th><th>Player 2</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {tMatches.filter(m => m.bracket === 'losers').map(m => (
                    <tr key={m.id}>
                      <td style={{ color:'var(--text-muted)' }}>R{m.round}</td>
                      <td style={{ fontWeight:600 }}>{m.player1_name||'TBD'}</td>
                      <td style={{ fontWeight:800, color:'var(--accent)' }}>{m.player1_score} – {m.player2_score}</td>
                      <td style={{ fontWeight:600 }}>{m.player2_name||'TBD'}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                      <td>
                        {m.status !== 'completed' && m.status !== 'bye' && m.player1_name && m.player2_name && (
                          <button className="btn primary" onClick={() => window.location.href = `/scoreboard/${m.id}`}>▶ Score</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      <style>{SHARED_STYLES}</style>
      <h1 className="section-title">Tournament Brackets</h1>

      {/* Tournament selector */}
      {tournaments.length > 1 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {tournaments.map(t => (
            <button key={t.id} onClick={() => { setActiveTournament(t.id); fetchMatches(t.id); }}
              style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${activeTournament===t.id?'var(--accent)':'var(--border)'}`, background:activeTournament===t.id?'var(--accent)':'transparent', color:activeTournament===t.id?'#fff':'var(--text-muted)', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:'.04em', display:'flex', alignItems:'center', gap:6 }}>
              {t.name}
              <span style={{ fontSize:9, padding:'1px 6px', borderRadius:10, background:'rgba(255,255,255,.2)', fontWeight:800 }}>{t.status}</span>
            </button>
          ))}
        </div>
      )}

      {tournament && (
        <div style={{ fontSize:13, fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:16, letterSpacing:'.06em' }}>
          {tournament.name} · {formatLabel[tournament.format] || tournament.format}
        </div>
      )}

      {renderBracket()}
    </div>
  );
}