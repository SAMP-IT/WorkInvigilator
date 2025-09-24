'use client';

import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  hover = false,
  elevated = false,
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={cn(
        // Base styles
        'rounded-lg border border-line',
        // Background
        elevated ? 'bg-raised' : 'bg-surface',
        // Shadow
        'shadow-card',
        // Hover effects
        hover && 'card-hover cursor-pointer',
        // Padding
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Header Component
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

// Card Title Component
interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('font-ui text-lg font-semibold text-ink-hi', className)}>
      {children}
    </h3>
  );
}

// Card Content Component
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('font-ui text-sm text-ink-mid', className)}>
      {children}
    </div>
  );
}