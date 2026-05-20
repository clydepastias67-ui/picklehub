'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Coach } from './types';

const EMPTY_COACH = { name:'', skill_level:'beginner', price_per_session:0, is_available:true, bio:'' };

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
  .toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s;position:relative;border:none;flex-shrink:0;}
  .toggle.on{background:var(--accent);}
  .toggle.off{background:var(--border-hover);}
  .toggle-dot{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;}
  .toggle.on .toggle-dot{left:18px;}
  .toggle.off .toggle-dot{left:2px;}
  .img-btn{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 10px;border-radius:6px;border:1px dashed var(--border-hover);background:transparent;color:var(--text-muted);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;}
  .img-btn:hover{border-color:var(--accent);color:var(--accent);}
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
  .level-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;text-transform:uppercase;}
  .level-beginner{background:#1a3a2a;color:#4ade80;}
  .level-intermediate{background:#2a2a1a;color:#fbbf24;}
  .level-advanced{background:#2a1a1a;color:#f87171;}
  .level-pro{background:#1a1a3a;color:#818cf8;}
`;

export default function CoachingTab({ toast }: { toast: (msg: string) => void }) {
  const [coaches, setCoaches]         = useState<Coach[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editItem, setEditItem]       = useState<Record<string,unknown>|null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string|null>(null);

  const supabase = createClient();

  const fetchCoaches = async () => {
    const { data } = await supabase.from('coaches').select('*').order('name');
    setCoaches(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoaches(); }, []);

  const handleToggle = async (id: string, field: string, current: boolean) => {
    await supabase.from('coaches').update({ [field]: !current }).eq('id', id);
    await fetchCoaches(); toast('Updated!');
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    const { id, ...rest } = editItem as { id:string; [key:string]:unknown };
    const { error } = isNew
      ? await supabase.from('coaches').insert(rest)
      : await supabase.from('coaches').update(rest).eq('id', id);
    if (error) { toast('■ ' + error.message); setSaving(false); return; }
    toast(isNew ? 'Coach added!' : 'Coach saved!');
    await fetchCoaches();
    setEditItem(null); setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove coach "${name}"?`)) return;
    await supabase.from('coaches').delete().eq('id', id);
    await fetchCoaches(); toast('Removed!');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !uploadTarget) return;
    const file = e.target.files[0];
    setUploadingId(uploadTarget);
    const path = `${uploadTarget}-${Date.now()}`;
    const { data, error } = await supabase.storage.from('coach-images').upload(path, file, { upsert:true });
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('coach-images').getPublicUrl(data.path);
      await supabase.from('coaches').update({ image_url: publicUrl }).eq('id', uploadTarget);
      await fetchCoaches(); toast('Image uploaded!');
    }
    setUploadingId(''); setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading coaches...</div>;

  return (
    <div>
      <style>{STYLES}</style>
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageUpload} aria-label="Upload coach image" />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:800,textTransform:'uppercase'}}>Coaching</h1>
        <button className="btn add" onClick={() => { setEditItem({...EMPTY_COACH}); setIsNew(true); }}>+ Add coach</button>
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Image</th><th>Name</th><th>Level</th><th>₱/session</th><th>Available</th><th>Actions</th></tr></thead>
          <tbody>
            {coaches.length === 0
              ? <tr><td colSpan={6}><div className="empty">No coaches yet — add one!</div></td></tr>
              : coaches.map(coach => (
                <tr key={coach.id}>
                  <td>
                    <div style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',background:'var(--bg-hover)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                      {coach.image_url
                        ? <Image src={coach.image_url} alt={coach.name} fill sizes="40px" style={{ objectFit:'cover', borderRadius:'50%' }} />
                        : <span style={{fontSize:18}}>👤</span>
                      }
                    </div>
                  </td>
                  <td style={{fontWeight:600}}>{coach.name}</td>
                  <td><span className={`level-badge level-${coach.skill_level}`}>{coach.skill_level}</span></td>
                  <td style={{color:'var(--accent)',fontWeight:700}}>₱{coach.price_per_session}</td>
                  <td>
                    <button className={`toggle ${coach.is_available?'on':'off'}`} onClick={() => handleToggle(coach.id,'is_available',coach.is_available)} aria-label="Toggle availability">
                      <div className="toggle-dot"/>
                    </button>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn" onClick={() => { setEditItem({...coach}); setIsNew(false); }}>Edit</button>
                      <button className="img-btn" onClick={() => { setUploadTarget(coach.id); setTimeout(() => fileInputRef.current?.click(), 100); }}>{uploadingId===coach.id?'...':'📷'}</button>
                      <button className="btn danger" onClick={() => handleDelete(coach.id, coach.name)}>Remove</button>
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
              <div style={{fontSize:20,fontWeight:800,textTransform:'uppercase'}}>{isNew?'Add coach':'Edit coach'}</div>
              <button onClick={() => setEditItem(null)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:22}} aria-label="Close">✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {Object.entries(editItem).filter(([k]) => !['id','created_at','image_url'].includes(k)).map(([key, val]) => (
                <div key={key}>
                  <label className="form-label">{key.replace(/_/g,' ')}</label>
                  {typeof val === 'boolean' ? (
                    <div style={{display:'flex',gap:16}}>
                      {[true,false].map(v => (
                        <label key={String(v)} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'var(--text-secondary)'}}>
                          <input type="radio" checked={val===v} onChange={() => setEditItem({...editItem,[key]:v})} /> {v?'Yes':'No'}
                        </label>
                      ))}
                    </div>
                  ) : key === 'skill_level' ? (
                    <select className="form-select" value={String(val)} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Skill level">
                      {['beginner','intermediate','advanced','pro'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : key === 'bio' ? (
                    <textarea className="form-textarea" value={String(val??'')} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Bio" />
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