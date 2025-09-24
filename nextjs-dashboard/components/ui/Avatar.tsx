'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
    online: 'bg-success',
    offline: 'bg-gray-400',
    away: 'bg-warn'
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
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium overflow-hidden',
          'bg-primary/20 text-primary border border-primary/30',
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
          <span>{getInitials(fallback)}</span>
        )}
      </div>

      {status && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface',
            statusClasses[status]
          )}
        />
      )}
    </div>
  );
}