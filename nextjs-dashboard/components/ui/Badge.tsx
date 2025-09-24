'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
  onClick
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';

  const variantClasses = {
    default: 'bg-surface text-ink-mid border border-line',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warn/10 text-warn border border-warn/20',
    danger: 'bg-danger/10 text-danger border border-danger/20',
    info: 'bg-info/10 text-info border border-info/20',
    outline: 'bg-transparent text-ink-mid border border-line'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}