'use client';

import React from 'react';

export default function PaymentFailedPage() {
  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 80, height: 80, background: 'var(--error-bg)', border: '2px solid var(--error-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M10 10l16 16M26 10L10 26" stroke="var(--error-text)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 12 }}>
          Payment <span style={{ color: 'var(--error-text)' }}>failed</span>
        </h1>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
          Your payment was not completed. Your booking has been saved as pending — you can try again from your dashboard.
        </p>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Common reasons for failure</div>
          {['Insufficient balance', 'Card declined by bank', 'Payment timed out', 'Incorrect card details'].map(r => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--error-text)', flexShrink: 0 }} />
              {r}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 28px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Go to dashboard
          </a>
          <a href="/courts" style={{ background: 'transparent', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)', padding: '12px 28px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Try again
          </a>
        </div>
      </div>
    </div>
  );
}