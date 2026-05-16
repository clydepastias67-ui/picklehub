'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Employee } from './types';

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
  .form-select{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;cursor:pointer;}
  .msg-success{font-size:12px;color:var(--success-text);font-family:'Barlow',sans-serif;margin-top:6px;}
  .msg-error{font-size:12px;color:var(--error-text);font-family:'Barlow',sans-serif;margin-top:6px;}
  .role-badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;text-transform:uppercase;}
  .role-manager{background:#1a1a3a;color:#818cf8;}
  .role-staff{background:var(--bg-hover);color:var(--text-muted);}
  .role-cashier{background:#2a1a1a;color:#f87171;}
`;

export default function EmployeesTab({ toast }: { toast: (msg: string) => void }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newEmp, setNewEmp]       = useState({ email:'', name:'', role:'staff' });
  const [adding, setAdding]       = useState(false);
  const [msg, setMsg]             = useState({ text:'', type:'' });
  const [editItem, setEditItem]   = useState<Employee|null>(null);
  const [saving, setSaving]       = useState(false);

  const supabase = createClient();

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('name');
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleAdd = async () => {
    if (!newEmp.email.trim() || !newEmp.name.trim()) return;
    setAdding(true);
    const { error } = await supabase.from('employees').insert({ email: newEmp.email.trim().toLowerCase(), name: newEmp.name.trim(), role: newEmp.role });
    if (error) {
      setMsg({ text: error.code === '23505' ? 'That email is already an employee.' : error.message, type:'error' });
    } else {
      setMsg({ text:`✓ ${newEmp.name} added as ${newEmp.role}.`, type:'success' });
      setNewEmp({ email:'', name:'', role:'staff' });
      await fetchEmployees();
      toast('Employee added!');
    }
    setAdding(false);
    setTimeout(() => setMsg({ text:'', type:'' }), 3000);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    await supabase.from('employees').update({ name: editItem.name, role: editItem.role, email: editItem.email }).eq('id', editItem.id);
    toast('Employee updated!');
    await fetchEmployees();
    setEditItem(null); setSaving(false);
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    await supabase.from('employees').delete().eq('id', id);
    await fetchEmployees(); toast('Removed!');
  };

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading employees...</div>;

  return (
    <div>
      <style>{STYLES}</style>

      <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:800,textTransform:'uppercase',marginBottom:20}}>Employees</h1>

      {/* ADD EMPLOYEE */}
      <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:12,padding:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,textTransform:'uppercase',marginBottom:12}}>Add new employee</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto auto',gap:10,flexWrap:'wrap',alignItems:'end'}}>
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:5,fontFamily:"'Barlow',sans-serif"}}>Name</div>
            <input className="form-input" type="text" placeholder="Full name" value={newEmp.name} onChange={e => setNewEmp({...newEmp,name:e.target.value})} aria-label="Employee name" />
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:5,fontFamily:"'Barlow',sans-serif"}}>Email</div>
            <input className="form-input" type="email" placeholder="Email address" value={newEmp.email} onChange={e => setNewEmp({...newEmp,email:e.target.value})} aria-label="Employee email" />
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:5,fontFamily:"'Barlow',sans-serif"}}>Role</div>
            <select className="form-select" value={newEmp.role} onChange={e => setNewEmp({...newEmp,role:e.target.value})} aria-label="Role">
              {['staff','manager','cashier'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn primary" style={{height:38,paddingInline:20,marginTop:'auto'}} onClick={handleAdd} disabled={adding || !newEmp.email.trim() || !newEmp.name.trim()}>{adding?'Adding...':'Add'}</button>
        </div>
        {msg.text && <div className={msg.type==='success'?'msg-success':'msg-error'}>{msg.text}</div>}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Added on</th><th>Actions</th></tr></thead>
          <tbody>
            {employees.length === 0
              ? <tr><td colSpan={5}><div className="empty">No employees yet</div></td></tr>
              : employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{fontWeight:600}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'var(--bg-hover)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0}}>{emp.name[0]?.toUpperCase()}</div>
                      {emp.name}
                    </div>
                  </td>
                  <td style={{color:'var(--text-muted)'}}>{emp.email}</td>
                  <td><span className={`role-badge role-${emp.role}`}>{emp.role}</span></td>
                  <td style={{color:'var(--text-muted)'}}>{fmtDate(emp.created_at)}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn" onClick={() => setEditItem({...emp})}>Edit</button>
                      <button className="btn danger" onClick={() => handleRemove(emp.id, emp.name)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editItem && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={e => e.target===e.currentTarget && setEditItem(null)}>
          <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:16,padding:28,width:'100%',maxWidth:420}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:800,textTransform:'uppercase'}}>Edit employee</div>
              <button onClick={() => setEditItem(null)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:22}} aria-label="Close">✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {['name','email'].map(key => (
                <div key={key}>
                  <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:5,fontFamily:"'Barlow',sans-serif"}}>{key}</div>
                  <input className="form-input" type="text" value={(editItem as Record<string,string>)[key]} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label={key} />
                </div>
              ))}
              <div>
                <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:5,fontFamily:"'Barlow',sans-serif"}}>Role</div>
                <select className="form-select" value={editItem.role} onChange={e => setEditItem({...editItem,role:e.target.value})} aria-label="Role">
                  {['staff','manager','cashier'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:24}}>
              <button className="btn primary" style={{flex:1,height:44,fontSize:14}} onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save changes'}</button>
              <button className="btn" style={{height:44}} onClick={() => setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}