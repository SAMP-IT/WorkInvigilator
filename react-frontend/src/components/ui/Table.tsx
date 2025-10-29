import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Table Root Component
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="overflow-x-auto smooth-scroll">
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
    <thead className={cn('bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 sticky top-0 z-10', className)}>
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
    <tbody className={cn('bg-white divide-y divide-slate-100', className)}>
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
        'transition-all duration-200',
        'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30',
        onClick && 'cursor-pointer',
        selected && 'bg-blue-50 border-l-4 border-l-blue-500',
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
        'px-6 py-4 text-left font-bold text-slate-900 text-xs uppercase tracking-wider',
        sortable && 'cursor-pointer hover:text-blue-600 select-none transition-colors',
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {sortable && (
          <svg className={cn('w-3 h-3 transition-transform', sorted === 'desc' && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );
}

// Table Cell Component
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className, ...props }: TableCellProps) {
  return (
    <td className={cn('px-6 py-4 text-sm text-slate-700 font-medium', className)} {...props}>
      {children}
    </td>
  );
}
