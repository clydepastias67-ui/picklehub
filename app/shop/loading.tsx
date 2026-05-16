// Shared skeleton shape used for coaching, food, shop, tournaments
// Copy this file into each route folder as loading.tsx

export default function PageLoading() {
  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        @keyframes shimmer { from { background-position: -600px 0 } to { background-position: 600px 0 } }
        .sk { border-radius:8px; background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%); background-size:600px 100%; animation: shimmer 1.4s infinite; }
      `}</style>

      {/* NAVBAR */}
      <div style={{ height:60, borderBottom:'1px solid var(--border)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="sk" style={{ height:20, width:120 }} />
        <div style={{ display:'flex', gap:12 }}>
          {Array.from({length:4}).map((_,i) => <div key={i} className="sk" style={{ height:14, width:60 }} />)}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 24px', display:'flex', flexDirection:'column', gap:24 }}>
        {/* Page header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div className="sk" style={{ height:14, width:100 }} />
            <div className="sk" style={{ height:36, width:220 }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {Array.from({length:3}).map((_,i) => <div key={i} className="sk" style={{ height:36, width:80, borderRadius:20 }} />)}
          </div>
        </div>

        {/* Cards grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
          {Array.from({length:8}).map((_,i) => (
            <div key={i} style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', opacity: 1 - i * 0.04 }}>
              <div className="sk" style={{ height:160, borderRadius:0 }} />
              <div style={{ padding:18, display:'flex', flexDirection:'column', gap:10 }}>
                <div className="sk" style={{ height:18, width:'65%' }} />
                <div className="sk" style={{ height:13, width:'45%' }} />
                <div className="sk" style={{ height:13, width:'55%' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                  <div className="sk" style={{ height:22, width:70 }} />
                  <div className="sk" style={{ height:36, width:90, borderRadius:8 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}