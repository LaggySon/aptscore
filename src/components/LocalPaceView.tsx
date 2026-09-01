import { Bar } from './ui/Bar';
import type { LocalPaceResult } from '../types';

const componentLabels: Record<keyof LocalPaceResult['components'], string> = {
  streetActivity: 'Street activity',
  transitIntensity: 'Transit intensity',
  roadIntensity: 'Road intensity',
};

export const LocalPaceView = ({ pace }: { pace: LocalPaceResult }) => (
  <section className="mt-5 border-t border-slate-100 pt-4" data-testid="local-pace">
    <div className="flex items-end justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Local Pace</h3>
        <p className="text-sm text-slate-500">{pace.paceLabel}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums text-indigo-700">
        {pace.paceMph} <span className="text-base font-semibold">mph</span>
      </p>
    </div>

    <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
      Pace measures local urban intensity, not desirability. The mph display is metaphorical: it
      combines nearby public-facing activity, transit infrastructure, and road intensity within{' '}
      {pace.radiusMeters}m.
    </p>

    <ul className="mt-3 grid gap-3 sm:grid-cols-3">
      {(Object.keys(componentLabels) as Array<keyof LocalPaceResult['components']>).map((key) => (
        <li key={key}>
          <div className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
            <span>{componentLabels[key]}</span>
            <span className="tabular-nums">{Math.round(pace.components[key])}</span>
          </div>
          <Bar value={pace.components[key]} />
        </li>
      ))}
    </ul>

    <p className="mt-3 text-xs tabular-nums text-slate-400">
      Raw: street {pace.raw.streetActivity}, transit {pace.raw.transitIntensity}, roads{' '}
      {pace.raw.roadIntensity} · Pace Model v{pace.modelVersion}
    </p>
  </section>
);
