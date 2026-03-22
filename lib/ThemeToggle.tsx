'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      {theme === 'dark' ? (
        // Sun icon — click to go light
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.42 1.42M13.36 13.36l1.42 1.42M3.22 14.78l1.42-1.42M13.36 4.64l1.42-1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      ) : (
        // Moon icon — click to go dark
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M15 9.5A6.5 6.5 0 018.5 3a6.5 6.5 0 100 12A6.5 6.5 0 0115 9.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}