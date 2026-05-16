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
  .btn:hover{border-color:var(--accent);color:var(--accent);}
  .btn.add:hover{background:var(--accent-hover);}
  .btn.danger:hover{background:var(--error-bg);color:var(--error-text);border-color:var(--error-text);}
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

export default function TournamentsTab({ toast }: { toast: (msg: string) => void }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editItem, setEditItem]       = useState<Record<string,unknown>|null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [saving, setSaving]           = useState(false);

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
    if (isNew) await supabase.from('tournaments').insert(rest);
    else await supabase.from('tournaments').update(rest).eq('id', id);
    toast(isNew ? 'Tournament added!' : 'Tournament saved!');
    await fetchTournaments();
    setEditItem(null); setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    await supabase.from('tournaments').delete().eq('id', id);
    await fetchTournaments(); toast('Removed!');
  };

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});

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