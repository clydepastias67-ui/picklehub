'use client';

import React from 'react';
import { SHARED_STYLES } from './types';

const LINKS = [
  {
    label: 'Book a court', href: '/courts',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke="var(--accent)" strokeWidth="1.5"/><path d="M10 6v8M6 10h8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Order food', href: '/food',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Shop', href: '/shop',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="8" width="14" height="9" rx="1.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M7 8V6a3 3 0 016 0v2" stroke="var(--accent)" strokeWidth="1.5"/></svg>,
  },
  {
    label: 'Coaching', href: '/coaching',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6" r="3.5" stroke="var(--accent)" strokeWidth="1.5"/><path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: 'Tournaments', href: '/tournaments',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2l2 5h5.5l-4.5 3.3 1.7 5.2L10 12.3l-4.7 3.2 1.7-5.2L2.5 7H8L10 2z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
  {
    label: 'Home', href: '/',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  },
];

export default function QuickLinksTab() {
  return (
    <div style={{ animation:'fadeUp .4s ease both' }}>
      <style>{SHARED_STYLES}</style>
      <div className="section-title">Quick links</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 }}>
        {LINKS.map((l, i) => (
          <a key={i} href={l.href} className="quick-link" style={{ animationDelay:`${i * 0.06}s`, animation:'fadeUp .4s ease both' }}>
            <div className="quick-link-icon">{l.icon}</div>
            <div className="quick-link-label">{l.label}</div>
          </a>
        ))}
      </div>
    </div>
  );
}