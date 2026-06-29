import { cn } from '../lib/cn';
import type { ImportanceLevel } from '../types';

const LEVELS: ImportanceLevel[] = ['low', 'medium', 'high'];
const LABELS: Record<ImportanceLevel, string> = { low: 'Low', medium: 'Med', high: 'High' };

interface ImportanceControlProps {
  value: ImportanceLevel;
  onChange: (level: ImportanceLevel) => void;
  ariaLabel?: string;
}

/** Three-way importance selector (low/medium/high) for one interest type (US3 / FR-009). */
export const ImportanceControl = ({ value, onChange, ariaLabel }: ImportanceControlProps) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className="inline-flex overflow-hidden rounded-md border border-slate-300"
  >
    {LEVELS.map((level) => (
      <button
        key={level}
        type="button"
        aria-pressed={value === level}
        onClick={() => onChange(level)}
        className={cn(
          'px-2 py-0.5 text-xs transition-colors',
          value === level
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50',
        )}
      >
        {LABELS[level]}
      </button>
    ))}
  </div>
);
