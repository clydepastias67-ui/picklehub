export default function CourtsLoading() {
  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh' }}>
      <style>{`
        @keyframes shimmer { from { background-position: -600px 0 } to { background-position: 600px 0 } }
        .sk { border-radius:8px; background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%); background-size:600px 100%; animation: shimmer 1.4s infinite; }
      `}</style>

      {/* NAVBAR SKELETON */}
      <div style={{ height:60, borderBottom:'1px solid var(--border)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="sk" style={{ height:20, width:120 }} />
        <div style={{ display:'flex', gap:12 }}>
          {Array.from({length:4}).map((_,i) => <div key={i} className="sk" style={{ height:14, width:60 }} />)}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'32px 24px', display:'flex', flexDirection:'column', gap:24 }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div className="sk" style={{ height:14, width:120 }} />
            <div className="sk" style={{ height:36, width:200 }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div className="sk" style={{ height:36, width:80, borderRadius:20 }} />
            <div className="sk" style={{ height:36, width:80, borderRadius:20 }} />
            <div className="sk" style={{ height:36, width:80, borderRadius:20 }} />
          </div>
        </div>

        {/* Court cards grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
              <div className="sk" style={{ height:180, borderRadius:0 }} />
              <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
                <div className="sk" style={{ height:20, width:'60%' }} />
                <div className="sk" style={{ height:14, width:'40%' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div className="sk" style={{ height:24, width:80 }} />
                  <div className="sk" style={{ height:36, width:100, borderRadius:8 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}