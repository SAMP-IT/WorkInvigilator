import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  elevated?: boolean;
  glass?: boolean;
  gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  hover = false,
  elevated = false,
  glass = false,
  gradient = 'none',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const gradientClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    purple: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200',
    green: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200',
    orange: 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200',
    none: '',
  };

  return (
    <div
      className={cn(
        // Base styles
        'rounded-2xl border transition-all duration-300',
        // Background
        glass && 'glass',
        !glass && (elevated ? 'bg-slate-50' : 'bg-white'),
        // Border
        !glass && 'border-slate-200/60',
        // Shadow
        elevated ? 'shadow-elevated' : 'shadow-premium',
        // Hover effects
        hover && 'hover-lift cursor-pointer hover:shadow-premium-lg',
        // Gradient
        gradient !== 'none' && gradientClasses[gradient],
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
  return <div className={cn('mb-6', className)}>{children}</div>;
}

// Card Title Component
interface CardTitleProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}

export function CardTitle({ children, className, gradient = false }: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-lg font-bold tracking-tight',
        gradient ? 'gradient-text-blue' : 'text-slate-900',
        className
      )}
    >
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
    <div className={cn('text-sm text-slate-600', className)}>
      {children}
    </div>
  );
}

// Card Footer Component
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-6 pt-4 border-t border-slate-200/60', className)}>
      {children}
    </div>
  );
}
