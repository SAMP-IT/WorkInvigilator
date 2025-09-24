'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Table Root Component
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line">
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm', className)}>
          {children}
        </table>
      </div>
    </div>
  );
}

// Table Header Component
interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead className={cn('bg-surface border-b border-line sticky top-0 z-10', className)}>
      {children}
    </thead>
  );
}

// Table Body Component
interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody className={cn('bg-surface', className)}>
      {children}
    </tbody>
  );
}

// Table Row Component
interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function TableRow({ children, className, onClick, selected }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-line transition-colors',
        'hover:bg-raised',
        onClick && 'cursor-pointer',
        selected && 'bg-primary/5 border-primary/20',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

// Table Head Cell Component
interface TableHeadProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function TableHead({
  children,
  className,
  sortable = false,
  sorted = null,
  onSort
}: TableHeadProps) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left font-medium text-ink-mid text-xs uppercase tracking-wider',
        sortable && 'cursor-pointer hover:text-ink-hi select-none',
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center space-x-1">
        <span className="font-ui text-xs smallcaps">{children}</span>
        {sortable && (
          <span className="font-mono text-ink-muted">
            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </div>
    </th>
  );
}

// Table Cell Component
interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn('px-4 py-3 font-ui text-sm text-ink-hi', className)}>
      {children}
    </td>
  );
}