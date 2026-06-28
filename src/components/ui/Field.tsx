import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}

/** Label + control wrapper, so form rows look the same everywhere (DRY). */
export const Field = ({ label, htmlFor, children }: FieldProps) => (
  <label htmlFor={htmlFor} className="block text-sm">
    <span className="mb-1 block font-medium text-slate-600">{label}</span>
    {children}
  </label>
);
