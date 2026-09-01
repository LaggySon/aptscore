'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  ImportanceLevel,
  InterestTypeOption,
  IsochroneResult,
  RangeSetting,
  ScoreResult,
} from '../types';
import {
  ApiError,
  fetchInterestTypes,
  fetchIsochrone,
  scoreLocation,
} from '../services/api-client';
import { BreakdownView } from './BreakdownView';
import { ImportanceControl } from './ImportanceControl';
import { InterestPicker } from './InterestPicker';
import { LocalPaceView } from './LocalPaceView';
import { MapView } from './MapView';
import { RangeControl } from './RangeControl';
import { ScoreView } from './ScoreView';
import { Icon } from './ui/Icon';

const DEFAULT_RANGE: RangeSetting = { mode: 'minutes', value: 20 };
type MapState = 'idle' | 'scoring' | 'mapping' | 'ready' | 'error';

const rangeLabel = (range: RangeSetting): string =>
  range.mode === 'minutes'
    ? `${range.value} min walk`
    : `${range.value} ${range.distanceUnit ?? 'm'} walk`;

export const ScorePageClient = () => {
  const [options, setOptions] = useState<InterestTypeOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importanceByType, setImportanceByType] = useState<Record<string, ImportanceLevel>>({});
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<RangeSetting>(DEFAULT_RANGE);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [isochrone, setIsochrone] = useState<IsochroneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapState, setMapState] = useState<MapState>('idle');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchInterestTypes()
      .then(setOptions)
      .catch(() =>
        setError('We could not load the preference list. Please refresh and try again.'),
      );
  }, []);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [result]);

  const labelOf = (typeId: string): string =>
    options.find((option) => option.id === typeId)?.label ?? typeId;

  const toggle = (typeId: string) =>
    setSelectedIds((current) =>
      current.includes(typeId) ? current.filter((id) => id !== typeId) : [...current, typeId],
    );

  const canSubmit = selectedIds.length > 0 && query.trim().length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setIsochrone(null);
    setMapState('scoring');

    try {
      const score = await scoreLocation({
        location: { query: query.trim() },
        interests: selectedIds.map((typeId) => ({
          typeId,
          importance: importanceByType[typeId] ?? 'medium',
        })),
        range,
      });
      setResult(score);
      setMapState('mapping');

      try {
        const cloud = await fetchIsochrone({
          location: { lat: score.location.lat, lng: score.location.lng },
          range,
        });
        setIsochrone(cloud);
        setMapState('ready');
      } catch {
        setMapState('error');
      }
    } catch (caught) {
      setResult(null);
      setMapState('idle');
      setError(
        caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const editSearch = () => {
    setResult(null);
    setIsochrone(null);
    setError(null);
    setMapState('idle');
  };

  return (
    <main
      className={`app-shell ${result ? 'has-result' : ''} ${panelCollapsed ? 'is-panel-collapsed' : ''}`}
    >
      <MapView
        isochrone={isochrone}
        result={result}
        state={mapState}
        panelCollapsed={panelCollapsed}
      />

      <button
        type="button"
        className="panel-visibility-toggle"
        aria-controls="score-panel"
        aria-expanded={!panelCollapsed}
        aria-label={panelCollapsed ? 'Show search panel' : 'Hide search panel'}
        onClick={() => setPanelCollapsed((current) => !current)}
      >
        <Icon name="chevron-down" />
        <span>{panelCollapsed ? 'Show search' : 'Hide'}</span>
      </button>

      <aside
        id="score-panel"
        ref={panelRef}
        className="app-panel"
        aria-hidden={panelCollapsed}
        aria-label={result ? 'Location score results' : 'Score a location'}
      >
        {result ? (
          <div className="results-view">
            <header className="panel-header panel-header--sticky">
              <button type="button" className="back-button" onClick={editSearch}>
                <Icon name="arrow-left" /> New search
              </button>
              <Brand compact />
            </header>

            <div className="result-location">
              <span className="result-location__pin">
                <Icon name="location" />
              </span>
              <div>
                <h1>{result.location.query ?? query}</h1>
                <span>
                  {rangeLabel(result.range)} · {selectedIds.length}{' '}
                  {selectedIds.length === 1 ? 'category' : 'categories'}
                </span>
              </div>
            </div>

            <ScoreView result={result} />
            <LocalPaceView pace={result.localPace} />
            <BreakdownView contributions={result.contributions} labelOf={labelOf} />

            <button type="button" className="secondary-button" onClick={editSearch}>
              <Icon name="arrow-left" /> Adjust this search
            </button>
          </div>
        ) : (
          <div className="setup-view">
            <header className="panel-header">
              <Brand />
            </header>

            <div className="intro-copy">
              <h1>Check an address</h1>
              <p>Choose the places you need. AptScore measures walking routes from the address.</p>
            </div>

            <form
              className="score-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <section className="form-section">
                <div className="form-section__heading">
                  <span>1</span>
                  <div>
                    <h2>Address</h2>
                    <p>Enter a street address or place name.</p>
                  </div>
                </div>
                <label className="location-input">
                  <Icon name="search" />
                  <span className="sr-only">Address or place</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="e.g. 123 Example St, Townsville"
                    autoComplete="street-address"
                  />
                </label>
              </section>

              <section className="form-section">
                <div className="form-section__heading">
                  <span>2</span>
                  <div>
                    <h2>Places you care about</h2>
                    <p>Select at least one category.</p>
                  </div>
                  {selectedIds.length > 0 && <em>{selectedIds.length} selected</em>}
                </div>
                <InterestPicker options={options} selectedIds={selectedIds} onToggle={toggle} />
                {selectedIds.length === 0 ? (
                  <p className="selection-hint">Select at least one interest type to continue.</p>
                ) : (
                  <div className="priority-tuning">
                    <p>
                      Importance <span>Optional</span>
                    </p>
                    <ul>
                      {selectedIds.map((id) => (
                        <li key={id}>
                          <span>{labelOf(id)}</span>
                          <ImportanceControl
                            ariaLabel={`Importance for ${labelOf(id)}`}
                            value={importanceByType[id] ?? 'medium'}
                            onChange={(level) =>
                              setImportanceByType((current) => ({ ...current, [id]: level }))
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="form-section">
                <div className="form-section__heading">
                  <span>3</span>
                  <div>
                    <h2>Walking range</h2>
                    <p>Choose a travel time or distance.</p>
                  </div>
                </div>
                <RangeControl value={range} onChange={setRange} />
              </section>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="primary-button"
                type="submit"
                aria-label="Score this location"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <span className="button-spinner" /> Calculating…
                  </>
                ) : (
                  <>
                    Calculate score <Icon name="arrow-right" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </aside>
    </main>
  );
};

const Brand = ({ compact = false }: { compact?: boolean }) => (
  <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="AptScore">
    <span className="brand-mark" aria-hidden="true">
      <Icon name="location" />
    </span>
    <span>
      <strong>AptScore</strong>
      {!compact && <small>Walking access by address</small>}
    </span>
  </div>
);
