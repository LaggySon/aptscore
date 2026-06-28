import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'accent' | 'muted';

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  accent: 'bg-indigo-100 text-indigo-700',
  muted: 'bg-amber-100 text-amber-700',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

/** Small labelled pill, reused for "Top match" and "No data" markers. */
export const Badge = ({ tone = 'neutral', children }: BadgeProps) => (
  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASSES[tone])}>
    {children}
  </span>
);
