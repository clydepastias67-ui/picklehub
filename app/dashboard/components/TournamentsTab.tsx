'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tournament, TournamentMatch } from './types';
import { SHARED_STYLES, fmtDate } from './types';

type Props = { tournaments: Tournament[]; };

export default function TournamentsTab({ tournaments }: Props) {
  const [matchMap, setMatchMap]               = useState<Record<string, TournamentMatch[]>>({});
  const [expandedBracket, setExpandedBracket] = useState<string | null>(null);

  const supabase = createClient();

  const fetchMatches = async (tournamentId: string) => {
    const { data } = await supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId).order('round').order('match_number');
    setMatchMap(prev => ({ ...prev, [tournamentId]: data || [] }));
  };

  // Realtime bracket updates
  useEffect(() => {
    if (!expandedBracket) return;
    const channel = supabase.channel(`dashboard-bracket-${expandedBracket}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'tournament_matches', filter:`tournament_id=eq.${expandedBracket}` }, () => {
        fetchMatches(expandedBracket);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [expandedBracket]);

  const toggleBracket = (tournamentId: string) => {
    if (expandedBracket === tournamentId) { setExpandedBracket(null); return; }
    setExpandedBracket(tournamentId);
    if (!matchMap[tournamentId]) fetchMatches(tournamentId);
  };

  const renderBracket = (tid: string) => {
    const tMatches = (matchMap[tid] || []).filter(m => m.bracket === 'winners' || m.bracket === 'grand_final');
    if (!matchMap[tid]) return <div style={{ padding:'12px 0', fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)' }}>Loading bracket...</div>;
    if (tMatches.length === 0) return <div style={{ padding:'12px 0', fontFamily:"'Barlow',sans-serif", fontSize:13, color:'var(--text-muted)' }}>Bracket not generated yet.</div>;

    const rounds      = Array.from(new Set(tMatches.map(m => m.round))).sort((a,b) => a - b);
    const totalRounds = rounds.length;
    const BOX_W = 150, BOX_H = 56, COL_GAP = 70, CHAMP_W = 110, CHAMP_H = 40;
    const r1Matches   = tMatches.filter(m => m.round === rounds[0]);
    const R1_GAP      = BOX_H + 24;
    const totalHeight = Math.max(160, r1Matches.length * (BOX_H + R1_GAP) + R1_GAP);

    const matchY: Record<string, number> = {};
    rounds.forEach((round, ri) => {
      const rm      = tMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
      const spacing = (BOX_H + R1_GAP) * Math.pow(2, ri);
      const startY  = spacing / 2 - BOX_H / 2;
      rm.forEach((m, mi) => { matchY[m.id] = startY + mi * spacing + BOX_H / 2; });
    });

    const svgW  = totalRounds * (BOX_W + COL_GAP) + COL_GAP + CHAMP_W + 40;
    const svgH  = totalHeight + 60;
    const colX  = (ri: number) => 20 + ri * (BOX_W + COL_GAP);

    const lines: { x1:number;y1:number;x2:number;y2:number;x3:number;y3:number;x4:number;y4:number }[] = [];
    rounds.forEach((round, ri) => {
      if (ri >= rounds.length - 1) return;
      const rm = tMatches.filter(m => m.round === round).sort((a,b) => a.match_number - b.match_number);
      for (let i = 0; i < rm.length; i += 2) {
        const mA = rm[i], mB = rm[i + 1];
        if (!mA) continue;
        const yA = matchY[mA.id], yB = mB ? matchY[mB.id] : yA, yMid = (yA + yB) / 2;
        const x1 = colX(ri) + BOX_W, x2 = colX(ri) + BOX_W + COL_GAP / 2, x3 = colX(ri + 1);
        lines.push({ x1, y1:yA, x2, y2:yA, x3:x2, y3:yMid, x4:x3, y4:yMid });
        if (mB) lines.push({ x1, y1:yB, x2, y2:yB, x3:x2, y3:yMid, x4:x3, y4:yMid });
      }
    });

    const finalMatch = tMatches.find(m => m.round === rounds[rounds.length - 1]);
    const champX     = colX(totalRounds - 1) + BOX_W + COL_GAP / 2;
    const champY     = finalMatch ? matchY[finalMatch.id] : svgH / 2;

    return (
      <div style={{ overflowX:'auto', paddingBottom:8, marginTop:12 }}>
        <svg width={svgW} height={svgH} style={{ fontFamily:"'Barlow Condensed',sans-serif", overflow:'visible' }}>
          {rounds.map((round, ri) => (
            <text key={round} x={colX(ri) + BOX_W / 2} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-hint)" letterSpacing="0.08em">
              {ri === rounds.length - 1 ? 'FINAL' : `ROUND ${round}`}
            </text>
          ))}
          <text x={champX + CHAMP_W / 2 + 4} y={18} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--accent)" letterSpacing="0.08em">CHAMPION</text>

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
            {finalMatch?.winner_id
              ? (finalMatch.player1_score > finalMatch.player2_score ? finalMatch.player1_name : finalMatch.player2_name) || 'CHAMPION'
              : 'CHAMPION'}
          </text>

          {tMatches.map(m => {
            const x   = colX(rounds.indexOf(m.round));
            const y   = (matchY[m.id] || 0) + 28;
            const isW1 = m.status === 'completed' && m.player1_score > m.player2_score;
            const isW2 = m.status === 'completed' && m.player2_score > m.player1_score;
            return (
              <g key={m.id}>
                <rect x={x+2} y={y-BOX_H/2+2} width={BOX_W} height={BOX_H} rx={8} fill="rgba(0,0,0,.1)"/>
                <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H} rx={8} fill="var(--card-bg)" stroke={m.status==='completed'?'#4ade80':m.status==='ongoing'?'var(--accent)':'var(--border)'} strokeWidth={1.5}/>
                <line x1={x} y1={y} x2={x+BOX_W} y2={y} stroke="var(--border)" strokeWidth={1}/>
                {isW1 && <rect x={x} y={y-BOX_H/2} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                {isW2 && <rect x={x} y={y} width={BOX_W} height={BOX_H/2} rx={8} fill="rgba(74,222,128,.12)"/>}
                <text x={x+10} y={y-9} fontSize={12} fontWeight={isW1?800:500} fill={m.player1_name?(isW1?'#4ade80':'var(--text-primary)'):'var(--text-hint)'}>{m.player1_name||'TBD'}</text>
                <text x={x+BOX_W-8} y={y-9} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player1_score:''}</text>
                <text x={x+10} y={y+17} fontSize={12} fontWeight={isW2?800:500} fill={m.player2_name?(isW2?'#4ade80':'var(--text-primary)'):'var(--text-hint)'}>{m.player2_name||'TBD'}</text>
                <text x={x+BOX_W-8} y={y+17} fontSize={12} fontWeight={800} fill="var(--accent)" textAnchor="end">{m.status!=='pending'?m.player2_score:''}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div style={{ animation:'fadeUp .4s ease both' }}>
      <style>{SHARED_STYLES}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div className="section-title" style={{ marginBottom:0 }}>My tournaments</div>
        <a href="/tournaments" className="add-btn">Browse tournaments</a>
      </div>

      <div className="section-card" style={{ marginBottom:0 }}>
        {tournaments.length === 0
          ? <div className="empty-state">Not registered in any tournaments — <a href="/tournaments">join one!</a></div>
          : tournaments.map((t, i) => {
              const tid    = (t as unknown as { tournament_id: string }).tournament_id || t.id;
              const status = t.tournaments?.status || 'open';
              const hasBracket = status === 'ongoing' || status === 'completed';
              return (
                <div key={t.id} style={{ borderBottom:'1px solid var(--border)', paddingBottom: hasBracket && expandedBracket === tid ? 16 : 0 }}>
                  <div className="booking-row" style={{ animationDelay:`${i * 0.05}s`, cursor: hasBracket ? 'pointer' : 'default' }} onClick={() => hasBracket && toggleBracket(tid)}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{t.tournaments?.name || 'Tournament'}</div>
                      <div style={{ fontSize:12, fontFamily:"'Barlow',sans-serif", color:'var(--text-muted)' }}>
                        {t.tournaments?.date ? fmtDate(t.tournaments.date) : '—'}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span className={`status-badge status-${status}`}>{status}</span>
                      {hasBracket && <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>{expandedBracket === tid ? '▲' : '▼'}</span>}
                    </div>
                  </div>
                  {hasBracket && expandedBracket === tid && renderBracket(tid)}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}