'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", background:'var(--bg-primary)', color:'var(--text-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:440 }}>
        <div style={{ fontSize:64, lineHeight:1, marginBottom:16 }}>⚠️</div>
        <h1 style={{ fontSize:28, fontWeight:800, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:8 }}>Something went wrong</h1>
        <p style={{ fontFamily:"'Barlow',sans-serif", fontSize:14, color:'var(--text-muted)', marginBottom:28, lineHeight:1.6 }}>
          An unexpected error occurred. This might be a temporary issue — try refreshing the page.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={reset} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 24px', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', cursor:'pointer', transition:'background .2s' }}>
            Try again
          </button>
          <a href="/" style={{ background:'transparent', color:'var(--text-secondary)', border:'1px solid var(--border)', padding:'10px 24px', borderRadius:8, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', textDecoration:'none', transition:'all .2s' }}>
            Go home
          </a>
        </div>
        {error.digest && (
          <div style={{ fontFamily:"'Barlow',sans-serif", fontSize:11, color:'var(--text-hint)', marginTop:20 }}>Error ID: {error.digest}</div>
        )}
      </div>
    </div>
  );
}