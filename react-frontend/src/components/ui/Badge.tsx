import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  pulse?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  glow = false,
  pulse = false,
  className,
  onClick,
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-semibold transition-all duration-200';

  const variantClasses = {
    default:
      'bg-slate-100 text-slate-700 border border-slate-200',
    primary:
      'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200',
    success:
      'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200',
    warning:
      'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200',
    danger:
      'bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200',
    info:
      'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 border border-cyan-200',
    outline:
      'bg-transparent text-slate-700 border-2 border-slate-300',
  };

  const glowClasses = {
    default: '',
    primary: 'shadow-glow-blue',
    success: 'shadow-glow-green',
    warning: 'shadow-glow-yellow',
    danger: 'shadow-glow-red',
    info: 'shadow-glow-blue',
    outline: '',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        glow && glowClasses[variant],
        pulse && 'animate-pulse',
        onClick && 'cursor-pointer hover:scale-105 hover:shadow-premium active:scale-95',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}
