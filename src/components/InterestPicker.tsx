import { Chip } from './ui/Chip';
import type { InterestTypeOption } from '../types';

interface InterestPickerProps {
  options: InterestTypeOption[];
  selectedIds: string[];
  onToggle: (typeId: string) => void;
}

/** Lets the user pick which interest types matter to them (FR-001). */
export const InterestPicker = ({ options, selectedIds, onToggle }: InterestPickerProps) => {
  const selected = new Set(selectedIds);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option.id}
          selected={selected.has(option.id)}
          onToggle={() => onToggle(option.id)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
};
