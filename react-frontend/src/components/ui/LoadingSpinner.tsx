import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div
          className={cn(
            'inline-block animate-spin rounded-full border-b-2 border-primary',
            sizeClasses[size],
            className
          )}
        ></div>
        <p className="mt-4 text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

export function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-3 text-sm text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-background-tertiary rounded"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-background-tertiary rounded"></div>
      ))}
    </div>
  );
}
