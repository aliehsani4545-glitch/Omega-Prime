'use client';
import React from 'react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="stat-card" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
