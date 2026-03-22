'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/dashboard';
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ textAlign: 'center', maxWidth: 440 }}>
      <div style={{ width: 80, height: 80, background: 'var(--accent-bg)', border: '2px solid var(--accent-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M6 18l8 8L30 10" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 style={{ fontSize: 40, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 12 }}>
        Payment <span style={{ color: 'var(--accent)' }}>successful!</span>
      </h1>
      <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
        Your payment has been confirmed. Your booking status has been updated and you&apos;re all set to play!
      </p>
      {searchParams.get('ref') && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Reference number</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{searchParams.get('ref')}</div>
        </div>
      )}
      <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Redirecting to dashboard in <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{countdown}</span> seconds...
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 28px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Go to dashboard
        </a>
        <a href="/courts" style={{ background: 'transparent', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)', padding: '12px 28px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Book again
        </a>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Suspense fallback={<div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)' }}>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}