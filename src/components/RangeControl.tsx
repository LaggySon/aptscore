import type { DistanceUnit, RangeSetting } from '../types';
import { Icon } from './ui/Icon';

interface RangeControlProps {
  value: RangeSetting;
  onChange: (range: RangeSetting) => void;
}

const DISTANCE_UNITS: DistanceUnit[] = ['m', 'km', 'mi'];
const TIME_PRESETS = [10, 15, 20, 30];

/** Controls the catchment: a walking-minutes budget or a fixed walking distance (FR-003). */
export const RangeControl = ({ value, onChange }: RangeControlProps) => {
  const switchMode = (mode: RangeSetting['mode']) =>
    onChange(
      mode === 'minutes'
        ? { mode: 'minutes', value: value.value }
        : { mode: 'distance', value: value.value, distanceUnit: value.distanceUnit ?? 'm' },
    );

  return (
    <div className="range-control">
      <div className="range-mode-row">
        <span className="range-mode-row__icon">
          <Icon name="walk" />
        </span>
        <select
          aria-label="Range type"
          value={value.mode}
          onChange={(event) => switchMode(event.target.value as RangeSetting['mode'])}
          className="range-mode-select"
        >
          <option value="minutes">Walking time</option>
          <option value="distance">Walking distance</option>
        </select>
        <Icon name="chevron-down" className="range-mode-row__chevron" />
      </div>

      {value.mode === 'minutes' ? (
        <div className="range-presets" role="group" aria-label="Walking time">
          {TIME_PRESETS.map((minutes) => (
            <button
              type="button"
              key={minutes}
              aria-pressed={value.value === minutes}
              onClick={() => onChange({ mode: 'minutes', value: minutes })}
            >
              {minutes}
              <small> min</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="distance-inputs">
          <label>
            <span>Distance</span>
            <input
              type="number"
              min={1}
              value={value.value}
              onChange={(event) => onChange({ ...value, value: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Unit</span>
            <select
              aria-label="Unit"
              value={value.distanceUnit ?? 'm'}
              onChange={(event) =>
                onChange({ ...value, distanceUnit: event.target.value as DistanceUnit })
              }
            >
              {DISTANCE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
};
