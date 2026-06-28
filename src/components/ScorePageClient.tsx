'use client';

import { useEffect, useState } from 'react';
import { InterestPicker } from './InterestPicker';
import { RangeControl } from './RangeControl';
import { ScoreView } from './ScoreView';
import { BreakdownView } from './BreakdownView';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Field } from './ui/Field';
import { ApiError, fetchInterestTypes, scoreLocation } from '../services/api-client';
import type { InterestTypeOption, RangeSetting, ScoreResult } from '../types';

const DEFAULT_RANGE: RangeSetting = { mode: 'minutes', value: 20 };
const inputClasses =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none';

/** The single scoring screen: pick interests + location + range, then see the score. */
export const ScorePageClient = () => {
  const [options, setOptions] = useState<InterestTypeOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<RangeSetting>(DEFAULT_RANGE);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterestTypes()
      .then(setOptions)
      .catch(() => setError('Could not load interest types.'));
  }, []);

  const toggle = (typeId: string) =>
    setSelectedIds((current) =>
      current.includes(typeId)
        ? current.filter((id) => id !== typeId)
        : [...current, typeId],
    );

  const hasSelection = selectedIds.length > 0;
  const canSubmit = hasSelection && query.trim().length > 0 && !loading;

  const labelOf = (typeId: string): string =>
    options.find((option) => option.id === typeId)?.label ?? typeId;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(
        await scoreLocation({
          location: { query: query.trim() },
          interests: selectedIds.map((typeId) => ({ typeId })),
          range,
        }),
      );
    } catch (caught) {
      setResult(null);
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">aptscore</h1>
        <p className="text-sm text-slate-500">
          Score a location by how close it is to the things that matter to you.
        </p>
      </header>

      <Card title="What matters to you?">
        <InterestPicker options={options} selectedIds={selectedIds} onToggle={toggle} />
        {!hasSelection && (
          <p className="mt-2 text-sm text-amber-600">Select at least one interest type to score.</p>
        )}
      </Card>

      <Card title="Where?">
        <Field label="Address or place">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 123 Example St, Townsville"
            className={inputClasses}
          />
        </Field>
      </Card>

      <Card title="How far?">
        <RangeControl value={range} onChange={setRange} />
      </Card>

      <Button onClick={submit} disabled={!canSubmit}>
        {loading ? 'Scoring…' : 'Score this location'}
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <Card title="Result">
          <ScoreView result={result} />
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Why this score</h3>
            <BreakdownView contributions={result.contributions} labelOf={labelOf} />
          </div>
        </Card>
      )}
    </main>
  );
};
