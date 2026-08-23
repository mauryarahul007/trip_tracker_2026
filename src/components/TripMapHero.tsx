import { useEffect, useRef } from 'react';
import type { Trip } from '../types';
import { Map as MaplibreMap, Marker, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useResolvedTripStops } from '../hooks/useResolvedTripStops';

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ROUTE_SOURCE_ID = 'trip-hero-route';
const ROUTE_LAYER_ID = 'trip-hero-route-line';

interface Props {
  trip: Trip | null;
}

// Continuous full-screen map backdrop for the trip dashboard, pinned and
// fit-to-bounds on the trip's cities. Fixed behind the header and the
// content sheet (see .trip-map-hero / .trip-sheet in index.css) -- one
// persistent instance for the whole dashboard, not per-tab.
export function TripMapHero({ trip }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const validStops = useResolvedTripStops(trip);

  useEffect(() => {
    if (!mapContainerRef.current || validStops.length === 0) return;

    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [validStops[0].lng, validStops[0].lat],
      zoom: 10,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    map.on('load', () => {
      const bounds = new LngLatBounds();

      // Highlight the route when the trip has multiple stops
      if (validStops.length > 1) {
        const coordinates = validStops.map((s) => [s.lng, s.lat]);

        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
        });

        map.addLayer({
          id: `${ROUTE_LAYER_ID}-glow`,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#0284C7', 'line-width': 6, 'line-opacity': 0.6 },
        });

        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FF7A00', 'line-width': 3.5, 'line-dasharray': [2, 2] },
        });
      }

      validStops.forEach((stop, idx) => {
        bounds.extend([stop.lng, stop.lat]);

        const el = document.createElement('div');
        el.style.cssText = `
          background: ${idx === 0 ? '#0284C7' : idx === validStops.length - 1 ? '#FF7A00' : '#0D5C9E'};
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
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
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

  if (validStops.length === 0) return null;

  return (
    <div className="trip-map-hero">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
