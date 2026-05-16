'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Admin } from './types';

const STYLES = `
  .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-secondary);white-space:nowrap;}
  .tbl td{font-size:13px;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle;font-family:'Barlow',sans-serif;}
  .tbl tr:last-child td{border-bottom:none;}
  .tbl tr:hover td{background:var(--bg-hover);}
  .btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
  .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
  .btn:hover{border-color:var(--accent);color:var(--accent);}
  .btn.primary:hover{background:var(--accent-hover);}
  .btn.danger:hover{background:var(--error-bg);color:var(--error-text);border-color:var(--error-text);}
  .empty{text-align:center;padding:40px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
  .form-input{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;transition:border-color .2s;}
  .form-input:focus{border-color:var(--accent);}
  .msg-success{font-size:12px;color:var(--success-text);font-family:'Barlow',sans-serif;margin-top:6px;}
  .msg-error{font-size:12px;color:var(--error-text);font-family:'Barlow',sans-serif;margin-top:6px;}
`;

export default function AdminsTab({ toast, userEmail }: { toast: (msg: string) => void; userEmail: string }) {
  const [admins, setAdmins]     = useState<Admin[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding]     = useState(false);
  const [msg, setMsg]           = useState({ text:'', type:'' });

  const supabase = createClient();

  const fetchAdmins = async () => {
    const { data } = await supabase.from('admins').select('*').order('created_at');
    setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('admins').insert({ email: newEmail.trim().toLowerCase() });
    if (error) {
      setMsg({ text: error.code === '23505' ? 'That email is already an admin.' : error.message, type:'error' });
    } else {
      setMsg({ text:`✓ ${newEmail} added as admin.`, type:'success' });
      setNewEmail('');
      await fetchAdmins();
      toast('Admin added!');
    }
    setAdding(false);
    setTimeout(() => setMsg({ text:'', type:'' }), 3000);
  };

  const handleRemove = async (id: string, email: string) => {
    if (email === userEmail) { toast('❌ Cannot remove yourself'); return; }
    if (!confirm(`Remove admin "${email}"?`)) return;
    await supabase.from('admins').delete().eq('id', id);
    await fetchAdmins(); toast('Admin removed!');
  };

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading admins...</div>;

  return (
    <div>
      <style>{STYLES}</style>

      <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:800,textTransform:'uppercase',marginBottom:20}}>Admin users</h1>

      {/* ADD ADMIN */}
      <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:12,padding:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,textTransform:'uppercase',marginBottom:12}}>Add new admin</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <input className="form-input" style={{flex:1,minWidth:220}} type="email" placeholder="Enter email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAdd()} aria-label="New admin email" />
          <button className="btn primary" style={{height:38,paddingInline:20}} onClick={handleAdd} disabled={adding || !newEmail.trim()}>{adding?'Adding...':'Add admin'}</button>
        </div>
        {msg.text && <div className={msg.type==='success'?'msg-success':'msg-error'}>{msg.text}</div>}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Email</th><th>Added on</th><th>Actions</th></tr></thead>
          <tbody>
            {admins.length === 0
              ? <tr><td colSpan={3}><div className="empty">No admins found</div></td></tr>
              : admins.map(admin => (
                <tr key={admin.id}>
                  <td style={{fontWeight:600}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',flexShrink:0}}>{admin.email[0]?.toUpperCase()}</div>
                      {admin.email}
                      {admin.email === userEmail && <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:'var(--accent-bg)',color:'var(--accent)',fontWeight:700}}>YOU</span>}
                    </div>
                  </td>
                  <td style={{color:'var(--text-muted)'}}>{fmtDate(admin.created_at)}</td>
                  <td>
                    {admin.email !== userEmail && (
                      <button className="btn danger" onClick={() => handleRemove(admin.id, admin.email)}>Remove</button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}