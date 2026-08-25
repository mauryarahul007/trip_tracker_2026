import { useEffect, useRef } from 'react';
import type { Trip } from '../types';
import { Map as MaplibreMap, Marker, LngLatBounds, GeoJSONSource, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useResolvedTripStops } from '../hooks/useResolvedTripStops';

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

// Luminance threshold (0-1) above which the sampled map region is bright
// enough that white header text needs to flip to dark. Same formula/cutoff
// as useCardTone in TripStack, for consistency.
const HEADER_TONE_THRESHOLD = 0.55;
// How much of the map to zoom out by when the sheet expands, purely as a
// visual "the map is making room" cue -- not a real bounds recompute.
const SHEET_EXPANDED_ZOOM_DELTA = -0.6;

interface Props {
  trip: Trip | null;
  sheetExpanded?: boolean;
  onToneChange?: (tone: 'light' | 'dark') => void;
}

// Samples the map's own rendered pixels across the top ~150 CSS px (the
// header's approximate footprint) and returns their average luminance.
// Requires preserveDrawingBuffer -- MapLibre's WebGL canvas is cleared
// after each frame otherwise, so a readback here would just get zeros.
function sampleHeaderLuminance(map: MaplibreMap): number | null {
  try {
    const canvas = map.getCanvas();
    if (canvas.width === 0 || canvas.height === 0) return null;
    const dpr = window.devicePixelRatio || 1;
    const sampleHeight = Math.min(canvas.height, Math.round(150 * dpr));

    const sampler = document.createElement('canvas');
    sampler.width = 16;
    sampler.height = 8;
    const ctx = sampler.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, canvas.width, sampleHeight, 0, 0, 16, 8);
    const { data } = ctx.getImageData(0, 0, 16, 8);

    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return total / (data.length / 4) / 255;
  } catch {
    // Canvas readback blocked (e.g. a tile source without CORS headers
    // taints the canvas) -- caller keeps the last known/default tone.
    return null;
  }
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
      // Single-stop trips skip fitBounds below (nothing to fit), so seed a
      // sensible city-level zoom here instead of leaving it at a fixed 10
      // regardless of how many stops there turn out to be.
      zoom: validStops.length > 1 ? 10 : 12,
      attributionControl: false,
      // Needed to read pixels back out for the header-tone sampler --
      // WebGL clears the buffer after each frame otherwise.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapInstanceRef.current = map;
    baseZoomRef.current = null;

    const updateTone = () => {
      if (baseZoomRef.current === null) {
        baseZoomRef.current = map.getZoom();
      }
      const luminance = sampleHeaderLuminance(map);
      if (luminance !== null) {
        onToneChange?.(luminance > HEADER_TONE_THRESHOLD ? 'dark' : 'light');
      }
    };
    map.on('idle', updateTone);

    // 'idle' only fires once movement fully settles -- during the sheet's
    // zoom-out easeTo (see below) that left tone stale for the whole ~450ms
    // transition, which is exactly the moment users swipe and look at the
    // header. Sample on 'render' too, throttled, so tone tracks the map
    // continuously instead of jumping once at the end.
    let lastRenderSample = 0;
    const RENDER_SAMPLE_INTERVAL_MS = 200;
    map.on('render', () => {
      const now = performance.now();
      if (now - lastRenderSample < RENDER_SAMPLE_INTERVAL_MS) return;
      lastRenderSample = now;
      updateTone();
    });

    map.on('load', () => {
      const bounds = new LngLatBounds();
      // Fit padding needs real clearance under the floating translucent
      // header, not a flat guess -- otherwise the top of the route/pins
      // renders partially hidden behind it on open.
      const fitPadding = { top: getHeaderHeightPx() + 24, bottom: 48, left: 48, right: 48 };

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
        el.style.cssText = `
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
        // TEMP DEBUG: confirms whether a stop is carrying a bad saved
        // lat/lng (skips geocoding entirely) vs. a route-fit race --
        // remove once the zoomed-in-on-open bug is confirmed fixed.
        console.log('[TripMapHero] fitBounds stops', validStops.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng })));
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
    <div className="trip-map-hero">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
