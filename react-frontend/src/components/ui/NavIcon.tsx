import { cn } from '../../lib/utils';

interface NavIconProps {
  src: string;
  alt: string;
  isActive?: boolean;
  className?: string;
}

export function NavIcon({ src, alt, isActive = false, className }: NavIconProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'w-7 h-7 object-contain transition-all duration-200',
        isActive
          ? 'opacity-100 brightness-100'
          : 'opacity-70 group-hover:opacity-100 group-hover:brightness-110',
        className
      )}
    />
  );
}
