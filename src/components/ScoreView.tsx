import type { ScoreResult } from '../types';

interface ScoreViewProps {
  result: ScoreResult;
}

/**
 * Shows the headline (primary, unbounded) score with the secondary 0–100 score
 * alongside for interpretation (FR-008).
 */
export const ScoreView = ({ result }: ScoreViewProps) => {
  const score = Math.round(result.secondaryScore);
  return (
    <section className="score-hero">
      <div className="score-value">
        <strong data-testid="secondary-score">{score}</strong>
        <span>/100</span>
      </div>
      <div className="score-hero__copy">
        <h2>AptScore</h2>
        <p>Based on your selected categories and walking range.</p>
        <span className="raw-score" data-testid="primary-score">
          Raw score {result.primaryScore.toFixed(2)}
        </span>
      </div>
    </section>
  );
};
