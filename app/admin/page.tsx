'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';

type Booking = { id:string; status:string; total_price:number; created_at:string; start_time:string; courts?:{name:string}; };
type Court = { id:string; name:string; type:string; price_per_hour:number; is_available:boolean; image_url?:string; description?:string; };
type Coach = { id:string; name:string; skill_level:string; price_per_session:number; is_available:boolean; bio?:string; };
type MenuItem = { id:string; name:string; category:string; price:number; is_available:boolean; image_url?:string; description?:string; stock?:number; };
type Product = { id:string; name:string; category:string; price?:number; rental_price?:number; stock:number; low_stock_threshold?:number; is_for_sale:boolean; is_for_rent:boolean; image_url?:string; description?:string; };
type Tournament = { id:string; name:string; date:string; max_players:number; entry_fee:number; status:string; description?:string; };
type Admin = { id:string; email:string; created_at:string; };
type Employee = { id:string; email:string; name:string; role:string; created_at:string; };

const TABS = [
  { id:'overview',    label:'Overview',      icon:'▦' },
  { id:'bookings',    label:'Bookings',      icon:'📅' },
  { id:'courts',      label:'Courts',        icon:'🏓' },
  { id:'menu',        label:'Food & drinks', icon:'🍱' },
  { id:'shop',        label:'Shop',          icon:'🛍' },
  { id:'coaching',    label:'Coaching',      icon:'👤' },
  { id:'tournaments', label:'Tournaments',   icon:'🏆' },
  { id:'admins',      label:'Admin users',   icon:'🔐' },
  { id:'employees',   label:'Employees',     icon:'👷' },
];

