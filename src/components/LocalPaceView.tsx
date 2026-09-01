import type { LocalPaceResult } from '../types';
import { Icon } from './ui/Icon';

const componentLabels: Record<keyof LocalPaceResult['components'], string> = {
  streetActivity: 'Street life',
  transitIntensity: 'Transit',
  roadIntensity: 'Road energy',
};

export const LocalPaceView = ({ pace }: { pace: LocalPaceResult }) => (
  <section className="pace-card" data-testid="local-pace">
    <div className="pace-card__top">
      <span className="pace-icon">
        <Icon name="walk" />
      </span>
      <div>
        <p className="pace-label">Local pace</p>
        <h3>{pace.paceLabel}</h3>
      </div>
      <p className="pace-value">
        {pace.paceMph}
        <span> mph</span>
      </p>
    </div>

    <p className="pace-note">
      Pace measures local urban intensity, not desirability. It uses street activity, transit, and
      roads within {pace.radiusMeters} m.
    </p>

    <ul className="pace-components">
      {(Object.keys(componentLabels) as Array<keyof LocalPaceResult['components']>).map((key) => (
        <li key={key}>
          <span>{componentLabels[key]}</span>
          <span className="pace-track">
            <i style={{ width: `${pace.components[key]}%` }} />
          </span>
          <strong>{Math.round(pace.components[key])}</strong>
        </li>
      ))}
    </ul>
  </section>
);
