import { ScoreBadge } from './ui/ScoreBadge';
import type { ScoreResult } from '../types';

interface ScoreViewProps {
  result: ScoreResult;
}

/**
 * Shows the headline (primary, unbounded) score with the secondary 0–100 score
 * alongside for interpretation (FR-008).
 */
export const ScoreView = ({ result }: ScoreViewProps) => (
  <div className="flex items-end gap-8">
    <ScoreBadge
      label="Overall score"
      value={result.primaryScore.toFixed(2)}
      emphasis="headline"
      testId="primary-score"
    />
    <ScoreBadge
      label="Normalized (0–100)"
      value={Math.round(result.secondaryScore).toString()}
      emphasis="muted"
      testId="secondary-score"
    />
  </div>
);
