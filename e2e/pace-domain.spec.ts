import { test, expect } from '@playwright/test';
import {
  combinePaceComponents,
  computeLocalPace,
  computeRoadIntensityRaw,
  computeStreetActivityRaw,
  computeTransitIntensityRaw,
  paceLabelFor,
} from '../src/server/domain/pace-score';
import { PACE_MODEL_V1 } from '../src/server/domain/pace-constants';
import type {
  PaceData,
  PaceRoadClass,
  PaceStreetFeature,
  PaceTransitFeature,
} from '../src/server/domain/pace-types';
import { PACE_CALIBRATION_FIXTURES } from './fixtures/pace-calibration';

const emptyData = (): PaceData => ({ streetFeatures: [], transitFeatures: [], roadSegments: [] });

test.describe('Local Pace v1 component math', () => {
  test('an empty area scores zero', () => {
    expect(computeLocalPace(emptyData())).toEqual({
      paceMph: 0,
      paceLabel: 'Extremely quiet',
      modelVersion: 1,
      radiusMeters: 800,
      components: { streetActivity: 0, transitIntensity: 0, roadIntensity: 0 },
      raw: { streetActivity: 0, transitIntensity: 0, roadIntensity: 0 },
    });
  });

  test('applies full weight in 0-400m and half weight in 400-800m', () => {
    expect(
      computeStreetActivityRaw([
        { kind: 'cafe', distanceMeters: 400 },
        { kind: 'cafe', distanceMeters: 401 },
        { kind: 'cafe', distanceMeters: 800 },
        { kind: 'cafe', distanceMeters: 801 },
      ]),
    ).toBe(2.5);
  });

  const streetCases: Array<[PaceStreetFeature['kind'], number]> = [
    ['shop', 1],
    ['cafe', 1.25],
    ['restaurant', 1.25],
    ['pub', 1.25],
    ['bar', 1.25],
    ['fast_food', 1.25],
    ['pharmacy', 0.75],
    ['bank', 0.75],
    ['post_office', 0.75],
    ['library', 0.75],
    ['cinema', 0.75],
    ['theatre', 0.75],
    ['museum', 0.75],
    ['gallery', 0.75],
    ['attraction', 0.75],
    ['leisure', 0.5],
    ['office', 0.25],
  ];

  for (const [kind, weight] of streetCases) {
    test(`uses the v1 ${kind} street weight`, () => {
      expect(computeStreetActivityRaw([{ kind, distanceMeters: 100 }])).toBe(weight);
    });
  }

  const transitCases: Array<[PaceTransitFeature['kind'], number]> = [
    ['station', 5],
    ['rail_platform', 1.5],
    ['tram_stop', 1],
    ['station_entrance', 0.5],
    ['bus_stop', 0.25],
  ];

  for (const [kind, weight] of transitCases) {
    test(`uses the v1 ${kind} transit weight`, () => {
      expect(computeTransitIntensityRaw([{ kind, distanceMeters: 100 }])).toBe(weight);
    });
  }

  const roadCases: Array<[PaceRoadClass, number]> = [
    ['motorway_trunk', 5],
    ['primary', 4],
    ['secondary', 2.5],
    ['tertiary', 1.5],
    ['residential_unclassified', 0.25],
  ];

  for (const [roadClass, multiplier] of roadCases) {
    test(`uses the v1 ${roadClass} road multiplier`, () => {
      expect(computeRoadIntensityRaw([{ roadClass, lengthMeters: 100, distanceMeters: 100 }])).toBe(
        100 * multiplier,
      );
    });
  }

  test('applies ring weighting to road segment length', () => {
    expect(
      computeRoadIntensityRaw([
        { roadClass: 'primary', lengthMeters: 100, distanceMeters: 400 },
        { roadClass: 'primary', lengthMeters: 100, distanceMeters: 401 },
      ]),
    ).toBe(600);
  });

  test('clamps every normalized component at 100', () => {
    const data: PaceData = {
      streetFeatures: [{ kind: 'shop', distanceMeters: 0, quantity: 1_000_000 }],
      transitFeatures: [{ kind: 'station', distanceMeters: 0, quantity: 1_000_000 }],
      roadSegments: [
        {
          roadClass: 'primary',
          distanceMeters: 0,
          lengthMeters: 1_000_000,
        },
      ],
    };
    expect(computeLocalPace(data).components).toEqual({
      streetActivity: 100,
      transitIntensity: 100,
      roadIntensity: 100,
    });
  });
});

test.describe('Local Pace v1 final formula and labels', () => {
  test('freezes the calibrated Pace Model v1 normalization constants', () => {
    expect(PACE_MODEL_V1.normalization).toEqual({
      streetActivity: [
        { raw: 0, score: 0 },
        { raw: 28.75, score: 1 },
        { raw: 111.5, score: 13 },
        { raw: 252.75, score: 18 },
        { raw: 269.25, score: 20 },
        { raw: 438.375, score: 20 },
        { raw: 2080.625, score: 100 },
      ],
      transitIntensity: [
        { raw: 0, score: 0 },
        { raw: 8.875, score: 21.667 },
        { raw: 11, score: 21.667 },
        { raw: 12.75, score: 36.667 },
        { raw: 21.375, score: 43.333 },
        { raw: 65.625, score: 100 },
      ],
      roadIntensity: [
        { raw: 0, score: 0 },
        { raw: 11460.521, score: 35 },
        { raw: 17342.781, score: 45 },
        { raw: 19865.752, score: 55 },
        { raw: 21388.644, score: 55 },
        { raw: 40567.961, score: 100 },
      ],
    });
  });
  test('uses exact 50/30/20 component weights', () => {
    expect(
      combinePaceComponents({ streetActivity: 20, transitIntensity: 40, roadIntensity: 60 }),
    ).toBe(34);
  });

  test('rounds half points upward', () => {
    expect(
      combinePaceComponents({ streetActivity: 21, transitIntensity: 40, roadIntensity: 60 }),
    ).toBe(35);
  });

  test('clamps final values at both boundaries', () => {
    expect(
      combinePaceComponents({ streetActivity: -100, transitIntensity: 0, roadIntensity: 0 }),
    ).toBe(0);
    expect(
      combinePaceComponents({ streetActivity: 200, transitIntensity: 200, roadIntensity: 200 }),
    ).toBe(100);
  });

  test('maps every label boundary', () => {
    expect([0, 9, 10, 19, 20, 29, 30, 44, 45, 64, 65, 84, 85, 100].map(paceLabelFor)).toEqual([
      'Extremely quiet',
      'Extremely quiet',
      'Quiet neighbourhood',
      'Quiet neighbourhood',
      'Village / neighbourhood centre',
      'Village / neighbourhood centre',
      'Busy town centre',
      'Busy town centre',
      'Major urban centre',
      'Major urban centre',
      'Very intense urban centre',
      'Very intense urban centre',
      'Hyper-central',
      'Hyper-central',
    ]);
  });
});

test.describe('Local Pace v1 deterministic calibration fixtures', () => {
  for (const fixture of PACE_CALIBRATION_FIXTURES) {
    test(`${fixture.name} locks its measured raw values and pace output`, () => {
      const first = computeLocalPace(fixture.data);
      const second = computeLocalPace(fixture.data);
      expect(second).toEqual(first);
      expect(first.raw).toEqual(fixture.raw);
      expect(first.paceMph).toBe(fixture.expectedPaceMph);
      expect(first.modelVersion).toBe(1);
      expect(Object.keys(first.components)).toEqual([
        'streetActivity',
        'transitIntensity',
        'roadIntensity',
      ]);
    });
  }
});
