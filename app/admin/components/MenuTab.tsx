'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { MenuItem } from './types';

const EMPTY_MENU = { name:'', category:'snacks', price:0, is_available:true, description:'', stock:0 };

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
  .form-select{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;cursor:pointer;}
  .form-label{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px;display:block;font-family:'Barlow',sans-serif;}
  .stock-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;}
  .stock-out{background:var(--error-bg);color:var(--error-text);}
  .stock-low{background:var(--warning-bg);color:var(--warning-text);}
  .stock-ok{background:var(--success-bg);color:var(--success-text);}
`;

export default function MenuTab({ toast }: { toast: (msg: string) => void }) {
  const [menuItems, setMenuItems]     = useState<MenuItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editItem, setEditItem]       = useState<Record<string,unknown>|null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string|null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const supabase = createClient();

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('category').order('name');
    setMenuItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMenu(); }, []);

  const handleToggle = async (id: string, field: string, current: boolean) => {
    await supabase.from('menu_items').update({ [field]: !current }).eq('id', id);
    await fetchMenu(); toast('Updated!');
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    const { id, ...rest } = editItem as { id:string; [key:string]:unknown };
    // Auto re-enable item if admin sets stock above 0
    if (!isNew && typeof rest.stock === 'number' && rest.stock > 0) {
      rest.is_available = true;
    }
    const { error } = isNew
      ? await supabase.from('menu_items').insert(rest)
      : await supabase.from('menu_items').update(rest).eq('id', id);
    if (error) { toast('■ ' + error.message); setSaving(false); return; }
    toast(isNew ? 'Item added!' : 'Item saved!');
    await fetchMenu();
    setEditItem(null); setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    await supabase.from('menu_items').delete().eq('id', id);
    await fetchMenu(); toast('Removed!');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !uploadTarget) return;
    const file = e.target.files[0];
    setUploadingId(uploadTarget);
    const path = `${uploadTarget}-${Date.now()}`;
    const { data, error } = await supabase.storage.from('menu-images').upload(path, file, { upsert:true });
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(data.path);
      await supabase.from('menu_items').update({ image_url: publicUrl }).eq('id', uploadTarget);
      await fetchMenu(); toast('Image uploaded!');
    }
    setUploadingId(''); setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const categories = ['all', ...Array.from(new Set(menuItems.map(m => m.category)))];
  const filtered = menuItems.filter(m => categoryFilter === 'all' || m.category === categoryFilter);

  if (loading) return <div style={{padding:40,textAlign:'center',fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)'}}>Loading menu...</div>;

  return (
    <div>
      <style>{STYLES}</style>
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageUpload} aria-label="Upload image" />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:'clamp(20px,3vw,28px)',fontWeight:800,textTransform:'uppercase'}}>Food & Drinks</h1>
        <button className="btn add" onClick={() => { setEditItem({...EMPTY_MENU}); setIsNew(true); }}>+ Add item</button>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategoryFilter(c)} style={{fontSize:11,padding:'5px 12px',borderRadius:6,border:'1px solid var(--border)',background:categoryFilter===c?'var(--accent-bg)':'transparent',color:categoryFilter===c?'var(--accent)':'var(--text-muted)',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:'.04em',textTransform:'capitalize',transition:'all .2s'}}>
            {c}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Available</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7}><div className="empty">No items found</div></td></tr>
              : filtered.map(item => {
                  const stock = item.stock ?? 99;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{width:48,height:36,borderRadius:6,overflow:'hidden',background:'var(--bg-hover)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                          {item.image_url
                            ? <Image src={item.image_url} alt={item.name} fill sizes="48px" style={{ objectFit:'cover' }} />
                            : <span style={{fontSize:18}}>🍱</span>
                          }
                        </div>
                      </td>
                      <td style={{fontWeight:600}}>{item.name}</td>
                      <td style={{textTransform:'capitalize'}}>{item.category}</td>
                      <td style={{color:'var(--accent)',fontWeight:700}}>₱{item.price}</td>
                      <td>
                        <span className={`stock-badge ${stock===0?'stock-out':stock<=5?'stock-low':'stock-ok'}`}>
                          {stock === 0 ? 'Out' : stock <= 5 ? `Low (${stock})` : stock}
                        </span>
                      </td>
                      <td>
                        <button className={`toggle ${item.is_available?'on':'off'}`} onClick={() => handleToggle(item.id,'is_available',item.is_available)} aria-label="Toggle availability">
                          <div className="toggle-dot"/>
                        </button>
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn" onClick={() => { setEditItem({...item}); setIsNew(false); }}>Edit</button>
                          <button className="img-btn" onClick={() => { setUploadTarget(item.id); setTimeout(() => fileInputRef.current?.click(), 100); }}>{uploadingId===item.id?'...':'📷'}</button>
                          <button className="btn danger" onClick={() => handleDelete(item.id, item.name)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {editItem && (
        <div className="modal-wrap" onClick={e => e.target===e.currentTarget && setEditItem(null)}>
          <div className="modal-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:800,textTransform:'uppercase'}}>{isNew?'Add item':'Edit item'}</div>
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
                  ) : key === 'category' ? (
                    <select className="form-select" value={String(val)} onChange={e => setEditItem({...editItem,[key]:e.target.value})} aria-label="Category">
                      {['snacks','drinks','meals','desserts'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
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