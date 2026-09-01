import type { PaceComponents, PaceData } from '../../src/server/domain/pace-types';

interface CalibrationFixture {
  name: string;
  data: PaceData;
  raw: PaceComponents;
  expectedPaceMph: number;
}

/**
 * Compact, no-network representations of the weighted raw measurements captured from
 * OSM on 2026-09-01. Detailed category/ring counts live in the calibration document.
 */
const fromMeasuredRaw = (raw: PaceComponents): PaceData => ({
  // An outer-ring office contributes 0.25 * 0.5 = 0.125 per quantity.
  streetFeatures: [{ kind: 'office', distanceMeters: 600, quantity: raw.streetActivity / 0.125 }],
  // An outer-ring bus stop contributes 0.25 * 0.5 = 0.125 per quantity.
  transitFeatures: [
    { kind: 'bus_stop', distanceMeters: 600, quantity: raw.transitIntensity / 0.125 },
  ],
  // Inner primary-road length contributes 4 raw units per metre.
  roadSegments: [
    { roadClass: 'primary', distanceMeters: 200, lengthMeters: raw.roadIntensity / 4 },
  ],
});

const fixture = (
  name: string,
  raw: PaceComponents,
  expectedPaceMph: number,
): CalibrationFixture => ({ name, raw, expectedPaceMph, data: fromMeasuredRaw(raw) });

export const PACE_CALIBRATION_FIXTURES: CalibrationFixture[] = [
  fixture('Lee', { streetActivity: 28.75, transitIntensity: 11, roadIntensity: 19_865.752 }, 18),
  fixture(
    'Blackheath',
    { streetActivity: 111.5, transitIntensity: 8.875, roadIntensity: 11_460.521 },
    20,
  ),
  fixture(
    'Ealing Broadway',
    { streetActivity: 269.25, transitIntensity: 12.75, roadIntensity: 17_342.781 },
    30,
  ),
  fixture(
    'Chiswick',
    { streetActivity: 252.75, transitIntensity: 21.375, roadIntensity: 21_388.644 },
    33,
  ),
  fixture(
    'Paddington',
    { streetActivity: 438.375, transitIntensity: 69.125, roadIntensity: 41_792.261 },
    60,
  ),
  fixture(
    'Oxford Circus',
    { streetActivity: 2_080.625, transitIntensity: 65.625, roadIntensity: 40_567.961 },
    100,
  ),
  fixture(
    'Richmond validation',
    { streetActivity: 434.25, transitIntensity: 31.5, roadIntensity: 23_896.683 },
    39,
  ),
  fixture(
    'Stratford validation',
    { streetActivity: 697.625, transitIntensity: 75.75, roadIntensity: 20_171.594 },
    57,
  ),
];
