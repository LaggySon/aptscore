import type { PaceData } from '../../domain/pace-types';
import type { PaceAdapter } from './pace-adapter';

const EMPTY_PACE_DATA: PaceData = {
  streetFeatures: [],
  transitFeatures: [],
  roadSegments: [],
};

/** Deterministic no-network adapter used by API and browser tests. */
export class MockPaceAdapter implements PaceAdapter {
  constructor(private readonly data: PaceData = EMPTY_PACE_DATA) {}

  async getPaceData(): Promise<PaceData> {
    return structuredClone(this.data);
  }
}
