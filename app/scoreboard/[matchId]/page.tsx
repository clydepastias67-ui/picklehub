'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';

type Match = {
  id: string;
  tournament_id: string;
  format: string;
  round: number;
  match_number: number;
  bracket: string;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string | null;
  player2_name: string | null;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  status: string;
  next_match_id: string | null;
  loser_next_match_id: string | null;
  tournaments?: { name: string; format: string };
};

export default function ScoreboardPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Sets, setP1Sets] = useState(0);
  const [p2Sets, setP2Sets] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const fetchMatch = async () => {
      // Check access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: emp } = await supabase.from('employees').select('id').eq('email', user.email).single();
      const { data: adm } = await supabase.from('admins').select('email').eq('email', user.email).single();
      if (!emp && !adm) { router.push('/dashboard'); return; }

      const { data } = await supabase
        .from('tournament_matches')
        .select('*, tournaments(name, format)')
        .eq('id', matchId)
        .single();

      if (data) {
        setMatch(data);
        setP1Score(data.player1_score || 0);
        setP2Score(data.player2_score || 0);
        setP1Sets((data as unknown as { player1_sets?: number }).player1_sets || 0);
        setP2Sets((data as unknown as { player2_sets?: number }).player2_sets || 0);
      }
      setLoading(false);
    };
    fetchMatch();

    // Realtime updates
    const channel = supabase.channel(`match-${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournament_matches', filter: `id=eq.${matchId}` }, payload => {
        const m = payload.new as Match;
        setMatch(m);
        setP1Score(m.player1_score || 0);
        setP2Score(m.player2_score || 0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const saveScores = async () => {
    if (!match) return;
    setSaving(true);
    await supabase.from('tournament_matches').update({
      player1_score: p1Score,
      player2_score: p2Score,
      player1_sets: p1Sets,
      player2_sets: p2Sets,
      status: 'ongoing',
    }).eq('id', match.id);
    setSaving(false);
    setSuccess('Scores saved!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const endMatch = async () => {
    if (!match) return;
    if (p1Score === p2Score) { setError("Scores are tied — there must be a winner!"); setTimeout(() => setError(''), 3000); return; }
    setEnding(true);

    const winnerId = p1Score > p2Score ? match.player1_id : match.player2_id;
    const loserId = p1Score > p2Score ? match.player2_id : match.player1_id;
    const winnerName = p1Score > p2Score ? match.player1_name : match.player2_name;
    const loserName = p1Score > p2Score ? match.player2_name : match.player1_name;

    // Mark match as completed
    await supabase.from('tournament_matches').update({
      player1_score: p1Score,
      player2_score: p2Score,
      player1_sets: p1Sets,
      player2_sets: p2Sets,
      winner_id: winnerId,
      status: 'completed',
    }).eq('id', match.id);

    // Advance winner to next match
    if (match.next_match_id) {
      const { data: nextMatch } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', match.next_match_id)
        .single();

      if (nextMatch) {
        // Fill player1 first, then player2
        if (!nextMatch.player1_id) {
          await supabase.from('tournament_matches').update({ player1_id: winnerId, player1_name: winnerName }).eq('id', match.next_match_id);
        } else {
          await supabase.from('tournament_matches').update({ player2_id: winnerId, player2_name: winnerName }).eq('id', match.next_match_id);
        }
      }
    }

    // Double elim: drop loser to losers bracket
    if (match.loser_next_match_id && loserId) {
      const { data: loserMatch } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', match.loser_next_match_id)
        .single();

      if (loserMatch) {
        if (!loserMatch.player1_id) {
          await supabase.from('tournament_matches').update({ player1_id: loserId, player1_name: loserName }).eq('id', match.loser_next_match_id);
        } else {
          await supabase.from('tournament_matches').update({ player2_id: loserId, player2_name: loserName }).eq('id', match.loser_next_match_id);
        }
      }
    }

    // Check if tournament is over (no more pending/ongoing matches)
    const { data: remaining } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('tournament_id', match.tournament_id)
      .in('status', ['pending', 'ongoing']);

    if (!remaining || remaining.length === 0) {
      await supabase.from('tournaments').update({ status: 'completed' }).eq('id', match.tournament_id);
    }

    setEnding(false);
    setSuccess(`Match ended! Winner: ${winnerName}`);
    setTimeout(() => { router.push('/employee'); }, 2500);
  };

  if (loading) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14 }}>Loading match...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!match) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Match not found</div>
        <button onClick={() => router.push('/employee')} style={{ marginTop: 16, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
      </div>
    </div>
  );

  const isCompleted = match.status === 'completed';
  const bracketLabel: Record<string, string> = { winners: 'Winners Bracket', losers: 'Losers Bracket', grand_final: 'Grand Final' };
  const formatLabel: Record<string, string> = { single_elim: 'Single Elimination', double_elim: 'Double Elimination', round_robin: 'Round Robin' };

  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* HEADER */}
      <div style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/employee')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>←</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase' }}>{match.tournaments?.name || 'Tournament'}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: "'Barlow',sans-serif" }}>
              {formatLabel[match.format || match.tournaments?.format || ''] || match.tournaments?.format || match.format} · {bracketLabel[match.bracket] || match.bracket} · Round {match.round}, Match {match.match_number}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', background: isCompleted ? 'var(--success-bg)' : match.status === 'ongoing' ? 'var(--warning-bg)' : 'var(--bg-hover)', color: isCompleted ? 'var(--success-text)' : match.status === 'ongoing' ? 'var(--warning-text)' : 'var(--text-muted)' }}>
          {match.status}
        </span>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>

        {/* SCOREBOARD */}
        <div style={{ background: 'var(--card-bg)', border: `2px solid ${isCompleted ? 'var(--success-border)' : 'var(--border)'}`, borderRadius: 20, padding: 'clamp(24px,5vw,48px)', marginBottom: 24, animation: 'fadeUp .4s ease both' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center' }}>

            {/* Player 1 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-bg)', border: '2px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--accent)', margin: '0 auto 12px' }}>
                {match.player1_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{match.player1_name || 'TBD'}</div>
              {match.winner_id === match.player1_id && <div style={{ fontSize: 11, color: 'var(--success-text)', fontWeight: 700, marginBottom: 8 }}>🏆 WINNER</div>}

              {/* Sets counter */}
              {!isCompleted && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <button onClick={() => setP1Sets(s => Math.max(0, s - 1))} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>SETS: <span style={{ color: 'var(--accent)', fontSize: 16 }}>{p1Sets}</span></div>
                  <button onClick={() => setP1Sets(s => s + 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                </div>
              )}

              {/* Score control */}
              {!isCompleted && match.player1_id ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                  <button onClick={() => setP1Score(s => Math.max(0, s - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                  <div style={{ fontSize: 'clamp(48px,8vw,80px)', fontWeight: 900, lineHeight: 1, color: p1Score > p2Score ? 'var(--accent)' : 'var(--text-primary)', minWidth: 80, textAlign: 'center' }}>{p1Score}</div>
                  <button onClick={() => setP1Score(s => s + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                </div>
              ) : (
                <div style={{ fontSize: 'clamp(48px,8vw,80px)', fontWeight: 900, color: match.winner_id === match.player1_id ? 'var(--accent)' : 'var(--text-primary)', marginTop: 8 }}>{match.player1_score}</div>
              )}
            </div>

            {/* VS */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-hint)', letterSpacing: '.1em' }}>VS</div>
              {match.status === 'ongoing' && <div style={{ fontSize: 10, color: 'var(--warning-text)', fontWeight: 700, marginTop: 6, animation: 'pulse 1.5s infinite' }}>● LIVE</div>}
            </div>

            {/* Player 2 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-bg)', border: '2px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--accent)', margin: '0 auto 12px' }}>
                {match.player2_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{match.player2_name || 'TBD'}</div>
              {match.winner_id === match.player2_id && <div style={{ fontSize: 11, color: 'var(--success-text)', fontWeight: 700, marginBottom: 8 }}>🏆 WINNER</div>}

              {/* Sets counter */}
              {!isCompleted && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <button onClick={() => setP2Sets(s => Math.max(0, s - 1))} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>SETS: <span style={{ color: 'var(--accent)', fontSize: 16 }}>{p2Sets}</span></div>
                  <button onClick={() => setP2Sets(s => s + 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                </div>
              )}

              {!isCompleted && match.player2_id ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                  <button onClick={() => setP2Score(s => Math.max(0, s - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                  <div style={{ fontSize: 'clamp(48px,8vw,80px)', fontWeight: 900, lineHeight: 1, color: p2Score > p1Score ? 'var(--accent)' : 'var(--text-primary)', minWidth: 80, textAlign: 'center' }}>{p2Score}</div>
                  <button onClick={() => setP2Score(s => s + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                </div>
              ) : (
                <div style={{ fontSize: 'clamp(48px,8vw,80px)', fontWeight: 900, color: match.winner_id === match.player2_id ? 'var(--accent)' : 'var(--text-primary)', marginTop: 8 }}>{match.player2_score}</div>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        {!isCompleted && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', animation: 'fadeUp .4s .1s ease both' }}>
            <button onClick={saveScores} disabled={saving} style={{ flex: 1, height: 48, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
              {saving ? 'Saving...' : '💾 Save scores'}
            </button>
            <button onClick={endMatch} disabled={ending || !match.player1_id || !match.player2_id} style={{ flex: 2, height: 48, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', cursor: (ending || !match.player1_id || !match.player2_id) ? 'not-allowed' : 'pointer', opacity: (ending || !match.player1_id || !match.player2_id) ? .6 : 1 }}>
              {ending ? 'Ending match...' : '🏁 End match & advance winner'}
            </button>
          </div>
        )}

        {isCompleted && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 12, padding: '16px 20px', textAlign: 'center', animation: 'fadeUp .4s ease both' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--success-text)', textTransform: 'uppercase', marginBottom: 4 }}>Match completed</div>
            <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--success-text)' }}>
              Winner: <strong>{p1Score > p2Score ? match.player1_name : match.player2_name}</strong> ({match.player1_score} – {match.player2_score})
            </div>
            <button onClick={() => router.push('/employee')} style={{ marginTop: 12, background: 'transparent', border: '1px solid var(--success-border)', color: 'var(--success-text)', borderRadius: 8, padding: '8px 20px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>← Back to dashboard</button>
          </div>
        )}

        {error && <div style={{ marginTop: 12, background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--error-text)' }}>{error}</div>}
        {success && <div style={{ marginTop: 12, background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--success-text)' }}>{success}</div>}
      </div>
    </div>
  );
}