import { cn } from '../../lib/cn';

interface BarProps {
  /** 0–100 fill percentage (clamped). */
  value: number;
  className?: string;
}

/** Horizontal 0–100 progress bar, reused to visualize per-type scores. */
export const Bar = ({ value, className }: BarProps) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-2 w-full rounded-full bg-slate-100', className)}>
      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
    </div>
  );
};
