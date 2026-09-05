import { useEffect, useRef } from 'react';
import type { Trip } from '../types';
import { Map as MaplibreMap, Marker, LngLatBounds, GeoJSONSource, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useResolvedTripStops } from '../hooks/useResolvedTripStops';
import { SHEET_COLLAPSED_TOP } from './TripContentSheet';

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.js`);

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ROUTE_SOURCE_ID = 'trip-hero-route';
const ROUTE_LAYER_ID = 'trip-hero-route-line';
// Free, keyless routing (same "no API key" convention as the tile source
// and the Wikipedia/Wikivoyage cover-photo lookups) -- no uptime SLA, so
// every call site here falls back to the straight-line route on failure.
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving/';

// Real road-following geometry between stops, in visit order. Returns null
// (caller keeps the straight-line fallback already drawn) on any failure --
// network error, no drivable path between stops, rate limit, etc.
async function fetchRoadRoute(stops: { lng: number; lat: number }[]): Promise<[number, number][] | null> {
  try {
    const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
    const res = await fetch(`${OSRM_ROUTE_URL}${coords}?overview=full&geometries=geojson`);
    if (!res.ok) return null;
    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry;
    if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return null;
    return geometry.coordinates;
  } catch {
    return null;
  }
}

function getHeaderHeightPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--trip-header-height').trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 126;
}

// How much of the map to zoom out by when the sheet expands, purely as a
// visual "the map is making room" cue -- not a real bounds recompute.
const SHEET_EXPANDED_ZOOM_DELTA = -0.6;

interface Props {
  trip: Trip | null;
  sheetExpanded?: boolean;
  onToneChange?: (tone: 'light' | 'dark') => void;
}

// Continuous full-screen map backdrop for the trip dashboard, pinned and
// fit-to-bounds on the trip's cities. Fixed behind the header and the
// content sheet (see .trip-map-hero / .trip-sheet in index.css) -- one
// persistent instance for the whole dashboard, not per-tab.
export function TripMapHero({ trip, sheetExpanded, onToneChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const validStops = useResolvedTripStops(trip);
  const baseZoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || validStops.length === 0) return;

    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [validStops[0].lng, validStops[0].lat],
      // fitBounds below still runs for single-stop trips (a lone point is a
      // valid non-empty bounds), but seed a sensible city-level zoom here
      // for the brief pre-'load' paint instead of a fixed 10 regardless of
      // how many stops there turn out to be.
      zoom: validStops.length > 1 ? 10 : 12,
      attributionControl: false,
    });
    mapInstanceRef.current = map;
    baseZoomRef.current = null;

    // OpenFreeMap Liberty is a bright pastel map style -- defaulting header
    // tone to dark ensures high-contrast readable text (#10151F) without
    // stalling the GPU pipeline with continuous WebGL canvas readbacks.
    onToneChange?.('dark');

    map.on('load', () => {
      const bounds = new LngLatBounds();
      // Fit padding needs real clearance under the floating translucent
      // header, not a flat guess -- otherwise the top of the route/pins
      // renders partially hidden behind it on open. Bottom clearance has
      // to match the content sheet's own collapsed position (it starts
      // covering the bottom SHEET_COLLAPSED_TOP% of the screen on open) --
      // otherwise fitBounds fits the whole container height and half the
      // route ends up hidden under the sheet, looking zoomed-in above it.
      const containerHeight = mapContainerRef.current?.clientHeight ?? window.innerHeight;
      const fitPadding = {
        top: getHeaderHeightPx() + 24,
        bottom: containerHeight * ((100 - SHEET_COLLAPSED_TOP) / 100) + 24,
        left: 48,
        right: 48,
      };

      // Highlight the route when the trip has multiple stops. Straight
      // line first (instant, always available), then swapped for the real
      // road-following geometry once OSRM responds -- never leaves the
      // map blank while waiting on the network.
      if (validStops.length > 1) {
        const straightCoordinates: [number, number][] = validStops.map((s) => [s.lng, s.lat]);

        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: straightCoordinates } },
        });

        map.addLayer({
          id: `${ROUTE_LAYER_ID}-glow`,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#0F6F63', 'line-width': 6, 'line-opacity': 0.6 },
        });

        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FF7A00', 'line-width': 3.5, 'line-dasharray': [2, 2] },
        });

        fetchRoadRoute(validStops).then((roadCoordinates) => {
          if (!roadCoordinates || !mapInstanceRef.current) return;
          const source = map.getSource(ROUTE_SOURCE_ID);
          if (!(source instanceof GeoJSONSource)) return;
          source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: roadCoordinates } });

          // Refit over the real path -- a road route can bow well outside
          // the straight-line box between stops (highway detours, coastal
          // roads), so every point along it needs to be in view, not just
          // the stops themselves.
          const roadBounds = new LngLatBounds();
          roadCoordinates.forEach((c) => roadBounds.extend(c as [number, number]));
          // Guard against a partial/odd OSRM route (e.g. patchy road coverage
          // near a stop) silently overriding the correct all-stops fit with
          // something tighter -- the road bounds can only ever grow, never
          // shrink, past what the stops themselves already span.
          validStops.forEach((s) => roadBounds.extend([s.lng, s.lat]));
          if (!roadBounds.isEmpty()) {
            // The sheet-expand zoom-out cue offsets from whatever zoom
            // fitBounds lands on -- reset so it's recaptured from THIS
            // fit, not the earlier straight-line one.
            baseZoomRef.current = null;
            map.fitBounds(roadBounds, { padding: fitPadding, maxZoom: 12, duration: 500 });
          }
        });
      }

      validStops.forEach((stop, idx) => {
        bounds.extend([stop.lng, stop.lat]);

        const el = document.createElement('div');
        el.className = 'map-marker-pin';
        el.style.setProperty('--pin-index', String(idx));
        el.style.cssText = `
          --pin-index: ${idx};
          background: ${idx === 0 ? '#0F6F63' : idx === validStops.length - 1 ? '#FF7A00' : '#16181D'};
          color: #FFFFFF;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        `;
        el.textContent = String(idx + 1);

        markersRef.current.push(new Marker({ element: el }).setLngLat([stop.lng, stop.lat]).addTo(map));
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: fitPadding, maxZoom: 12, duration: 0 });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, validStops.length]);

  // Zoom out a touch when the sheet expands, as a lightweight "the map is
  // making room" cue tied to the drag -- not a re-fit, just an offset from
  // whatever fitBounds already landed on.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || baseZoomRef.current === null) return;
    map.easeTo({ zoom: baseZoomRef.current + (sheetExpanded ? SHEET_EXPANDED_ZOOM_DELTA : 0), duration: 450 });
  }, [sheetExpanded]);

  if (validStops.length === 0) return null;

  return (
    // data-no-tab-swipe: maplibre-gl owns horizontal drag here for its own
    // pan gesture — a page-level swipe-between-tabs listener must not
    // compete with the map for the same touch drag.
    <div className="trip-map-hero" data-no-tab-swipe="true">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
