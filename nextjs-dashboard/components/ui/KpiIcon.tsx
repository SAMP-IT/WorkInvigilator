'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface KpiIconProps {
  src: string;
  alt: string;
  className?: string;
}

export function KpiIcon({ src, alt, className }: KpiIconProps) {
  return (
    <div className={cn('relative w-6 h-6', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain opacity-70"
        sizes="24px"
      />
    </div>
  );
}