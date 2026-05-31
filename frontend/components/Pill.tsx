'use client';
import React from 'react';

type PillVariant =
  | 'offensive'
  | 'selective'
  | 'defensive'
  | 'watchlist_only'
  | 'emerging'
  | 'strengthening'
  | 'accelerating'
  | 'crowded'
  | 'weakening'
  | 'broken'
  | 'archived'
  | 'bullish'
  | 'bearish'
  | 'neutral'
  | 'info'
  | 'watch'
  | 'elevated'
  | 'urgent'
  | 'tier1'
  | 'tier2'
  | 'tier3'
  | 'tier4'
  | 'rejected'
  | 'default';

const VARIANT_CLASS: Record<string, string> = {
  offensive: 'pill-green',
  selective: 'pill-amber',
  defensive: 'pill-red',
  watchlist_only: 'pill-gray',
  emerging: 'pill-blue',
  strengthening: 'pill-teal',
  accelerating: 'pill-green',
  crowded: 'pill-amber',
  weakening: 'pill-orange',
  broken: 'pill-red',
  archived: 'pill-gray',
  bullish: 'pill-green',
  bearish: 'pill-red',
  neutral: 'pill-gray',
  info: 'pill-blue',
  watch: 'pill-amber',
  elevated: 'pill-orange',
  urgent: 'pill-red',
  tier1: 'pill-green',
  tier2: 'pill-teal',
  tier3: 'pill-amber',
  tier4: 'pill-gray',
  rejected: 'pill-red',
  default: 'pill-gray',
};

interface PillProps {
  label: string;
  variant?: PillVariant | string;
}

export function Pill({ label, variant = 'default' }: PillProps) {
  const cls = VARIANT_CLASS[variant] || 'pill-gray';
  return <span className={`pill ${cls}`}>{label}</span>;
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const cls = VARIANT_CLASS[variant] || 'pill-gray';
  return <span className={`badge ${cls}`}>{children}</span>;
}
