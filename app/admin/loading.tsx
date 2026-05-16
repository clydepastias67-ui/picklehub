export default function AdminLoading() {
  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex' }}>
      <style>{`
        @keyframes shimmer { from { background-position: -600px 0 } to { background-position: 600px 0 } }
        .sk { border-radius:8px; background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%); background-size:600px 100%; animation: shimmer 1.4s infinite; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width:230, background:'var(--sidebar-bg)', borderRight:'1px solid var(--border)', padding:'18px 16px', display:'flex', flexDirection:'column', gap:12, flexShrink:0 }}>
        <div className="sk" style={{ height:24, width:'70%', marginBottom:8 }} />
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <div className="sk" style={{ height:32, width:32, borderRadius:'50%' }} />
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
            <div className="sk" style={{ height:12, width:'60%' }} />
            <div className="sk" style={{ height:10, width:'80%' }} />
          </div>
        </div>
        {Array.from({length:9}).map((_,i) => (
          <div key={i} className="sk" style={{ height:32, borderRadius:8, opacity: 1 - i * 0.07 }} />
        ))}
      </div>

      {/* MAIN */}
      <div style={{ flex:1, padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div className="sk" style={{ height:14, width:140 }} />
          <div className="sk" style={{ height:36, width:320 }} />
        </div>

        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:12 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, padding:20, display:'flex', flexDirection:'column', gap:10 }}>
              <div className="sk" style={{ height:12, width:'60%' }} />
              <div className="sk" style={{ height:32, width:'40%' }} />
              <div className="sk" style={{ height:10, width:'50%' }} />
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <div className="sk" style={{ height:18, width:240 }} />
          </div>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ display:'flex', gap:16, padding:'14px 18px', borderBottom:'1px solid var(--border)', alignItems:'center' }}>
              <div className="sk" style={{ height:14, width:'20%' }} />
              <div className="sk" style={{ height:14, width:'20%' }} />
              <div className="sk" style={{ height:14, width:'15%' }} />
              <div className="sk" style={{ height:14, width:'10%' }} />
              <div className="sk" style={{ height:22, width:70, borderRadius:20 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}