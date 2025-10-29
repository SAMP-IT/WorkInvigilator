import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  status?: 'online' | 'offline' | 'away';
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
  status
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500'
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('relative inline-block group', className)}>
      <div
        className={cn(
          'rounded-xl flex items-center justify-center font-bold overflow-hidden transition-all duration-300',
          'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border-2 border-blue-200 shadow-premium',
          'group-hover:shadow-glow-blue group-hover:scale-105',
          sizeClasses[size]
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold">{getInitials(fallback)}</span>
        )}
      </div>

      {status && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <div
            className={cn(
              'w-3 h-3 rounded-full border-2 border-white shadow-premium',
              statusClasses[status]
            )}
          />
          <div
            className={cn(
              'absolute top-0 left-0 w-3 h-3 rounded-full animate-ping',
              statusClasses[status]
            )}
          />
        </div>
      )}
    </div>
  );
}
