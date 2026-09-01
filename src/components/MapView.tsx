'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection, Point, Polygon } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { IsochroneResult, ScoreResult } from '../types';
import { Icon } from './ui/Icon';

type MapState = 'idle' | 'scoring' | 'mapping' | 'ready' | 'error';

interface MapViewProps {
  isochrone: IsochroneResult | null;
  result: ScoreResult | null;
  state: MapState;
}

const EMPTY_COLLECTION: FeatureCollection = { type: 'FeatureCollection', features: [] };
const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const FALLBACK_ZOOM = 13;
const MAP_LOAD_TIMEOUT_MS = 10_000;

const TYPE_COLORS: Record<string, string> = {
  groceries: '#f97316',
  transit: '#2563eb',
  cafes: '#a16207',
  restaurants: '#e11d48',
  parks: '#16a34a',
  pharmacy: '#db2777',
  bookstores: '#7c3aed',
  pubs: '#9333ea',
  gyms: '#dc2626',
  schools: '#0891b2',
  healthcare: '#e11d48',
  libraries: '#4f46e5',
  bakeries: '#d97706',
  banks: '#475569',
};

const getBounds = (rings: IsochroneResult['rings']) => {
  const coordinates = rings.flat();
  if (coordinates.length === 0) return null;
  return coordinates.reduce(
    (bounds, [lng, lat]) => ({
      west: Math.min(bounds.west, lng),
      south: Math.min(bounds.south, lat),
      east: Math.max(bounds.east, lng),
      north: Math.max(bounds.north, lat),
    }),
    { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
  );
};

const mapLabel = (state: MapState, result: ScoreResult | null): string => {
  if (state === 'scoring') return 'Calculating score…';
  if (state === 'mapping') return 'Loading walking area…';
  if (state === 'error') return 'Walking area unavailable';
  if (state === 'ready' && result) return `${rangeLabel(result.range)} area`;
  return result ? 'Address found' : 'The walking area will appear here';
};

const rangeLabel = (range: ScoreResult['range']): string =>
  range.mode === 'minutes'
    ? `${range.value}-minute walking`
    : `${range.value} ${range.distanceUnit ?? 'm'} walking`;

export const MapView = ({ isochrone, result, state }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const placeData = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features:
        result?.contributions.flatMap((contribution) =>
          contribution.contributingPlaces.map((place) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
            properties: {
              name: place.name,
              typeId: contribution.typeId,
              color: TYPE_COLORS[contribution.typeId] ?? '#334155',
            },
          })),
        ) ?? [],
    }),
    [result],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (process.env.NEXT_PUBLIC_APTSCORE_TEST_MODE === '1') {
      setMapFailed(true);
      return;
    }
    let cancelled = false;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;

    void import('maplibre-gl')
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLE,
          center: [-0.1278, 51.5074],
          zoom: 12.25,
          minZoom: 2,
          maxZoom: 19,
          maxPitch: 55,
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
        loadTimer = setTimeout(() => {
          if (!cancelled && !map.loaded()) {
            console.error('MapLibre did not finish loading; keeping the raster fallback.');
            setMapFailed(true);
          }
        }, MAP_LOAD_TIMEOUT_MS);

        map.on('load', () => {
          clearTimeout(loadTimer);
          map.addSource('walk-cloud', { type: 'geojson', data: EMPTY_COLLECTION });
          map.addLayer({
            id: 'walk-cloud-glow',
            type: 'line',
            source: 'walk-cloud',
            paint: {
              'line-color': '#15715b',
              'line-width': 14,
              'line-opacity': 0.16,
              'line-blur': 8,
            },
          });
          map.addLayer({
            id: 'walk-cloud-fill',
            type: 'fill',
            source: 'walk-cloud',
            paint: {
              'fill-color': '#2e9b78',
              'fill-opacity': 0.18,
            },
          });
          map.addLayer({
            id: 'walk-cloud-line',
            type: 'line',
            source: 'walk-cloud',
            paint: {
              'line-color': '#15715b',
              'line-width': 2,
              'line-opacity': 0.85,
            },
          });
          map.addSource('scored-places', { type: 'geojson', data: EMPTY_COLLECTION });
          map.addLayer({
            id: 'scored-places-halo',
            type: 'circle',
            source: 'scored-places',
            paint: {
              'circle-radius': 8,
              'circle-color': '#ffffff',
              'circle-opacity': 0.95,
            },
          });
          map.addLayer({
            id: 'scored-places-dot',
            type: 'circle',
            source: 'scored-places',
            paint: {
              'circle-radius': 5,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 1,
              'circle-stroke-color': 'rgba(0,0,0,0.12)',
            },
          });
          map.addSource('score-origin', { type: 'geojson', data: EMPTY_COLLECTION });
          map.addLayer({
            id: 'score-origin-pulse',
            type: 'circle',
            source: 'score-origin',
            paint: {
              'circle-radius': 18,
              'circle-color': '#2563eb',
              'circle-opacity': 0.16,
            },
          });
          map.addLayer({
            id: 'score-origin-dot',
            type: 'circle',
            source: 'score-origin',
            paint: {
              'circle-radius': 7,
              'circle-color': '#2563eb',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
            },
          });
          setMapFailed(false);
          setMapReady(true);
        });
        map.on('error', (event) => {
          if (!map.loaded()) {
            console.error('MapLibre error:', event.error);
          }
        });
      })
      .catch((error: unknown) => {
        console.error('MapLibre failed to initialize:', error);
        setMapFailed(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(loadTimer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    (map.getSource('scored-places') as GeoJSONSource).setData(placeData);
    (map.getSource('score-origin') as GeoJSONSource).setData(
      result
        ? {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [result.location.lng, result.location.lat] },
          }
        : EMPTY_COLLECTION,
    );

    const polygon: FeatureCollection<Polygon> = isochrone
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'Polygon', coordinates: isochrone.rings },
            },
          ],
        }
      : { type: 'FeatureCollection', features: [] };
    (map.getSource('walk-cloud') as GeoJSONSource).setData(polygon);

    if (isochrone) {
      const bounds = getBounds(isochrone.rings);
      if (bounds) {
        map.fitBounds(
          [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north],
          ],
          {
            padding: window.matchMedia('(min-width: 900px)').matches
              ? { top: 90, right: 90, bottom: 90, left: 510 }
              : {
                  top: 50,
                  right: 36,
                  bottom: Math.round(window.innerHeight * 0.62) + 24,
                  left: 36,
                },
            duration: 900,
            maxZoom: 15,
          },
        );
      }
    } else if (result) {
      map.easeTo({ center: [result.location.lng, result.location.lat], zoom: 13, duration: 700 });
    }
  }, [isochrone, mapReady, placeData, result]);

  return (
    <section
      className="map-stage"
      aria-label="Interactive neighborhood map"
      data-testid="isochrone-map"
    >
      <StaticMapFallback isochrone={isochrone} result={result} />
      <div
        ref={containerRef}
        className={`maplibre-container ${mapReady && !mapFailed ? 'is-ready' : ''}`}
      />

      <div className={`map-status map-status--${state}`} role="status" aria-live="polite">
        <span className="map-status__icon">
          {state === 'scoring' || state === 'mapping' ? (
            <span className="map-spinner" />
          ) : (
            <Icon name={state === 'ready' ? 'walk' : state === 'error' ? 'cross' : 'layers'} />
          )}
        </span>
        <span>{mapLabel(state, result)}</span>
      </div>

      <div className="map-controls" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Icon name="plus" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Icon name="minus" />
        </button>
      </div>

      {isochrone && (
        <div className="map-legend">
          <span className="map-legend__cloud" />
          <span>
            <strong>Walking area</strong>
            <small>{isochrone.attribution}</small>
          </span>
        </div>
      )}
    </section>
  );
};

