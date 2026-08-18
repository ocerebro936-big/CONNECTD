// ============================================================================
// Connected — CrownBadge (símbolo de reconhecimento, não admin)
// ============================================================================
import React from 'react';
import { getBrandTier } from '../lib/connected-brand';

export function CrownBadge({ points, size = 'sm' }: { points: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = getBrandTier(points);
  const dim = size === 'lg' ? 'text-base px-3 py-1' : size === 'md' ? 'text-sm px-2.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${dim}`}
      style={{ backgroundColor: `${tier.color}1a`, color: tier.color, border: `1px solid ${tier.color}55` }}
      title={tier.blurb}
    >
      {tier.crown && <span aria-hidden>👑</span>}
      {tier.label}
    </span>
  );
}
