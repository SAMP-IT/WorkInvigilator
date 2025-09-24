'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface NavIconProps {
  src: string;
  alt: string;
  isActive?: boolean;
  className?: string;
}

export function NavIcon({ src, alt, isActive = false, className }: NavIconProps) {
  return (
    <div className={cn('relative w-5 h-5 mr-3', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(
          'object-contain transition-all duration-200',
          isActive
            ? 'opacity-100 brightness-110'
            : 'opacity-70 group-hover:opacity-100 group-hover:brightness-110'
        )}
        sizes="20px"
      />
    </div>
  );
}