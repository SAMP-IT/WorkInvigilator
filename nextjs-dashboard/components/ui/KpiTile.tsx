'use client';

import { ReactNode } from 'react';

export type KpiTileProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  delta?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
  onClick?: () => void;
  loading?: boolean;
};

export function KpiTile({
  icon,
  label,
  value,
  delta,
  onClick,
  loading = false
}: KpiTileProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getDeltaColor = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'flat': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getDeltaIcon = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'flat': return '→';
      default: return '→';
    }
  };

  return (
    <div
      className={`
        kpi-tile group cursor-pointer
        ${onClick ? 'hover:shadow-hover' : ''}
        ${loading ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="font-ui text-xs smallcaps text-ink-mid">
          {label}
        </div>
        <div className="text-ink-muted">
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <div className={`
            kpi font-mono text-xl font-semibold text-ink-hi
            ${loading ? '' : 'animate-count-up'}
          `}>
            {loading ? '—' : formatValue(value)}
          </div>

          {delta && !loading && (
            <div className={`
              flex items-center text-xs mt-1
              ${getDeltaColor(delta.direction)}
            `}>
              <span className="mr-1">
                {getDeltaIcon(delta.direction)}
              </span>
              <span>
                {Math.abs(delta.value)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}