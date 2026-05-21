'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tournament } from './types';

const EMPTY_TOURNAMENT = { name:'', date:'', max_players:0, entry_fee:0, status:'open', format:'single_elim', description:'' };

const STYLES = `
  .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-secondary);white-space:nowrap;}
  .tbl td{font-size:13px;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle;font-family:'Barlow',sans-serif;}
  .tbl tr:last-child td{border-bottom:none;}
  .tbl tr:hover td{background:var(--bg-hover);}
  .btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
  .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
  .btn.add{background:var(--accent);color:#fff;border-color:var(--accent);padding:8px 18px;font-size:13px;}
  .btn.generate{background:var(--warning-bg);color:var(--warning-text);border-color:var(--warning-text);padding:5px 12px;}
  .btn:hover{border-color:var(--accent);color:var(--accent);}
  .btn.add:hover{background:var(--accent-hover);}
  .btn.generate:hover{background:var(--warning-text);color:#fff;}
  .btn.danger:hover{background:var(--error-bg);color:var(--error-text);border-color:var(--error-text);}
  .btn:disabled{opacity:.5;cursor:not-allowed;}
  .actions{display:flex;gap:6px;flex-wrap:wrap;}
  .empty{text-align:center;padding:40px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
  .modal-wrap{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
  .modal-card{background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;}
  .form-input{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;transition:border-color .2s;}
  .form-input:focus{border-color:var(--accent);}
  .form-textarea{width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:10px 12px;outline:none;resize:vertical;min-height:80px;transition:border-color .2s;}
  .form-textarea:focus{border-color:var(--accent);}
  .form-select{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;cursor:pointer;}
  .form-label{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px;display:block;font-family:'Barlow',sans-serif;}
  .status-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;text-transform:uppercase;}
  .status-open{background:var(--success-bg);color:var(--success-text);}
  .status-closed{background:var(--error-bg);color:var(--error-text);}
  .status-ongoing{background:var(--warning-bg);color:var(--warning-text);}
  .status-completed{background:var(--bg-hover);color:var(--text-muted);}
`;

// ── Bracket generation helpers ──────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Next power-of-two >= n
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

type Player = { user_id: string; player_name: string };

type MatchInsert = {
  tournament_id: string;
  round: number;
  match_number: number;
  bracket: string;
  format: string;
  player1_id: string | null;
  player1_name: string | null;
  player2_id: string | null;
  player2_name: string | null;
  player1_score: number;
  player2_score: number;
  status: string;
  next_match_id?: string | null;
  loser_next_match_id?: string | null;
};

function buildSingleElim(players: Player[], tournamentId: string): MatchInsert[] {
  const size    = nextPow2(players.length);
  const numRounds = Math.log2(size);
  const matches: MatchInsert[] = [];

  const r1Count = size / 2;
  for (let i = 0; i < r1Count; i++) {
    const p1 = players[i * 2]     ?? null;
    const p2 = players[i * 2 + 1] ?? null;
    const isBye = p2 === null;
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: i + 1,
      bracket: 'winners',
      format: 'single_elim',
      player1_id:   p1?.user_id   ?? null,
      player1_name: p1?.player_name ?? null,
      player2_id:   p2?.user_id   ?? null,
      player2_name: p2?.player_name ?? null,
      player1_score: 0,
      player2_score: 0,
      status: isBye ? 'bye' : 'pending',
    });
  }

  for (let r = 2; r <= numRounds; r++) {
    const count = size / Math.pow(2, r);
    for (let i = 0; i < count; i++) {
      matches.push({
        tournament_id: tournamentId,
        round: r,
        match_number: i + 1,
        bracket: 'winners',
        format: 'single_elim',
        player1_id: null, player1_name: null,
        player2_id: null, player2_name: null,
        player1_score: 0, player2_score: 0,
        status: 'pending',
      });
    }
  }

  return matches;
}

