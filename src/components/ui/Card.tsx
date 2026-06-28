import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Shared section container — gives every panel the same surface styling. */
export const Card = ({ title, children, className }: CardProps) => (
  <section className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm', className)}>
    {title && <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>}
    {children}
  </section>
);