const EMPTY_COURT   = { name:'', type:'indoor', price_per_hour:0, is_available:true, description:'' };
const EMPTY_MENU    = { name:'', category:'snacks', price:0, is_available:true, description:'', stock:0 };
const EMPTY_PRODUCT = { name:'', category:'rackets', price:0, rental_price:0, stock:0, is_for_sale:true, is_for_rent:false, description:'' };
const EMPTY_COACH   = { name:'', skill_level:'beginner', price_per_session:0, is_available:true, bio:'' };
const EMPTY_TOURNAMENT = { name:'', date:'', max_players:0, entry_fee:0, status:'open', description:'' };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState({ email:'', name:'', role:'staff' });
  const [empMsg, setEmpMsg] = useState({ text:'', type:'' });

  const [editItem, setEditItem] = useState<Record<string,unknown>|null>(null);
  const [editTable, setEditTable] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminMsg, setAdminMsg] = useState({ text:'', type:'' });
  const [actionMsg, setActionMsg] = useState('');
  const [bookingSort, setBookingSort] = useState<'start_time'|'created_at'>('start_time');
  const [bookingFilter, setBookingFilter] = useState('all');

  const [uploadingId, setUploadingId] = useState('');
  const [uploadTarget, setUploadTarget] = useState<{id:string;table:string;bucket:string}|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { window.location.href='/login'; return; }
      setUserEmail(user.email||'');
      const { data:adminData } = await supabase.from('admins').select('email').eq('email',user.email).single();
      if (!adminData) { window.location.href='/dashboard'; return; }
      setIsAdmin(true);
      await fetchAll();
      setLoading(false);
    };
    init();
  },[]);

  const fetchAll = async () => {
    const [
      {data:b},{data:c},{data:co},{data:m},{data:p},{data:t},{data:a}
    ] = await Promise.all([
      supabase.from('bookings').select('*,courts(name)').order('start_time',{ascending:false}),
      supabase.from('courts').select('*').order('name'),
      supabase.from('coaches').select('*').order('name'),
      supabase.from('menu_items').select('*').order('category'),
      supabase.from('products').select('*').order('category'),
      supabase.from('tournaments').select('*').order('date',{ascending:false}),
      supabase.from('admins').select('*').order('created_at'),
      supabase.from('employees').select('*').order('created_at'),
    ]);
    setBookings(b||[]); setCourts(c||[]); setCoaches(co||[]);
    setMenuItems(m||[]); setProducts(p||[]); setTournaments(t||[]); setAdmins(a||[]);
  };

  const toast = (msg:string) => { setActionMsg(msg); setTimeout(()=>setActionMsg(''),2500); };

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href='/'; };

  const handleAddEmployee = async () => {
    if (!newEmployee.email.trim()||!newEmployee.name.trim()) return;
    const {error} = await supabase.from('employees').insert({ email:newEmployee.email.trim(), name:newEmployee.name.trim(), role:newEmployee.role });
    if (error) setEmpMsg({text:error.message,type:'error'});
    else { setEmpMsg({text:`${newEmployee.name} added as employee!`,type:'success'}); setNewEmployee({email:'',name:'',role:'staff'}); await fetchAll(); }
    setTimeout(()=>setEmpMsg({text:'',type:''}),3000);
  };

  const handleRemoveEmployee = async (id:string) => {
    if (!confirm('Remove this employee?')) return;
    await supabase.from('employees').delete().eq('id',id);
    await fetchAll(); toast('Employee removed');
  };

  const handleToggle = async (table:string, id:string, field:string, current:boolean) => {
    await supabase.from(table).update({[field]:!current}).eq('id',id);
    await fetchAll(); toast('Updated!');
  };

  const openEdit = (item:Record<string,unknown>, table:string, blank=false) => {
    setEditItem({...item}); setEditTable(table); setIsNew(blank);
  };

  const handleSave = async () => {
    if (!editItem||!editTable) return;
    setSaving(true);
    const {id, ...rest} = editItem as {id:string;[key:string]:unknown};
    if (isNew) {
      await supabase.from(editTable).insert(rest);
      toast('Added successfully!');
    } else {
      await supabase.from(editTable).update(rest).eq('id',id);
      toast('Saved successfully!');
    }
    await fetchAll();
    setEditItem(null); setEditTable(''); setSaving(false);
  };

  const handleDelete = async (table:string, id:string, name:string) => {
    if (!confirm(`Are you sure you want to remove "${name}"? This cannot be undone.`)) return;
    await supabase.from(table).delete().eq('id',id);
    await fetchAll(); toast('Removed successfully!');
  };

  const handleBookingStatus = async (id:string, status:string) => {
    await supabase.from('bookings').update({status}).eq('id',id);
    await fetchAll(); toast(`Booking ${status}`);
  };

  const handleImageUpload = async (e:React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]||!uploadTarget) return;
    const file = e.target.files[0];
    setUploadingId(uploadTarget.id);
    const path = `${uploadTarget.id}-${Date.now()}`;
    const {data,error} = await supabase.storage.from(uploadTarget.bucket).upload(path,file,{upsert:true});
    if (!error&&data) {
      const {data:{publicUrl}} = supabase.storage.from(uploadTarget.bucket).getPublicUrl(data.path);
      await supabase.from(uploadTarget.table).update({image_url:publicUrl}).eq('id',uploadTarget.id);
      await fetchAll(); toast('Image uploaded!');
    }
    setUploadingId(''); setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value='';
  };

  const triggerUpload = (id:string, table:string, bucket:string) => {
    setUploadTarget({id,table,bucket});
    setTimeout(()=>fileInputRef.current?.click(),100);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    const {error} = await supabase.from('admins').insert({email:newAdminEmail.trim()});
    if (error) setAdminMsg({text:error.message,type:'error'});
    else { setAdminMsg({text:`${newAdminEmail} is now an admin!`,type:'success'}); setNewAdminEmail(''); await fetchAll(); }
    setTimeout(()=>setAdminMsg({text:'',type:''}),3000);
  };

  const handleRemoveAdmin = async (email:string) => {
    if (email===userEmail) { setAdminMsg({text:"You can't remove yourself!",type:'error'}); return; }
    await supabase.from('admins').delete().eq('email',email);
    await fetchAll();
  };

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
  const fmtTime = (d:string) => new Date(d).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'});

  const sortedBookings = [...bookings]
    .filter(b => bookingFilter==='all' || b.status===bookingFilter)
    .sort((a,b) => bookingSort==='start_time'
      ? new Date(b.start_time).getTime()-new Date(a.start_time).getTime()
      : new Date(b.created_at).getTime()-new Date(a.created_at).getTime()
    );

  const totalRevenue = bookings.filter(b=>b.status==='confirmed').reduce((s,b)=>s+(b.total_price||0),0);

  if (loading) return (
    <div style={{fontFamily:"'Barlow Condensed',sans-serif",background:'var(--bg-primary)',color:'var(--text-primary)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'2px solid var(--border)',borderTop:'2px solid var(--accent)',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
        <div style={{fontFamily:"'Barlow',sans-serif",color:'var(--text-muted)',fontSize:14}}>Verifying admin access...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div style={{fontFamily:"'Barlow Condensed',sans-serif",background:'var(--bg-primary)',color:'var(--text-primary)',minHeight:'100vh'}}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .sidebar{width:230px;background:var(--sidebar-bg);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:50;transition:transform .3s;overflow-y:auto;}
        .main{margin-left:230px;min-height:100vh;}
        @media(max-width:900px){
          .sidebar{display:none;}
          .sidebar.open{display:flex;transform:none;}
          .main{margin-left:0 !important;width:100% !important;}
          .mobile-bar{display:flex !important;}
          .admin-bottom-nav{display:flex !important;}
        }

        .nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;color:var(--text-muted);cursor:pointer;transition:all .2s;margin:1px 8px;text-transform:uppercase;letter-spacing:.04em;}
        .nav-item:hover{background:var(--bg-hover);color:var(--text-secondary);}
        .nav-item.active{background:var(--accent-bg);color:var(--accent-light);}

        .stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;animation:fadeUp .4s ease both;}
        .stat-label{font-size:11px;font-family:'Barlow',sans-serif;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;}
        .stat-val{font-size:30px;font-weight:800;line-height:1;}
        .stat-sub{font-size:12px;font-family:'Barlow',sans-serif;color:var(--text-muted);margin-top:4px;}

        .table-wrap{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;animation:fadeUp .4s ease both;}
        .tbl{width:100%;border-collapse:collapse;}
        .tbl th{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);padding:12px 14px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg-secondary);white-space:nowrap;}
        .tbl td{font-size:13px;padding:11px 14px;border-bottom:1px solid var(--border);vertical-align:middle;font-family:'Barlow',sans-serif;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tr:hover td{background:var(--bg-hover);}

        .badge{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
        .badge-confirmed{background:var(--success-bg);color:var(--success-text);}
        .badge-pending{background:var(--warning-bg);color:var(--warning-text);}
        .badge-cancelled{background:var(--error-bg);color:var(--error-text);}
        .badge-open{background:var(--success-bg);color:var(--success-text);}
        .badge-ongoing{background:var(--warning-bg);color:var(--warning-text);}
        .badge-completed{background:var(--bg-hover);color:var(--text-muted);}

        .btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
        .btn:hover{border-color:var(--accent);color:var(--accent);}
        .btn.primary{background:var(--accent);color:#fff;border-color:var(--accent);}
        .btn.primary:hover{background:var(--accent-hover);}
        .btn.danger{border-color:var(--error-border);}
        .btn.danger:hover{background:var(--error-bg);color:var(--error-text);border-color:var(--error-text);}
        .btn.add{background:var(--accent);color:#fff;border-color:var(--accent);padding:8px 18px;font-size:13px;}
        .btn.add:hover{background:var(--accent-hover);}

        .toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;transition:background .2s;position:relative;border:none;flex-shrink:0;}
        .toggle.on{background:var(--accent);}
        .toggle.off{background:var(--border-hover);}
        .toggle-dot{position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;}
        .toggle.on .toggle-dot{left:18px;}
        .toggle.off .toggle-dot{left:2px;}

        .form-input{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;transition:border-color .2s;}
        .form-input:focus{border-color:var(--accent);}
        .form-input::placeholder{color:var(--text-hint);}
        .form-select{width:100%;height:38px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-family:'Barlow',sans-serif;font-size:14px;padding:0 12px;outline:none;cursor:pointer;}
        .form-label{font-size:11px;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px;display:block;font-family:'Barlow',sans-serif;}

        .section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
        .section-title{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;}

        .modal-wrap{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;}
        .modal-card{background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:28px;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;animation:fadeIn .2s ease both;}

        .toast{position:fixed;bottom:24px;right:24px;background:var(--accent);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:700;z-index:300;animation:fadeIn .2s ease both;letter-spacing:.04em;text-transform:uppercase;}

        .img-btn{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 10px;border-radius:6px;border:1px dashed var(--border-hover);background:transparent;color:var(--text-muted);cursor:pointer;transition:all .2s;font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;}
        .img-btn:hover{border-color:var(--accent);color:var(--accent);}

        .sort-btn{font-size:11px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:.04em;text-transform:uppercase;transition:all .2s;}
        .sort-btn.active{background:var(--accent-bg);color:var(--accent);border-color:var(--accent);}

        .mobile-bar{display:none;background:var(--nav-bg);border-bottom:1px solid var(--border);padding:0 20px;height:52px;align-items:center;justify-content:space-between;width:100%;}

        /* Admin bottom nav */
        .admin-bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--nav-bg);border-top:1px solid var(--border);z-index:100;height:60px;align-items:center;justify-content:space-around;padding:0 4px;}
        .abn-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px;cursor:pointer;flex:1;border:none;background:transparent;transition:all .2s;}
        .abn-item.active .abn-label{color:var(--accent);}
        .abn-icon{font-size:16px;line-height:1;}
        .abn-label{font-size:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;}

        .signout-btn{width:100%;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:8px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
        .signout-btn:hover{border-color:var(--error-text);color:var(--error-text);}

        .stock-badge{font-size:12px;font-weight:700;padding:2px 8px;border-radius:6px;}
        .stock-low{background:var(--error-bg);color:var(--error-text);}
        .stock-mid{background:var(--warning-bg);color:var(--warning-text);}
        .stock-ok{background:var(--success-bg);color:var(--success-text);}

        .empty{text-align:center;padding:40px;font-family:'Barlow',sans-serif;font-size:14px;color:var(--text-muted);}
        .actions{display:flex;gap:6px;flex-wrap:wrap;}
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageUpload} aria-label="Upload image" title="Upload image" />

      {/* SIDEBAR */}
      <div className={`sidebar ${sidebarOpen?'open':''}`}>
        <div style={{padding:'18px 16px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <a href="/" style={{display:'flex',alignItems:'center',gap:8,textDecoration:'none',color:'var(--text-primary)'}}>
            <div style={{width:8,height:8,background:'var(--accent)',borderRadius:'50%'}}/>
            <span style={{fontSize:17,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em'}}>PickleHub</span>
          </a>
          <div style={{fontSize:10,color:'var(--accent)',letterSpacing:'0.1em',textTransform:'uppercase',marginTop:4,fontFamily:"'Barlow',sans-serif"}}>Admin panel</div>
        </div>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:32,height:32,background:'var(--accent)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',flexShrink:0}}>{userEmail[0]?.toUpperCase()||'A'}</div>
            <div style={{overflow:'hidden'}}>
              <div style={{fontSize:12,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Admin</div>
              <div style={{fontSize:11,color:'var(--text-muted)',fontFamily:"'Barlow',sans-serif",whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userEmail}</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:'8px 0'}}>
          <div style={{padding:'8px 16px 4px',fontSize:10,color:'var(--text-hint)',letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:"'Barlow',sans-serif"}}>Sections</div>
          {TABS.map(tab=>(
            <div key={tab.id} className={`nav-item ${activeTab===tab.id?'active':''}`} onClick={()=>{setActiveTab(tab.id);setSidebarOpen(false);}}>
              <span style={{fontSize:14}}>{tab.icon}</span>{tab.label}
            </div>
          ))}
        </nav>
        <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
          <ThemeToggle />
          <a href="/dashboard" style={{display:'block',textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:'var(--text-muted)',textDecoration:'none',padding:'4px 0'}}>← Player dashboard</a>
          <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      {/* MOBILE BAR */}
      <div className="mobile-bar">
        <span style={{fontSize:15,fontWeight:800,textTransform:'uppercase'}}>Admin</span>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <ThemeToggle />
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} title="Toggle menu" aria-label="Toggle menu" style={{background:'none',border:'none',color:'var(--text-primary)',cursor:'pointer',fontSize:20}}>☰</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div style={{padding:'clamp(16px,3vw,28px) clamp(12px,3vw,28px) 80px'}}>

          {/* ── OVERVIEW ── */}
          {activeTab==='overview' && (
            <div>
              <div className="section-header">
                <div>
                  <div style={{fontSize:11,color:'var(--accent)',letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:"'Barlow',sans-serif",marginBottom:4}}>{new Date().toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}</div>
                  <h1 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:800,textTransform:'uppercase',lineHeight:1}}>Dashboard <span style={{color:'var(--accent)'}}>overview</span></h1>
                </div>
              </div>
              {/* Weekly report + email controls */}
              <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 18px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase'}}>Weekly report email</div>
                  <div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:'var(--text-muted)',marginTop:2}}>Auto-sent every Sunday 7PM · or trigger manually</div>
                </div>
                <button className="btn primary" onClick={async()=>{
                  try {
                    const res = await fetch('/api/email/weekly-report',{
                      method:'POST',
                      headers:{'Content-Type':'application/json','x-cron-secret':process.env.NEXT_PUBLIC_CRON_SECRET||''}
                    });
                    const d = await res.json();
                    toast(d.success ? `✅ Report sent to ${d.sent_to} admin${d.sent_to>1?'s':''}!` : `❌ ${d.error||'Failed'}`);
                  } catch(e) {
                    toast('❌ Failed to send report');
                  }
                }}>Send now</button>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:12,marginBottom:24}}>
                {[
                  {label:'Total revenue',val:`₱${totalRevenue.toLocaleString()}`,sub:'Confirmed only'},
                  {label:'Total bookings',val:bookings.length,sub:`${bookings.filter(b=>b.status==='confirmed').length} confirmed`},
                  {label:'Pending',val:bookings.filter(b=>b.status==='pending').length,sub:'Awaiting action'},
                  {label:'Courts',val:courts.length,sub:`${courts.filter(c=>c.is_available).length} available`},
                  {label:'Coaches',val:coaches.length,sub:`${coaches.filter(c=>c.is_available).length} active`},
                  {label:'Tournaments',val:tournaments.length,sub:`${tournaments.filter(t=>t.status==='open').length} open`},
                ].map((s,i)=>(
                  <div key={i} className="stat-card" style={{animationDelay:`${i*0.07}s`}}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-val">{s.val}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="table-wrap">
                <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:15,fontWeight:700,textTransform:'uppercase'}}>Recent bookings</div>
                  <button className="btn" onClick={()=>setActiveTab('bookings')}>View all</button>
                </div>
                <table className="tbl">
                  <thead><tr><th>Court</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {bookings.slice(0,8).map(b=>(
                      <tr key={b.id}>
                        <td style={{fontWeight:600}}>{b.courts?.name||'—'}</td>
                        <td>{fmtDate(b.start_time)} {fmtTime(b.start_time)}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>₱{b.total_price?.toLocaleString()}</td>
                        <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BOOKINGS ── */}
          {activeTab==='bookings' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Bookings</h1>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['all','pending','confirmed','cancelled'].map(f=>(
                    <button key={f} className={`sort-btn ${bookingFilter===f?'active':''}`} onClick={()=>setBookingFilter(f)} style={{textTransform:'capitalize'}}>{f}</button>
                  ))}
                  <div style={{width:1,background:'var(--border)',margin:'0 4px'}}/>
                  <button className={`sort-btn ${bookingSort==='start_time'?'active':''}`} onClick={()=>setBookingSort('start_time')}>By date</button>
                  <button className={`sort-btn ${bookingSort==='created_at'?'active':''}`} onClick={()=>setBookingSort('created_at')}>By created</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Court</th><th>Booking date</th><th>Booked on</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {sortedBookings.length===0 ? <tr><td colSpan={6}><div className="empty">No bookings found</div></td></tr> :
                    sortedBookings.map(b=>(
                      <tr key={b.id}>
                        <td style={{fontWeight:600}}>{b.courts?.name||'—'}</td>
                        <td>{fmtDate(b.start_time)} {fmtTime(b.start_time)}</td>
                        <td style={{color:'var(--text-muted)'}}>{fmtDate(b.created_at)}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>₱{b.total_price?.toLocaleString()}</td>
                        <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                        <td>
                          <div className="actions">
                            {b.status==='pending'&&<button className="btn primary" onClick={()=>handleBookingStatus(b.id,'confirmed')}>Confirm</button>}
                            {b.status!=='cancelled'&&<button className="btn danger" onClick={()=>handleBookingStatus(b.id,'cancelled')}>Cancel</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── COURTS ── */}
          {activeTab==='courts' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Courts</h1>
                <button className="btn add" onClick={()=>openEdit({...EMPTY_COURT},'courts',true)}>+ Add court</button>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Image</th><th>Name</th><th>Type</th><th>₱/hr</th><th>Available</th><th>Actions</th></tr></thead>
                  <tbody>
                    {courts.length===0?<tr><td colSpan={6}><div className="empty">No courts yet — add one!</div></td></tr>:
                    courts.map(court=>(
                      <tr key={court.id}>
                        <td>
                          <div style={{width:48,height:36,borderRadius:6,overflow:'hidden',background:'var(--bg-hover)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {court.image_url?<img src={court.image_url} alt={court.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:18}}>🏓</span>}
                          </div>
                        </td>
                        <td style={{fontWeight:600}}>{court.name}</td>
                        <td style={{textTransform:'capitalize'}}>{court.type}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>₱{court.price_per_hour}</td>
                        <td>
                          <button className={`toggle ${court.is_available?'on':'off'}`} onClick={()=>handleToggle('courts',court.id,'is_available',court.is_available)} title="Toggle availability" aria-label="Toggle availability">
                            <div className="toggle-dot"/>
                          </button>
                        </td>
                        <td>
                          <div className="actions">
                            <button className="btn" onClick={()=>openEdit({...court},'courts')}>Edit</button>
                            <button className="img-btn" onClick={()=>triggerUpload(court.id,'courts','court-images')}>{uploadingId===court.id?'...':'📷'}</button>
                            <button className="btn danger" onClick={()=>handleDelete('courts',court.id,court.name)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MENU ── */}
          {activeTab==='menu' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Food & drinks</h1>
                <button className="btn add" onClick={()=>openEdit({...EMPTY_MENU},'menu_items',true)}>+ Add item</button>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Available</th><th>Actions</th></tr></thead>
                  <tbody>
                    {menuItems.length===0?<tr><td colSpan={7}><div className="empty">No menu items yet — add one!</div></td></tr>:
                    menuItems.map(item=>(
                      <tr key={item.id}>
                        <td>
                          <div style={{width:48,height:36,borderRadius:6,overflow:'hidden',background:'var(--bg-hover)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {item.image_url?<img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:18}}>{item.category==='snacks'?'🥨':item.category==='drinks'?'🧃':'🍱'}</span>}
                          </div>
                        </td>
                        <td style={{fontWeight:600}}>{item.name}</td>
                        <td style={{textTransform:'capitalize'}}>{item.category}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>₱{item.price}</td>
                        <td>
                          <span className={`stock-badge ${(item.stock||0)<5?'stock-low':(item.stock||0)<10?'stock-mid':'stock-ok'}`}>
                            {item.stock||0} left
                          </span>
                        </td>
                        <td>
                          <button className={`toggle ${item.is_available?'on':'off'}`} onClick={()=>handleToggle('menu_items',item.id,'is_available',item.is_available)} title="Toggle availability" aria-label="Toggle availability">
                            <div className="toggle-dot"/>
                          </button>
                        </td>
                        <td>
                          <div className="actions">
                            <button className="btn" onClick={()=>openEdit({...item},'menu_items')}>Edit</button>
                            <button className="img-btn" onClick={()=>triggerUpload(item.id,'menu_items','menu-images')}>{uploadingId===item.id?'...':'📷'}</button>
                            <button className="btn danger" onClick={()=>handleDelete('menu_items',item.id,item.name)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SHOP ── */}
          {activeTab==='shop' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Shop & inventory</h1>
                <button className="btn add" onClick={()=>openEdit({...EMPTY_PRODUCT},'products',true)}>+ Add product</button>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Buy</th><th>Rent</th><th>Stock</th><th>Alert at</th><th>Actions</th></tr></thead>
                  <tbody>
                    {products.length===0?<tr><td colSpan={7}><div className="empty">No products yet — add one!</div></td></tr>:
                    products.map(p=>(
                      <tr key={p.id}>
                        <td>
                          <div style={{width:48,height:36,borderRadius:6,overflow:'hidden',background:'var(--bg-hover)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {p.image_url?<img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:18}}>🏓</span>}
                          </div>
                        </td>
                        <td style={{fontWeight:600}}>{p.name}</td>
                        <td style={{textTransform:'capitalize'}}>{p.category}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>{p.price?`₱${p.price}`:'—'}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>{p.rental_price?`₱${p.rental_price}`:'—'}</td>
                        <td>
                          <span className={`stock-badge ${p.stock<5?'stock-low':p.stock<10?'stock-mid':'stock-ok'}`}>
                            {p.stock} left
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button className="btn" onClick={()=>openEdit({...p},'products')}>Edit</button>
                            <button className="img-btn" onClick={()=>triggerUpload(p.id,'products','product-images')}>{uploadingId===p.id?'...':'📷'}</button>
                            <button className="btn danger" onClick={()=>handleDelete('products',p.id,p.name)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── COACHING ── */}
          {activeTab==='coaching' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Coaching</h1>
                <button className="btn add" onClick={()=>openEdit({...EMPTY_COACH},'coaches',true)}>+ Add coach</button>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Skill level</th><th>₱/session</th><th>Available</th><th>Actions</th></tr></thead>
                  <tbody>
                    {coaches.length===0?<tr><td colSpan={5}><div className="empty">No coaches yet — add one!</div></td></tr>:
                    coaches.map(coach=>(
                      <tr key={coach.id}>
                        <td style={{fontWeight:600}}>{coach.name}</td>
                        <td style={{textTransform:'capitalize'}}>{coach.skill_level}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>₱{coach.price_per_session}</td>
                        <td>
                          <button className={`toggle ${coach.is_available?'on':'off'}`} onClick={()=>handleToggle('coaches',coach.id,'is_available',coach.is_available)} title="Toggle availability" aria-label="Toggle availability">
                            <div className="toggle-dot"/>
                          </button>
                        </td>
                        <td>
                          <div className="actions">
                            <button className="btn" onClick={()=>openEdit({...coach},'coaches')}>Edit</button>
                            <button className="btn danger" onClick={()=>handleDelete('coaches',coach.id,coach.name)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TOURNAMENTS ── */}
          {activeTab==='tournaments' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Tournaments</h1>
                <button className="btn add" onClick={()=>openEdit({...EMPTY_TOURNAMENT},'tournaments',true)}>+ Add tournament</button>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Date</th><th>Max players</th><th>Entry fee</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {tournaments.length===0?<tr><td colSpan={6}><div className="empty">No tournaments yet — add one!</div></td></tr>:
                    tournaments.map(t=>(
                      <tr key={t.id}>
                        <td style={{fontWeight:600}}>{t.name}</td>
                        <td>{fmtDate(t.date)}</td>
                        <td>{t.max_players}</td>
                        <td style={{color:'var(--accent)',fontWeight:700}}>₱{t.entry_fee}</td>
                        <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                        <td>
                          <div className="actions">
                            <button className="btn" onClick={()=>openEdit({...t},'tournaments')}>Edit</button>
                            {t.status==='open'&&<button className="btn primary" onClick={async()=>{await supabase.from('tournaments').update({status:'ongoing'}).eq('id',t.id);await fetchAll();}}>Start</button>}
                            {t.status==='ongoing'&&<button className="btn" onClick={async()=>{await supabase.from('tournaments').update({status:'completed'}).eq('id',t.id);await fetchAll();}}>Complete</button>}
                            <button className="btn danger" onClick={()=>handleDelete('tournaments',t.id,t.name)}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EMPLOYEES ── */}
          {activeTab==='employees' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Employees</h1>
              </div>
              <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:12,padding:20,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:700,textTransform:'uppercase',marginBottom:14}}>Add new employee</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <input className="form-input" type="text" placeholder="Full name" value={newEmployee.name} onChange={e=>setNewEmployee({...newEmployee,name:e.target.value})} title="Employee name" aria-label="Employee name" style={{flex:1,minWidth:140}} />
                  <input className="form-input" type="email" placeholder="email@example.com" value={newEmployee.email} onChange={e=>setNewEmployee({...newEmployee,email:e.target.value})} title="Employee email" aria-label="Employee email" style={{flex:1,minWidth:180}} />
                  <select className="form-select" value={newEmployee.role} onChange={e=>setNewEmployee({...newEmployee,role:e.target.value})} title="Role" aria-label="Role" style={{width:140}}>
                    {['staff','supervisor','cashier','coach'].map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                  <button className="btn add" onClick={handleAddEmployee}>Add employee</button>
                </div>
                {empMsg.text&&<div style={{marginTop:10,fontFamily:"'Barlow',sans-serif",fontSize:13,color:empMsg.type==='error'?'var(--error-text)':'var(--success-text)'}}>{empMsg.text}</div>}
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Added on</th><th>Actions</th></tr></thead>
                  <tbody>
                    {employees.length===0?<tr><td colSpan={5}><div className="empty">No employees yet — add one!</div></td></tr>:
                    employees.map(emp=>(
                      <tr key={emp.id}>
                        <td style={{fontWeight:600}}>{emp.name}</td>
                        <td>{emp.email}</td>
                        <td style={{textTransform:'capitalize'}}>{emp.role}</td>
                        <td>{new Date(emp.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</td>
                        <td><button className="btn danger" onClick={()=>handleRemoveEmployee(emp.id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ADMINS ── */}
          {activeTab==='admins' && (
            <div>
              <div className="section-header">
                <h1 className="section-title">Admin users</h1>
              </div>
              <div style={{background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:12,padding:20,marginBottom:20}}>
                <div style={{fontSize:14,fontWeight:700,textTransform:'uppercase',marginBottom:14}}>Add new admin</div>
                <div style={{display:'flex',gap:10}}>
                  <input className="form-input" type="email" placeholder="email@example.com" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} title="New admin email" aria-label="New admin email" onKeyDown={e=>e.key==='Enter'&&handleAddAdmin()} />
                  <button className="btn add" style={{whiteSpace:'nowrap'}} onClick={handleAddAdmin}>Add admin</button>
                </div>
                {adminMsg.text&&<div style={{marginTop:10,fontFamily:"'Barlow',sans-serif",fontSize:13,color:adminMsg.type==='error'?'var(--error-text)':'var(--success-text)'}}>{adminMsg.text}</div>}
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead><tr><th>Email</th><th>Added on</th><th>Actions</th></tr></thead>
                  <tbody>
                    {admins.map(admin=>(
                      <tr key={admin.id}>
                        <td style={{fontWeight:600}}>
                          {admin.email}
                          {admin.email===userEmail&&<span style={{marginLeft:8,fontSize:10,background:'var(--accent-bg)',color:'var(--accent)',padding:'2px 8px',borderRadius:20}}>You</span>}
                        </td>
                        <td>{fmtDate(admin.created_at)}</td>
                        <td>{admin.email!==userEmail&&<button className="btn danger" onClick={()=>handleRemoveAdmin(admin.email)}>Remove</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* EDIT / ADD MODAL */}
      {editItem && (
        <div className="modal-wrap" onClick={e=>e.target===e.currentTarget&&setEditItem(null)}>
          <div className="modal-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:20,fontWeight:800,textTransform:'uppercase'}}>{isNew?'Add new':'Edit'} {editTable.replace('_',' ')}</div>
              <button onClick={()=>setEditItem(null)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:22}} title="Close" aria-label="Close">✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {Object.entries(editItem).filter(([k])=>!['id','created_at','image_url'].includes(k)).map(([key,val])=>(
                <div key={key}>
                  <label className="form-label">{key.replace(/_/g,' ')}</label>
                  {typeof val==='boolean' ? (
                    <div style={{display:'flex',gap:16}}>
                      {[true,false].map(v=>(
                        <label key={String(v)} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'var(--text-secondary)'}}>
                          <input type="radio" checked={val===v} onChange={()=>setEditItem({...editItem,[key]:v})} />
                          {v?'Yes':'No'}
                        </label>
                      ))}
                    </div>
                  ) : key==='category' && editTable==='menu_items' ? (
                    <select className="form-select" value={String(val)} onChange={e=>setEditItem({...editItem,[key]:e.target.value})} title="Category" aria-label="Category">
                      {['snacks','drinks','meals'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : key==='category' && editTable==='products' ? (
                    <select className="form-select" value={String(val)} onChange={e=>setEditItem({...editItem,[key]:e.target.value})} title="Category" aria-label="Category">
                      {['rackets','balls','apparel','accessories'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : key==='type' && editTable==='courts' ? (
                    <select className="form-select" value={String(val)} onChange={e=>setEditItem({...editItem,[key]:e.target.value})} title="Court type" aria-label="Court type">
                      {['indoor','outdoor'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : key==='skill_level' ? (
                    <select className="form-select" value={String(val)} onChange={e=>setEditItem({...editItem,[key]:e.target.value})} title="Skill level" aria-label="Skill level">
                      {['beginner','intermediate','advanced'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : key==='status' && editTable==='tournaments' ? (
                    <select className="form-select" value={String(val)} onChange={e=>setEditItem({...editItem,[key]:e.target.value})} title="Status" aria-label="Status">
                      {['open','ongoing','completed'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      type={key==='date'?'datetime-local':typeof val==='number'?'number':'text'}
                      value={key==='date'&&val?String(val).slice(0,16):String(val??'')}
                      onChange={e=>setEditItem({...editItem,[key]:typeof val==='number'?Number(e.target.value):e.target.value})}
                      title={key.replace(/_/g,' ')}
                      aria-label={key.replace(/_/g,' ')}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10,marginTop:24}}>
              <button className="btn primary" style={{flex:1,height:44,fontSize:14}} onClick={handleSave} disabled={saving}>
                {saving?'Saving...':(isNew?'Add':'Save changes')}
              </button>
              <button className="btn" style={{height:44}} onClick={()=>setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {actionMsg&&<div className="toast">{actionMsg}</div>}
      {sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:40}}/>}

      {/* ADMIN BOTTOM NAV - mobile only */}
      <div className="admin-bottom-nav">
        {[
          {id:'overview',icon:'▦',label:'Home'},
          {id:'bookings',icon:'📅',label:'Bookings'},
          {id:'courts',icon:'🏓',label:'Courts'},
          {id:'menu',icon:'🍱',label:'Menu'},
          {id:'admins',icon:'🔐',label:'Admins'},
        ].map(item=>(
          <button key={item.id} className={`abn-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
            <span className="abn-icon">{item.icon}</span>
            <span className="abn-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}