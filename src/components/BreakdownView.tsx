import { formatWalkMinutes } from '../lib/format';
import type { TypeContribution } from '../types';
import { Icon } from './ui/Icon';

interface BreakdownViewProps {
  contributions: TypeContribution[];
  labelOf: (typeId: string) => string;
}

const fitLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Strong';
  if (score >= 35) return 'Fair';
  return 'Limited';
};

export const BreakdownView = ({ contributions, labelOf }: BreakdownViewProps) => {
  const ordered = [...contributions].sort((a, b) => b.boundedScore - a.boundedScore);
  const topTypeId = ordered.find((item) => item.boundedScore > 0)?.typeId;

  return (
    <section className="result-section" data-testid="breakdown">
      <div className="section-heading">
        <div>
          <h3>Category scores</h3>
        </div>
        <span>{ordered.length} categories</span>
      </div>

      <div className="category-list">
        {ordered.map((contribution) => {
          const score = Math.round(contribution.boundedScore);
          const firstPlace = contribution.contributingPlaces[0];
          return (
            <details className="category-card" key={contribution.typeId}>
              <summary>
                <span className="category-score">{score}</span>
                <span className="category-summary">
                  <span className="category-summary__title">
                    {labelOf(contribution.typeId)}
                    {contribution.typeId === topTypeId && <em>Top match</em>}
                  </span>
                  <span className="category-summary__meta">
                    {contribution.coverage === 'no-data'
                      ? 'No data for this area'
                      : firstPlace
                        ? `${fitLabel(score)} · nearest ${formatWalkMinutes(firstPlace.walkingSeconds)}`
                        : 'No places within range'}
                  </span>
                  <span className="fit-track">
                    <i style={{ width: `${score}%` }} />
                  </span>
                </span>
                <Icon name="chevron-down" className="category-chevron" />
              </summary>

              <div className="category-detail">
                {contribution.coverage === 'no-data' ? (
                  <p>OpenStreetMap does not have reliable coverage for this category here.</p>
                ) : contribution.contributingPlaces.length === 0 ? (
                  <p>No matching places are reachable within your selected range.</p>
                ) : (
                  <ul>
                    {contribution.contributingPlaces.map((place) => (
                      <li key={place.id}>
                        <span>
                          <Icon name="location" /> {place.name}
                        </span>
                        <strong>{formatWalkMinutes(place.walkingSeconds)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="category-math">
                  Importance: {contribution.importance} (×{contribution.weight}). Value sum:{' '}
                  {contribution.rawSum.toFixed(2)}. Target places: {contribution.idealCeilingK}.
                </p>
              </div>
            </details>
          );
        })}
      </div>

      <details className="method-card">
        <summary>
          How AptScore works <Icon name="chevron-down" />
        </summary>
        <p>
          Places score higher when they are closer by foot and have better ratings. Each category is
          capped at 100. AptScore combines the categories using the importance settings above.
          Places without ratings receive a neutral rating.
        </p>
      </details>
    </section>
  );
};