/** Raster fallback for browsers without WebGL; MapLibre covers it when available. */
const StaticMapFallback = ({ isochrone, result }: Pick<MapViewProps, 'isochrone' | 'result'>) => {
  const center = result
    ? { lng: result.location.lng, lat: result.location.lat }
    : { lng: -0.1278, lat: 51.5074 };
  const worldTiles = 2 ** FALLBACK_ZOOM;
  const centerX = ((center.lng + 180) / 360) * worldTiles;
  const sinLat = Math.sin((center.lat * Math.PI) / 180);
  const centerY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldTiles;
  const tiles = [];

  for (let dx = -3; dx <= 3; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const x = Math.floor(centerX) + dx;
      const y = Math.floor(centerY) + dy;
      tiles.push({
        key: `${x}-${y}`,
        x,
        y,
        left: (x + 0.5 - centerX) * 256,
        top: (y + 0.5 - centerY) * 256,
      });
    }
  }

  const cloudPath = isochrone ? fallbackCloudPath(isochrone.rings) : null;

  return (
    <div className="static-map" aria-hidden="true">
      {tiles.map((tile) => (
        <div
          className="static-map__tile"
          key={tile.key}
          style={{
            left: `calc(var(--fallback-center-x) + ${tile.left}px)`,
            top: `calc(var(--fallback-center-y) + ${tile.top}px)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${FALLBACK_ZOOM}/${tile.y}/${tile.x}`}
            alt=""
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/${FALLBACK_ZOOM}/${tile.y}/${tile.x}`}
            alt=""
          />
        </div>
      ))}
      {cloudPath && (
        <svg className="static-cloud" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d={cloudPath} className="static-cloud__glow" />
          <path d={cloudPath} className="static-cloud__shape" />
          <circle cx="65" cy="50" r="1.25" className="static-cloud__pulse" />
          <circle cx="65" cy="50" r=".58" className="static-cloud__origin" />
        </svg>
      )}
      <small className="static-map__attribution">Esri · OpenStreetMap contributors</small>
    </div>
  );
};

const fallbackCloudPath = (rings: IsochroneResult['rings']): string => {
  const all = rings.flat();
  if (all.length === 0) return '';
  const lngs = all.map(([lng]) => lng);
  const lats = all.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const width = maxLng - minLng || 1;
  const height = maxLat - minLat || 1;
  const scale = Math.min(30 / width, 54 / height);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  return rings
    .map(
      (ring) =>
        ring
          .map(([lng, lat], index) => {
            const x = 65 + (lng - centerLng) * scale;
            const y = 50 - (lat - centerLat) * scale;
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ') + ' Z',
    )
    .join(' ');
};
