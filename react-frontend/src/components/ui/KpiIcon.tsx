import { cn } from '../../lib/utils';

interface KpiIconProps {
  src: string;
  alt: string;
  className?: string;
}

export function KpiIcon({ src, alt, className }: KpiIconProps) {
  return (
    <div className={cn('relative w-6 h-6', className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain opacity-80 transition-opacity hover:opacity-100"
      />
    </div>
  );
}
