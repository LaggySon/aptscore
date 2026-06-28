import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Shared button. All clickable actions use this so styling stays consistent (DRY). */
export const Button = ({ variant = 'primary', className, ...props }: ButtonProps) => (
  <button
    className={cn(
      'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
      VARIANT_CLASSES[variant],
      className,
    )}
    {...props}
  />
);
