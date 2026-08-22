import { useEffect, useRef, useState } from 'react';
import type { Trip, TripStop } from '../types';
import { Map as MaplibreMap, Marker, Popup, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { searchPlaces } from '../utils/geolocation';

// Use synced static worker path
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ROUTE_SOURCE_ID = 'banner-route';
const ROUTE_LAYER_ID = 'banner-route-line';

interface Props {
  trip: Trip;
}

export function TripBannerRouteMap({ trip }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [resolvedStops, setResolvedStops] = useState<TripStop[]>(trip.stops || []);

  // Auto-resolve stops from trip.stops or parse from trip.destination
  useEffect(() => {
    let stopList: TripStop[] = trip.stops && trip.stops.length > 0 ? [...trip.stops] : [];
    if (stopList.length === 0 && trip.destination) {
      const parts = trip.destination.split(/[→\->,/|]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        stopList = parts.map((name) => ({ id: name, name }));
      }
    }

    if (stopList.length === 0) {
      setResolvedStops([]);
      return;
    }

    const needsGeocode = stopList.some((s) => typeof s.lat !== 'number' || typeof s.lng !== 'number');
    if (!needsGeocode) {
      setResolvedStops(stopList);
      return;
    }

    Promise.all(
      stopList.map(async (s) => {
        if (typeof s.lat === 'number' && typeof s.lng === 'number') return s;
        try {
          const results = await searchPlaces(s.name);
          if (results.length > 0) {
            return { ...s, lat: results[0].lat, lng: results[0].lng };
          }
        } catch {}
        return s;
      })
    ).then((finalStops) => {
      setResolvedStops(finalStops);
    });
  }, [trip.id, trip.destination, trip.stops]);

  // Filter stops that have valid coordinates
  const validStops = resolvedStops.filter(
    (s): s is TripStop & { lat: number; lng: number } =>
      typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)
  );

  useEffect(() => {
    if (!mapContainerRef.current || validStops.length === 0) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    // Initialize MapLibre
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [validStops[0].lng, validStops[0].lat],
      zoom: 10,
      attributionControl: false,
      interactive: true,
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new LngLatBounds();

      // Plot route line if multiple stops
      if (validStops.length > 1) {
        const coordinates = validStops.map((s) => [s.lng, s.lat]);

        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        // Glow backdrop line
        map.addLayer({
          id: `${ROUTE_LAYER_ID}-glow`,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0284C7',
            'line-width': 6,
            'line-opacity': 0.6,
          },
        });

        // Crisp dashed route line
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#FF7A00',
            'line-width': 3.5,
            'line-dasharray': [2, 2],
          },
        });
      }

      // Add numbered waypoint markers
      validStops.forEach((stop, idx) => {
        bounds.extend([stop.lng, stop.lat]);

        const el = document.createElement('div');
        el.className = 'route-banner-marker';
        el.innerHTML = `
          <div style="
            background: ${idx === 0 ? '#0284C7' : idx === validStops.length - 1 ? '#FF7A00' : '#0D5C9E'};
            color: #FFFFFF;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(0,0,0,0.45);
            cursor: pointer;
          ">
            ${idx + 1}
          </div>
        `;

        const popup = new Popup({ offset: 12, closeButton: false }).setHTML(
          `<div style="font-family: var(--font-family-body); font-size: 12px; font-weight: 700; color: #0f172a; padding: 2px 4px;">
            ${idx + 1}. ${stop.name}
          </div>`
        );

        const marker = new Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Fit bounds
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: { top: 25, bottom: 25, left: 25, right: 25 },
          maxZoom: 13,
          duration: 800,
        });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [trip.id, validStops.length]);

  if (validStops.length === 0) return null;

  return (
    <div
      className="trip-header-translucent-map-layer"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'auto',
        overflow: 'hidden',
        opacity: 0.42,
        mixBlendMode: 'luminosity',
        filter: 'saturate(1.2)',
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
