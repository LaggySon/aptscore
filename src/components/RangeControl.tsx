import { Field } from './ui/Field';
import type { DistanceUnit, RangeSetting } from '../types';

interface RangeControlProps {
  value: RangeSetting;
  onChange: (range: RangeSetting) => void;
}

const DISTANCE_UNITS: DistanceUnit[] = ['m', 'km', 'mi'];
const inputClasses =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';

/** Controls the catchment: a walking-minutes budget or a fixed walking distance (FR-003). */
export const RangeControl = ({ value, onChange }: RangeControlProps) => {
  const switchMode = (mode: RangeSetting['mode']) =>
    onChange(
      mode === 'minutes'
        ? { mode: 'minutes', value: value.value }
        : { mode: 'distance', value: value.value, distanceUnit: value.distanceUnit ?? 'm' },
    );

  return (
    <div className="space-y-3">
      <Field label="Range type">
        <select
          value={value.mode}
          onChange={(event) => switchMode(event.target.value as RangeSetting['mode'])}
          className={inputClasses}
        >
          <option value="minutes">Walking minutes</option>
          <option value="distance">Fixed walking distance</option>
        </select>
      </Field>

      <div className="flex gap-2">
        <Field label={value.mode === 'minutes' ? 'Minutes' : 'Distance'}>
          <input
            type="number"
            min={1}
            value={value.value}
            onChange={(event) =>
              onChange({ ...value, value: Number(event.target.value) })
            }
            className={inputClasses}
          />
        </Field>

        {value.mode === 'distance' && (
          <Field label="Unit">
            <select
              value={value.distanceUnit ?? 'm'}
              onChange={(event) =>
                onChange({ ...value, distanceUnit: event.target.value as DistanceUnit })
              }
              className={inputClasses}
            >
              {DISTANCE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </div>
  );
};
