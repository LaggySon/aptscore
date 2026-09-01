import type { InterestTypeOption } from '../types';
import { Icon, type IconName } from './ui/Icon';

interface InterestPickerProps {
  options: InterestTypeOption[];
  selectedIds: string[];
  onToggle: (typeId: string) => void;
}

/** Lets the user pick which interest types matter to them (FR-001). */
export const InterestPicker = ({ options, selectedIds, onToggle }: InterestPickerProps) => {
  const selected = new Set(selectedIds);
  return (
    <div className="interest-grid">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={selected.has(option.id)}
          onClick={() => onToggle(option.id)}
          className="interest-tile"
        >
          <span className="interest-tile__icon">
            <Icon name={iconByType[option.id] ?? 'sparkle'} />
          </span>
          <span>{shortLabel(option.label)}</span>
          <span className="interest-tile__check">
            <Icon name="check" />
          </span>
        </button>
      ))}
    </div>
  );
};

const iconByType: Record<string, IconName> = {
  groceries: 'groceries',
  transit: 'transit',
  cafes: 'cafe',
  restaurants: 'restaurant',
  parks: 'park',
  pharmacy: 'pharmacy',
  bookstores: 'book',
  pubs: 'pub',
  gyms: 'dumbbell',
  schools: 'school',
  healthcare: 'heart',
  libraries: 'library',
  bakeries: 'cafe',
  banks: 'bank',
};

const shortLabel = (label: string): string => label.split(' / ')[0] ?? label;
