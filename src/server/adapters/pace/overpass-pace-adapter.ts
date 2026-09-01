import { PACE_MODEL_V1 } from '../../domain/pace-constants';
import type {
  PaceData,
  PaceRoadClass,
  PaceStreetKind,
  PaceTransitKind,
} from '../../domain/pace-types';
import { haversineMeters } from '../../lib/geo';
import { OsmClient } from '../overpass-client';
import type { LatLng } from '../places/places-adapter';
import type { PaceAdapter } from './pace-adapter';

interface OverpassPoint {
  lat: number;
  lon: number;
}

export interface OverpassPaceElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: OverpassPoint;
  geometry?: OverpassPoint[];
  tags?: Record<string, string>;
}

export interface OverpassPaceResponse {
  elements: OverpassPaceElement[];
}

export interface OverpassPaceOptions {
  overpassUrl: string;
  userAgent?: string;
}

const STREET_AMENITIES = new Set<PaceStreetKind>([
  'cafe',
  'restaurant',
  'pub',
  'bar',
  'fast_food',
  'pharmacy',
  'bank',
  'post_office',
  'library',
  'cinema',
  'theatre',
]);

const TOURISM_KINDS = new Set(['museum', 'gallery', 'attraction']);

const ROAD_CLASSES: Record<string, PaceRoadClass | undefined> = {
  motorway: 'motorway_trunk',
  motorway_link: 'motorway_trunk',
  trunk: 'motorway_trunk',
  trunk_link: 'motorway_trunk',
  primary: 'primary',
  primary_link: 'primary',
  secondary: 'secondary',
  secondary_link: 'secondary',
  tertiary: 'tertiary',
  tertiary_link: 'tertiary',
  residential: 'residential_unclassified',
  unclassified: 'residential_unclassified',
};

const pointOf = (element: OverpassPaceElement): LatLng | undefined => {
  if (element.center) return { lat: element.center.lat, lng: element.center.lon };
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lng: element.lon };
  }
  return undefined;
};

const streetKindOf = (tags: Record<string, string>): PaceStreetKind | undefined => {
  if (tags.shop) return 'shop';
  if (STREET_AMENITIES.has(tags.amenity as PaceStreetKind)) {
    return tags.amenity as PaceStreetKind;
  }
  if (TOURISM_KINDS.has(tags.tourism)) return tags.tourism as PaceStreetKind;
  if (tags.leisure) return 'leisure';
  if (tags.office) return 'office';
  return undefined;
};

const transitKindOf = (tags: Record<string, string>): PaceTransitKind | undefined => {
  if (
    tags.railway === 'station' ||
    tags.railway === 'halt' ||
    tags.public_transport === 'station'
  ) {
    return 'station';
  }
  if (tags.railway === 'subway_entrance' || tags.entrance === 'station') {
    return 'station_entrance';
  }
  if (
    tags.railway === 'tram_stop' ||
    (tags.public_transport === 'platform' && tags.tram === 'yes')
  ) {
    return 'tram_stop';
  }
  if (
    tags.railway === 'platform' ||
    (tags.public_transport === 'platform' &&
      (tags.train === 'yes' || tags.subway === 'yes' || tags.light_rail === 'yes'))
  ) {
    return 'rail_platform';
  }
  if (tags.highway === 'bus_stop' || (tags.public_transport === 'platform' && tags.bus === 'yes')) {
    return 'bus_stop';
  }
  return undefined;
};

/** Convert an OSM response to stable provider-neutral features. */
export const parseOverpassPaceResponse = (
  center: LatLng,
  response: OverpassPaceResponse,
): PaceData => {
  const data: PaceData = { streetFeatures: [], transitFeatures: [], roadSegments: [] };

  for (const element of response.elements) {
    const tags = element.tags ?? {};
    const point = pointOf(element);
    if (point) {
      const distanceMeters = haversineMeters(center, point);
      if (distanceMeters <= PACE_MODEL_V1.radiusMeters) {
        const streetKind = streetKindOf(tags);
        if (streetKind) data.streetFeatures.push({ kind: streetKind, distanceMeters });
        const transitKind = transitKindOf(tags);
        if (transitKind) data.transitFeatures.push({ kind: transitKind, distanceMeters });
      }
    }

    const roadClass = ROAD_CLASSES[tags.highway];
    if (!roadClass || !element.geometry) continue;
    for (let index = 1; index < element.geometry.length; index += 1) {
      const start = element.geometry[index - 1];
      const end = element.geometry[index];
      const midpoint = { lat: (start.lat + end.lat) / 2, lng: (start.lon + end.lon) / 2 };
      const distanceMeters = haversineMeters(center, midpoint);
      if (distanceMeters > PACE_MODEL_V1.radiusMeters) continue;
      data.roadSegments.push({
        roadClass,
        lengthMeters: haversineMeters(
          { lat: start.lat, lng: start.lon },
          { lat: end.lat, lng: end.lon },
        ),
        distanceMeters,
      });
    }
  }

  return data;
};

export const buildOverpassPaceQuery = (center: LatLng): string => {
  const around = `(around:${PACE_MODEL_V1.radiusMeters},${center.lat},${center.lng})`;
  return (
    `[out:json][timeout:25];(` +
    `nwr["shop"]${around};` +
    `nwr["amenity"~"^(cafe|restaurant|pub|bar|fast_food|pharmacy|bank|post_office|library|cinema|theatre)$"]${around};` +
    `nwr["tourism"~"^(museum|gallery|attraction)$"]${around};` +
    `nwr["leisure"]${around};nwr["office"]${around};` +
    `nwr["railway"~"^(station|halt|platform|tram_stop|subway_entrance)$"]${around};` +
    `nwr["public_transport"~"^(station|platform)$"]${around};` +
    `nwr["entrance"="station"]${around};node["highway"="bus_stop"]${around};` +
    `)->.features;` +
    `way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified)$"]${around}->.roads;` +
    `.features out center;.roads out geom;`
  );
};

export class OverpassPaceAdapter implements PaceAdapter {
  private readonly client: OsmClient;

  constructor(private readonly options: OverpassPaceOptions) {
    this.client = new OsmClient(options.userAgent ?? 'aptscore/0.1');
  }

  async getPaceData(center: LatLng): Promise<PaceData> {
    const response = await this.client.fetchJson<OverpassPaceResponse>(this.options.overpassUrl, {
      method: 'POST',
      body: buildOverpassPaceQuery(center),
    });
    return parseOverpassPaceResponse(center, response);
  }
}
