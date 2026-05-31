'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Regime', icon: '◈' },
  { href: '/theses', label: 'Theses', icon: '◉' },
  { href: '/candidates', label: 'Candidates', icon: '◎' },
  { href: '/causal', label: 'Causal Graph', icon: '⬡' },
  { href: '/signals', label: 'Signals', icon: '⊞' },
  { href: '/evidence', label: 'Evidence', icon: '◇' },
  { href: '/learning', label: 'Learning', icon: '◈' },
  { href: '/alerts', label: 'Alerts', icon: '⚐' },
  { href: '/backtest', label: 'Backtest', icon: '⊟' },
  { href: '/debates', label: 'Debates', icon: '⊕' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">Ω</span>
        <span className="sidebar-brand-text">Omega Prime X</span>
      </div>
      <ul className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`sidebar-link${active ? ' active' : ''}`}>
                <span className="sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="sidebar-footer">
        <span className="sidebar-footer-text">Institutional Intelligence</span>
      </div>
    </nav>
  );
}
