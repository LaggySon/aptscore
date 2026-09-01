import type { PaceData } from '../../domain/pace-types';
import type { LatLng } from '../places/places-adapter';

/** Supplies provider-neutral urban-intensity inputs for the pure Local Pace scorer. */
export interface PaceAdapter {
  getPaceData(center: LatLng): Promise<PaceData>;
}
