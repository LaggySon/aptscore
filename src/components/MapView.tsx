import { useId } from 'react';
import { formatWalkMinutes } from '../lib/format';
import type { GeoPosition, IsochroneResult } from '../types';

interface MapViewProps {
  isochrone: IsochroneResult;
}

const WIDTH = 460;
const HEIGHT = 320;
const PADDING = 28;
const METERS_PER_DEGREE_LAT = 111_320;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

interface Point {
  x: number;
  y: number;
}

/**
 * Project [lng, lat] positions into SVG space around the origin. Longitude is scaled by
 * cos(latitude) so the reachable-area shape keeps its true proportions, and the whole
 * boundary is fit into the frame with uniform scaling (north points up).
 */
const project = (
  rings: GeoPosition[][],
  origin: { lat: number; lng: number },
): { rings: Point[][]; origin: Point } => {
  const metersPerDegreeLng =
    METERS_PER_DEGREE_LAT * Math.cos(toRadians(origin.lat)) || METERS_PER_DEGREE_LAT;
  const toMeters = ([lng, lat]: GeoPosition): Point => ({
    x: (lng - origin.lng) * metersPerDegreeLng,
    y: (lat - origin.lat) * METERS_PER_DEGREE_LAT,
  });

  const metric = rings.map((ring) => ring.map(toMeters));
  const all = metric.flat().concat({ x: 0, y: 0 });
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((WIDTH - 2 * PADDING) / spanX, (HEIGHT - 2 * PADDING) / spanY);
  const offsetX = (WIDTH - spanX * scale) / 2;
  const offsetY = (HEIGHT - spanY * scale) / 2;

  // Flip y so north (larger latitude) renders towards the top of the frame.
  const place = (p: Point): Point => ({
    x: offsetX + (p.x - minX) * scale,
    y: HEIGHT - (offsetY + (p.y - minY) * scale),
  });

  return {
    rings: metric.map((ring) => ring.map(place)),
    origin: place({ x: 0, y: 0 }),
  };
};

const toPath = (ring: Point[]): string =>
  ring.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

/**
 * Renders the Google Isochrones reachable area as a translucent "cloud" over a stylized
 * map backdrop, with the origin pinned at its centre. This is the map visualization for
 * the walk-time catchment the scoring uses — the polygon is the set of points reachable on
 * foot within the range, not a plain radius.
 */
export const MapView = ({ isochrone }: MapViewProps) => {
  const rawId = useId().replace(/:/g, '');
  const cloudGradient = `cloud-${rawId}`;
  const cloudBlur = `blur-${rawId}`;
  const gridId = `grid-${rawId}`;

  const { rings, origin } = project(isochrone.rings, isochrone.location);
  const outer = rings[0] ?? [];
  const holes = rings.slice(1);
  const label = `Reachable within ${formatWalkMinutes(isochrone.durationSeconds)} on foot`;

  return (
    <figure className="space-y-2" data-testid="isochrone-map">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-lg border border-slate-200"
        role="img"
        aria-label={label}
      >
        <defs>
          <radialGradient id={cloudGradient} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.12" />
          </radialGradient>
          <filter id={cloudBlur} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Map-like backdrop */}
        <rect width={WIDTH} height={HEIGHT} fill="#f8fafc" />
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${gridId})`} />

        {/* The reachable-area "cloud" (outer boundary with any holes cut out) */}
        <g filter={`url(#${cloudBlur})`}>
          <path
            d={[outer, ...holes].map(toPath).join(' ')}
            fill={`url(#${cloudGradient})`}
            fillRule="evenodd"
          />
        </g>
        <path
          d={toPath(outer)}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="1.5"
          strokeOpacity="0.8"
          strokeLinejoin="round"
        />

        {/* Origin pin */}
        <g transform={`translate(${origin.x.toFixed(1)} ${origin.y.toFixed(1)})`}>
          <circle r="7" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
          <circle r="2.5" fill="#4f46e5" />
        </g>

        {/* Compass */}
        <g transform={`translate(${WIDTH - 22} 22)`} fill="#94a3b8" fontSize="10" fontWeight="700">
          <text textAnchor="middle" dy="3">
            N
          </text>
          <path d="M0 6 L-3 12 L3 12 Z" fill="#cbd5e1" />
        </g>
      </svg>
      <figcaption className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500/40 ring-1 ring-indigo-500/70" />
          {label}
        </span>
        <span className="text-slate-400">{isochrone.attribution}</span>
      </figcaption>
    </figure>
  );
};
