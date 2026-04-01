'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';

const routeItems = [
  { href: '/', label: 'Home', shortLabel: 'Home' },
  { href: '/work-board', label: 'All Work Board', shortLabel: 'All' },
  { href: '/owner-board', label: 'Owner Board', shortLabel: 'Owner' },
  { href: '/hold', label: 'HOLD Board', shortLabel: 'HOLD' },
];

export function OpsNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  }

  function linkStyle(href: string): CSSProperties {
    const active = isActive(href);
    return {
      ...linkBaseStyle,
      color: active ? '#f8fafc' : '#475569',
      background: active ? '#0f172a' : 'transparent',
      borderColor: active ? '#0f172a' : 'transparent',
      boxShadow: active ? '0 10px 24px rgba(15, 23, 42, 0.16)' : 'none',
      fontWeight: active ? 700 : 600,
    };
  }

  const currentLabel = routeItems.find((item) => isActive(item.href))?.label ?? 'Home';

  return (
    <nav style={navShellStyle} aria-label="Operations navigation">
      <div style={navInnerStyle}>
        <Link href="/" style={brandLinkStyle} aria-current={pathname === '/' ? 'page' : undefined}>
          <span style={brandKickerStyle}>WA Message Ops</span>
          <strong style={brandTitleStyle}>Operations shell</strong>
        </Link>

        <div style={routeRailStyle}>
          {routeItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={linkStyle(item.href)}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.shortLabel}
            </Link>
          ))}
        </div>

        <span style={currentPillStyle}>Current: {currentLabel}</span>
      </div>
    </nav>
  );
}

const navShellStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 40,
  padding: '1rem 1rem 0',
  backdropFilter: 'blur(14px)',
};

const navInnerStyle: CSSProperties = {
  width: '100%',
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '0.75rem 0.85rem',
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  background: 'rgba(255, 255, 255, 0.82)',
  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  gap: '0.9rem',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const brandLinkStyle: CSSProperties = {
  display: 'grid',
  gap: '0.05rem',
  textDecoration: 'none',
  minWidth: '210px',
  color: '#334155',
};

const brandKickerStyle: CSSProperties = {
  fontSize: '0.74rem',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontWeight: 700,
  color: '#75623c',
};

const brandTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.05rem',
  letterSpacing: '-0.03em',
};

const routeRailStyle: CSSProperties = {
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
  padding: '0.3rem',
  borderRadius: '999px',
  background: 'rgba(248, 250, 252, 0.88)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
};

const linkBaseStyle: CSSProperties = {
  textDecoration: 'none',
  padding: '0.48rem 0.82rem',
  borderRadius: '999px',
  border: '1px solid transparent',
  transition: 'background-color 180ms ease, color 180ms ease, box-shadow 180ms ease',
  outline: 'none',
  fontSize: '0.9rem',
};

const currentPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.4rem 0.75rem',
  borderRadius: '999px',
  background: 'rgba(117, 98, 60, 0.08)',
  border: '1px solid rgba(117, 98, 60, 0.18)',
  color: '#594929',
  fontSize: '0.82rem',
  fontWeight: 700,
};
