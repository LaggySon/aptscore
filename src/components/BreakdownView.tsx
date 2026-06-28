import { Bar } from './ui/Bar';
import { Badge } from './ui/Badge';
import { formatWalkMinutes } from '../lib/format';
import type { ScoredPlace, TypeContribution } from '../types';

interface BreakdownViewProps {
  contributions: TypeContribution[];
  labelOf: (typeId: string) => string;
}

const f2 = (n: number): string => n.toFixed(2);

/** One place's value math: inputs (proximity, rating) → final value. */
const PlaceRow = ({ place }: { place: ScoredPlace }) => (
  <li className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
    <span className="text-slate-600">{place.name}</span>
    <span className="tabular-nums text-slate-400">
      {formatWalkMinutes(place.walkingSeconds)} · proximity {f2(place.proximityPart)} · rating{' '}
      {place.effectiveRating.toFixed(1)}/5 → value <span className="text-slate-600">{f2(place.value)}</span>
    </span>
  </li>
);

/**
 * Full, transparent explanation of the score. Categories are ordered by their bounded
 * (0–100) score — comparable across types, unlike the base-rate-skewed raw sum — and the
 * top contributor is emphasized (SC-003). Every contributing place and the arithmetic
 * behind each number is shown (Constitution III — explainability).
 */
export const BreakdownView = ({ contributions, labelOf }: BreakdownViewProps) => {
  const ordered = [...contributions].sort((a, b) => b.boundedScore - a.boundedScore);
  const topTypeId = ordered.find((c) => c.boundedScore > 0)?.typeId;

  return (
    <div className="space-y-4" data-testid="breakdown">
      <p className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        Each nearby place gets a <strong>value</strong> = 80% × proximity + 20% × (rating ÷ 5).
        Proximity is 1.0 next to you and falls to 0 at the edge of your range; unrated places use a
        neutral 3/5. A category&apos;s <strong>raw sum</strong> adds up its places&apos; values, and
        its <strong>0–100 score</strong> = raw sum ÷ K ideal places × 100 (capped at 100). Your
        headline score is the importance-weighted sum of raw sums; the 0–100 score is the
        importance-weighted average of category scores.
      </p>

      <ul className="space-y-4">
        {ordered.map((c) => (
          <li key={c.typeId} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                {labelOf(c.typeId)}
                {c.typeId === topTypeId && <Badge tone="accent">Top match</Badge>}
              </span>
              <span className="text-sm tabular-nums text-slate-500">
                {Math.round(c.boundedScore)}
              </span>
            </div>

            <Bar value={c.boundedScore} />

            {c.coverage === 'no-data' ? (
              <Badge tone="muted">No data for this area</Badge>
            ) : (
              <>
                <p className="text-xs tabular-nums text-slate-400">
                  importance ×{c.weight} · raw sum {f2(c.rawSum)} ÷ {c.idealCeilingK} ideal × 100 ={' '}
                  {Math.round(c.boundedScore)}
                </p>
                {c.contributingPlaces.length === 0 ? (
                  <p className="text-xs text-slate-400">No places within range</p>
                ) : (
                  <ul className="space-y-0.5 text-xs">
                    {c.contributingPlaces.map((place) => (
                      <PlaceRow key={place.id} place={place} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
