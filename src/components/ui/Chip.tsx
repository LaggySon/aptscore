import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** A toggleable pill. `aria-pressed` makes selection state accessible and testable. */
export const Chip = ({ selected, onToggle, children }: ChipProps) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onToggle}
    className={cn(
      'rounded-full border px-3 py-1 text-sm transition-colors',
      selected
        ? 'border-indigo-600 bg-indigo-600 text-white'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    )}
  >
    {children}
  </button>
);