function buildRoundRobin(players: Player[], tournamentId: string): MatchInsert[] {
  const ps = [...players];
  if (ps.length % 2 !== 0) ps.push({ user_id: 'bye', player_name: 'BYE' });
  const n = ps.length;
  const matches: MatchInsert[] = [];
  let matchNum = 1;

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const p1 = ps[i];
      const p2 = ps[n - 1 - i];
      if (p1.user_id === 'bye' || p2.user_id === 'bye') continue;
      matches.push({
        tournament_id: tournamentId,
        round: round + 1,
        match_number: matchNum++,
        bracket: 'winners',
        format: 'round_robin',
        player1_id: p1.user_id, player1_name: p1.player_name,
        player2_id: p2.user_id, player2_name: p2.player_name,
        player1_score: 0, player2_score: 0,
        status: 'pending',
      });
    }
    ps.splice(1, 0, ps.pop()!);
  }

  return matches;
}

function buildDoubleElim(players: Player[], tournamentId: string): MatchInsert[] {
  const size      = nextPow2(players.length);
  const wRounds   = Math.log2(size);
  const matches: MatchInsert[] = [];

  const r1Count = size / 2;
  for (let i = 0; i < r1Count; i++) {
    const p1 = players[i * 2]     ?? null;
    const p2 = players[i * 2 + 1] ?? null;
    const isBye = p2 === null;
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      match_number: i + 1,
      bracket: 'winners',
      format: 'double_elim',
      player1_id:   p1?.user_id   ?? null,
      player1_name: p1?.player_name ?? null,
      player2_id:   p2?.user_id   ?? null,
      player2_name: p2?.player_name ?? null,
      player1_score: 0, player2_score: 0,
      status: isBye ? 'bye' : 'pending',
    });
  }
  for (let r = 2; r <= wRounds; r++) {
    const count = size / Math.pow(2, r);
    for (let i = 0; i < count; i++) {
      matches.push({
        tournament_id: tournamentId,
        round: r,
        match_number: i + 1,
        bracket: 'winners',
        format: 'double_elim',
        player1_id: null, player1_name: null,
        player2_id: null, player2_name: null,
        player1_score: 0, player2_score: 0,
        status: 'pending',
      });
    }
  }

  const lRounds = 2 * (wRounds - 1);
  for (let r = 1; r <= lRounds; r++) {
    const count = Math.max(1, size / Math.pow(2, Math.ceil(r / 2) + 1));
    for (let i = 0; i < count; i++) {
      matches.push({
        tournament_id: tournamentId,
        round: r,
        match_number: i + 1,
        bracket: 'losers',
        format: 'double_elim',
        player1_id: null, player1_name: null,
        player2_id: null, player2_name: null,
        player1_score: 0, player2_score: 0,
        status: 'pending',
      });
    }
  }

  matches.push({
    tournament_id: tournamentId,
    round: 1,
    match_number: 1,
    bracket: 'grand_final',
    format: 'double_elim',
    player1_id: null, player1_name: null,
    player2_id: null, player2_name: null,
    player1_score: 0, player2_score: 0,
    status: 'pending',
  });

  return matches;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TournamentsTab({ toast }: { toast: (msg: string) => void }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editItem, setEditItem]       = useState<Record<string,unknown>|null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [generating, setGenerating]   = useState<string | null>(null);

  const supabase = createClient();

  const fetchTournaments = async () => {
    const { data } = await supabase.from('tournaments').select('*').order('date', { ascending: false });
    setTournaments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTournaments(); }, []);

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    const { id, ...rest } = editItem as { id:string; [key:string]:unknown };
    const { error } = isNew
      ? await supabase.from('tournaments').insert(rest)
      : await supabase.from('tournaments').update(rest).eq('id', id);
    if (error) { toast('■ ' + error.message); setSaving(false); return; }
    toast(isNew ? 'Tournament added!' : 'Tournament saved!');
    await fetchTournaments();
    setEditItem(null); setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    const { data: registrations } = await supabase
      .from('tournament_registrations')
      .select('id, status')
      .eq('tournament_id', id);
    const confirmed = (registrations || []).filter(r => r.status === 'confirmed');
    if (confirmed.length > 0) {
      toast(`■ Cannot delete — ${confirmed.length} confirmed registration${confirmed.length > 1 ? 's' : ''} for this tournament`);
      return;
    }
    if (registrations && registrations.length > 0) {
      await supabase.from('tournament_registrations').delete().eq('tournament_id', id);
    }
    await supabase.from('tournament_matches').delete().eq('tournament_id', id);
    await supabase.from('tournaments').delete().eq('id', id);
    await fetchTournaments(); toast('■ Removed!');
  };

  // ── Generate bracket ──────────────────────────────────────────────────────
  const handleGenerateBracket = async (tournament: Tournament) => {
    if (!confirm(`Generate bracket for "${tournament.name}"? This will set the tournament to "ongoing" and cannot be undone.`)) return;

    setGenerating(tournament.id);

    const { data: existing } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('tournament_id', tournament.id);
      .limit(1);

    if (existing && existing.length > 0) {
      toast('■ Bracket already exists for this tournament');
      setGenerating(null);
      return;
    }

    const { data: regs, error: regErr } = await supabase
      .from('tournament_registrations')
      .select('user_id, email')
      .eq('tournament_id', tournament.id);

    if (regErr) { toast('■ ' + regErr.message); setGenerating(null); return; }
    if (!regs || regs.length < 2) {
      toast('■ Need at least 2 confirmed registrations to generate a bracket');
      setGenerating(null);
      return;
    }

    const userIds = regs.map(r => r.user_id).filter(Boolean);
    const { data: profilesData } = userIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
    const profileMap = Object.fromEntries(
      (profilesData ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
    );

    const players: Player[] = shuffle(
      regs.map(r => ({
        user_id: r.user_id,
        player_name:
          profileMap[r.user_id] ||
          (r.email ? r.email.split('@')[0] : null) ||
          r.user_id.slice(0, 8),
      }))
    );

    let matchRows: MatchInsert[];
    if (tournament.format === 'round_robin') {
      matchRows = buildRoundRobin(players, tournament.id);
    } else if (tournament.format === 'double_elim') {
      matchRows = buildDoubleElim(players, tournament.id);
    } else {
      matchRows = buildSingleElim(players, tournament.id);
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('tournament_matches')
      .insert(matchRows)
      .select('id, round, match_number, bracket, status, player1_id, player1_name');

    if (insertErr || !inserted) {
      toast('■ Failed to insert matches: ' + (insertErr?.message ?? 'unknown error'));
      setGenerating(null);
      return;
    }

    if (tournament.format === 'single_elim') {
      await wireSingleElimLinks(inserted, tournament.id);
    } else if (tournament.format === 'double_elim') {
      await wireDoubleElimLinks(inserted, tournament.id);
    }

    const byeMatches = inserted.filter(m => m.status === 'bye');
    for (const bm of byeMatches) {
      if (!bm.player1_id) continue;
      const { data: fullBye } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', bm.id)
        .single();
      if (!fullBye?.next_match_id) continue;

      const { data: nextMatch } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', fullBye.next_match_id)
        .single();

      if (nextMatch) {
        const field = !nextMatch.player1_id ? 'player1' : 'player2';
        await supabase.from('tournament_matches').update({
          [`${field}_id`]: fullBye.player1_id,
          [`${field}_name`]: fullBye.player1_name,
        }).eq('id', fullBye.next_match_id);
      }
    }

    await supabase.from('tournaments').update({ status: 'ongoing' }).eq('tournament_id', tournament.id);

    await fetchTournaments();
    toast(`✓ Bracket generated for ${tournament.name}!`);
    setGenerating(null);
  };

  const wireSingleElimLinks = async (
    inserted: { id: string; round: number; match_number: number; bracket: string }[],
    tournamentId: string
  ) => {
    const winners = inserted.filter(m => m.bracket === 'winners').sort((a, b) =>
      a.round !== b.round ? a.round - b.round : a.match_number - b.match_number
    );
    const byRound: Record<number, typeof winners> = {};
    for (const m of winners) {
      if (!byRound[m.round]) byRound[m.round] = [];
      byRound[m.round].push(m);
    }
    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

    const updates: PromiseLike<unknown>[] = [];
    for (let ri = 0; ri < rounds.length - 1; ri++) {
      const current = byRound[rounds[ri]];
      const next    = byRound[rounds[ri + 1]];
      for (let i = 0; i < current.length; i++) {
        const nextMatchIdx = Math.floor(i / 2);
        const nextMatch    = next[nextMatchIdx];
        if (!nextMatch) continue;
        updates.push(
          supabase.from('tournament_matches')
            .update({ next_match_id: nextMatch.id })
            .eq('id', current[i].id)
            .eq('tournament_id', tournamentId)
            .then()
        );
      }
    }
    await Promise.all(updates);
  };

  const wireDoubleElimLinks = async (
    inserted: { id: string; round: number; match_number: number; bracket: string }[],
    tournamentId: string
  ) => {
    const winners    = inserted.filter(m => m.bracket === 'winners').sort((a, b) => a.round !== b.round ? a.round - b.round : a.match_number - b.match_number);
    const losers     = inserted.filter(m => m.bracket === 'losers').sort((a,  b) => a.round !== b.round ? a.round - b.round : a.match_number - b.match_number);
    const grandFinal = inserted.find(m => m.bracket === 'grand_final');

    const wByRound: Record<number, typeof winners> = {};
    for (const m of winners) { if (!wByRound[m.round]) wByRound[m.round] = []; wByRound[m.round].push(m); }
    const lByRound: Record<number, typeof losers> = {};
    for (const m of losers)  { if (!lByRound[m.round]) lByRound[m.round] = [];  lByRound[m.round].push(m); }

    const wRounds = Object.keys(wByRound).map(Number).sort((a, b) => a - b);
    const updates: PromiseLike<unknown>[] = [];

    // Winners → Winners advancement
    for (let ri = 0; ri < wRounds.length - 1; ri++) {
      const cur  = wByRound[wRounds[ri]];
      const next = wByRound[wRounds[ri + 1]];
      for (let i = 0; i < cur.length; i++) {
        const nextMatch = next?.[Math.floor(i / 2)];
        if (nextMatch) {
          updates.push(
            supabase.from('tournament_matches')
              .update({ next_match_id: nextMatch.id })
              .eq('id', cur[i].id)
              .eq('tournament_id', tournamentId)
              .then()
          );
        }
      }
    }

    // Winners final → grand final
    const lastWRound = wByRound[wRounds[wRounds.length - 1]];
    if (lastWRound?.[0] && grandFinal) {
      updates.push(
        supabase.from('tournament_matches')
          .update({ next_match_id: grandFinal.id })
          .eq('id', lastWRound[0].id)
          .eq('tournament_id', tournamentId)
          .then()
      );
    }

    // Losers → Losers advancement
    const lRoundNums = Object.keys(lByRound).map(Number).sort((a, b) => a - b);
    for (let ri = 0; ri < lRoundNums.length - 1; ri++) {
      const cur  = lByRound[lRoundNums[ri]];
      const next = lByRound[lRoundNums[ri + 1]];
      for (let i = 0; i < cur.length; i++) {
        const nextMatch = next?.[Math.floor(i / 2)];
        if (nextMatch) {
          updates.push(
            supabase.from('tournament_matches')
              .update({ next_match_id: nextMatch.id })
              .eq('id', cur[i].id)
              .eq('tournament_id', tournamentId)
              .then()
          );
        }
      }
    }

    // Losers final → grand final
    const lastLRound = lByRound[lRoundNums[lRoundNums.length - 1]];
    if (lastLRound?.[0] && grandFinal) {
      updates.push(
        supabase.from('tournament_matches')
          .update({ next_match_id: grandFinal.id })
          .eq('id', lastLRound[0].id)
          .eq('tournament_id', tournamentId)
          .then()
      );
    }

    // Winners R1 losers → LB R1 (drop-down)
    const wR1   = wByRound[wRounds[0]] ?? [];
    const lbR1  = lByRound[lRoundNums[0]] ?? [];
    for (let i = 0; i < wR1.length; i++) {
      const lbMatch = lbR1[Math.floor(i / 2)];
      if (lbMatch) {
        updates.push(
          supabase.from('tournament_matches')
            .update({ loser_next_match_id: lbMatch.id })
            .eq('id', wR1[i].id)
            .eq('tournament_id', tournamentId)
            .then()
        );
      }
    }

    await Promise.all(updates);
  };

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});

  const canGenerate = (t: Tournament) =>
    (t.status === 'open' || t.status === 'closed') && t.format !== 'swiss';

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading tournaments...</div>;

  return (
    <div>
      <style>{STYLES}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:800,textTransform:'uppercase'}}>Tournaments</h1>
        <button className="btn add" onClick={() => { setEditItem({...EMPTY_TOURNAMENT}); setIsNew(true); }}>+ Add tournament</button>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Date</th><th>Format</th><th>Entry ₱</th><th>Max players</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {tournaments.length === 0
              ? <tr><td colSpan={7}><div className="empty">No tournaments yet</div></td></tr>
              : tournaments.map(t => (
                <tr key={t.id}>
                  <td style={{fontWeight:600}}>{t.name}</td>
                  <td>{fmtDate(t.date)}</td>
                  <td style={{textTransform:'capitalize'}}>{t.format.replace(/_/g,' ')}</td>
                  <td style={{color:'var(--accent)',fontWeight:700}}>₱{t.entry_fee}</td>
                  <td>{t.max_players}</td>
                  <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                  <td>
                    <div className="actions">
                      {canGenerate(t) && (
                        <button
                          className="btn generate"
                          disabled={generating === t.id}
                          onClick={() => handleGenerateBracket(t)}
                          title="Seed registrations into matches and start the tournament"
                        >
                          {generating === t.id ? 'Generating…' : '⚡ Generate bracket'}
                        </button>
                      )}
                      <button className="btn" onClick={() => { setEditItem({...t}); setIsNew(false); }}>Edit</button>
                      <button className="btn danger" onClick={() => handleDelete(t.id, t.name)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {editItem && (
        <div className="modal-wrap" onClick={e => e.target===e.currentTarget && setEditItem(null)}>
          <div className="modal-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:800,textTransform:'uppercase'}}>{isNew?'Add tournament':'Edit tournament'}</div>
              <button onClick={() => setEditItem(null)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:22}} aria-label="Close">✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {Object.entries(editItem).filter(([k]) => !['id','created_at'].includes(k)).map(([key, val]) => (
                <div key={key}>
                  <label className="form-label">{key.replace(/_/g,' ')}</label>
                  {key === 'status' ? (
                    <select className="form-select" value={String(val)} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Status">
                      {['open','closed','ongoing','completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : key === 'format' ? (
                    <select className="form-select" value={String(val)} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Format">
                      {['single_elim','double_elim','round_robin','swiss'].map(f => <option key={f} value={f}>{f.replace(/_/g,' ')}</option>)}
                    </select>
                  ) : key === 'description' ? (
                    <textarea className="form-textarea" value={String(val??'')} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Description" />
                  ) : key === 'date' ? (
                    <input className="form-input" type="datetime-local" value={String(val??'')} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Date" />
                  ) : (
                    <input className="form-input" type={typeof val==='number'?'number':'text'} value={String(val??'')} onChange={e => setEditItem({...editItem,[key]:typeof val==='number'?Number(e.target.value):e.target.value})} aria-label={key} />
                  )}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10,marginTop:24}}>
              <button className="btn primary" style={{flex:1,height:44,fontSize:14}} onClick={handleSave} disabled={saving}>{saving?'Saving...':(isNew?'Add':'Save changes')}</button>
              <button className="btn" style={{height:44}} onClick={() => setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}