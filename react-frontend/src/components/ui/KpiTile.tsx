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
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'flat': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getDeltaIcon = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up': return '▲';
      case 'down': return '▼';
      case 'flat': return '—';
      default: return '—';
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-5 shadow-sm transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary' : ''}
        ${loading ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs uppercase tracking-wide font-medium text-gray-600">
          {label}
        </div>
        <div className="text-primary opacity-80">
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <div className={`
            text-2xl font-bold text-gray-900 font-mono
            ${loading ? '' : 'transition-all duration-300'}
          `}>
            {loading ? '—' : formatValue(value)}
          </div>

          {delta && !loading && (
            <div className={`
              flex items-center text-xs mt-1 font-medium
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
