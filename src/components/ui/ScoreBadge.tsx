import { cn } from '../../lib/cn';

interface ScoreBadgeProps {
  label: string;
  value: string;
  /** `headline` is the prominent primary score; `muted` is the secondary score. */
  emphasis?: 'headline' | 'muted';
  testId?: string;
}

/** Displays one labelled score value. Reused for both the primary and secondary scores. */
export const ScoreBadge = ({ label, value, emphasis = 'muted', testId }: ScoreBadgeProps) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    <span
      data-testid={testId}
      className={cn(
        'font-bold tabular-nums',
        emphasis === 'headline' ? 'text-4xl text-indigo-700' : 'text-2xl text-slate-600',
      )}
    >
      {value}
    </span>
  </div>
);
