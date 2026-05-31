'use client';
import React from 'react';

interface BarProps {
  value: number; // 0..1 or -1..1
  max?: number;   // default 1
  label?: string;
  color?: string;
  showValue?: boolean;
  diverging?: boolean; // if true, treat 0 as center (-1..1)
  height?: number;
}

export function Bar({
  value,
  max = 1,
  label,
  color,
  showValue = true,
  diverging = false,
  height = 10,
}: BarProps) {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  let leftPct: number;
  let widthPct: number;
  let barColor: string;

  if (diverging) {
    const norm = clamp(value / max, -1, 1);
    widthPct = Math.abs(norm) * 50;
    leftPct = norm >= 0 ? 50 : 50 - widthPct;
    barColor = color || (norm >= 0 ? 'var(--clr-bullish)' : 'var(--clr-bearish)');
  } else {
    const norm = clamp(value / max, 0, 1);
    widthPct = norm * 100;
    leftPct = 0;
    barColor = color || 'var(--clr-accent)';
  }

  return (
    <div className="bar-wrapper">
      {label && <span className="bar-label">{label}</span>}
      <div className="bar-track" style={{ height }}>
        {diverging && <div className="bar-center-line" />}
        <div
          className="bar-fill"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background: barColor,
            height: '100%',
          }}
        />
      </div>
      {showValue && (
        <span className="bar-value mono">
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
      )}
    </div>
  );
}
