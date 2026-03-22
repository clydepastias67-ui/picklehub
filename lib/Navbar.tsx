'use client';

import React, { useState, useEffect } from 'react';
import { ThemeToggle } from '@/lib/ThemeToggle';
import { createClient } from '@/lib/supabase/client';

type NavbarProps = {
  activeLink?: string;
};

export default function Navbar({ activeLink }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email, full_name: data.user.user_metadata?.full_name });
    });
  }, []);

  const links = [
    { label: 'Courts', href: '/courts' },
    { label: 'Coaching', href: '/coaching' },
    { label: 'Tournaments', href: '/tournaments' },
    { label: 'Shop', href: '/shop' },
    { label: 'Food', href: '/food' },
  ];

  return (
    <>
      <style>{`
        .navbar {
          background: var(--nav-bg);
          border-bottom: 1px solid var(--border);
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .navbar-logo-dot {
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
        }
        .navbar-logo-text {
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .navbar-links {
          display: flex;
          gap: 20px;
          align-items: center;
        }
        .navbar-link {
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
          white-space: nowrap;
        }
        .navbar-link:hover { color: var(--text-primary); }
        .navbar-link.active { color: var(--accent); }
        .navbar-right {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
        }
        .navbar-dashboard {
          font-family: 'Barlow', sans-serif;
          font-size: 13px;
          color: var(--accent);
          text-decoration: none;
        }
        .navbar-hamburger {
          display: none;
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 4px;
          flex-direction: column;
          gap: 5px;
        }
        .hamburger-line {
          display: block;
          width: 22px;
          height: 2px;
          background: var(--text-primary);
          border-radius: 2px;
          transition: all 0.2s;
        }
        .mobile-menu {
          position: absolute;
          top: 60px;
          left: 0;
          right: 0;
          background: var(--nav-bg);
          border-bottom: 1px solid var(--border);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 99;
        }
        .mobile-link {
          font-family: 'Barlow', sans-serif;
          font-size: 15px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 6px 0;
          border-bottom: 1px solid var(--border);
        }
        .mobile-link:last-child { border-bottom: none; }
        .mobile-link.active { color: var(--accent); }

        @media (max-width: 768px) {
          .navbar { padding: 0 16px; }
          .navbar-links { display: none; }
          .navbar-hamburger { display: flex; }
          .navbar-dashboard { display: none; }
        }
      `}</style>

      <nav className="navbar" style={{ position: 'sticky' }}>
        <a href="/" className="navbar-logo">
          <div className="navbar-logo-dot" />
          <span className="navbar-logo-text">PickleHub</span>
        </a>

        {/* Desktop links */}
        <div className="navbar-links">
          {links.map(l => (
            <a key={l.href} href={l.href} className={`navbar-link ${activeLink === l.href ? 'active' : ''}`}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="navbar-right">
          <a href="/dashboard" className="navbar-dashboard">Dashboard</a>
          <ThemeToggle />
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Toggle menu"
            aria-label="Toggle menu"
          >
            <span className="hamburger-line" style={{ transform: menuOpen ? 'rotate(45deg) translateY(7px)' : '' }} />
            <span className="hamburger-line" style={{ opacity: menuOpen ? 0 : 1 }} />
            <span className="hamburger-line" style={{ transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : '' }} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="mobile-menu">
            {links.map(l => (
              <a key={l.href} href={l.href} className={`mobile-link ${activeLink === l.href ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <a href="/dashboard" className="mobile-link active" onClick={() => setMenuOpen(false)}>Dashboard</a>
            {user && (
              <a href="#" className="mobile-link" onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = '/';
              }}>Sign out</a>
            )}
          </div>
        )}
      </nav>
    </>
  );
}