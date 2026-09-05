import { useEffect, useMemo, useRef, useState } from 'react';
import type { Trip } from '../types';
import { IconMapPin, IconClose, IconChevronRight } from './Icons';
import { useResolvedTripStops } from '../hooks/useResolvedTripStops';
import { parseTripRoute } from '../utils/routeHelper';
import { formatDateRange } from '../utils/dateRange';
import { triggerHaptic } from '../utils/haptics';
import { Map as MaplibreMap, Marker, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.js`);

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ROUTE_SOURCE_ID = 'modal-route-source';
const ROUTE_LAYER_ID = 'modal-route-layer';
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving/';

async function fetchRoadRoute(stops: { lng: number; lat: number }[]): Promise<[number, number][] | null> {
  try {
    const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
    const res = await fetch(`${OSRM_ROUTE_URL}${coords}?overview=full&geometries=geojson`);
    if (!res.ok) return null;
    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry;
    if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates as [number, number][];
    }
  } catch {
    // network failure fallback
  }
  return null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  stopsExpanded: boolean;
  onToggleHeaderStops: () => void;
}

export function TripRouteModal({
  isOpen,
  onClose,
  trip,
  stopsExpanded,
  onToggleHeaderStops,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const resolvedStops = useResolvedTripStops(trip);
  const parsedRoute = parseTripRoute(trip);
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize MapLibre
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialCenter: [number, number] =
      resolvedStops.length > 0 ? [resolvedStops[0].lng, resolvedStops[0].lat] : [72.8777, 19.076];

    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: initialCenter,
      zoom: resolvedStops.length > 1 ? 8 : 11,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    map.on('load', () => {
      if (resolvedStops.length === 0) return;

      const bounds = new LngLatBounds();

      // Clear stale markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      resolvedStops.forEach((stop, idx) => {
        bounds.extend([stop.lng, stop.lat]);

        const el = document.createElement('div');
        el.className = 'trip-route-map-marker';
        el.style.cssText = `
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${idx === 0 ? '#10B981' : idx === resolvedStops.length - 1 ? '#F43F5E' : '#3B82F6'};
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        `;
        el.innerText = `${idx + 1}`;
        el.title = stop.name;

        el.addEventListener('click', () => {
          triggerHaptic('light');
          setActiveStopIndex(idx);
          map.flyTo({ center: [stop.lng, stop.lat], zoom: 12, speed: 1.2 });
        });

        const marker = new Marker({ element: el }).setLngLat([stop.lng, stop.lat]).addTo(map);
        markersRef.current.push(marker);
      });

      if (resolvedStops.length > 1) {
        const straightCoordinates: [number, number][] = resolvedStops.map((s) => [s.lng, s.lat]);

        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: straightCoordinates },
          },
        });

        // Route line glow
        map.addLayer({
          id: `${ROUTE_LAYER_ID}-glow`,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#0284C7', 'line-width': 8, 'line-opacity': 0.35, 'line-blur': 3 },
        });

        // Main Route line
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#38BDF8', 'line-width': 4 },
        });

        // Fetch real road route
        fetchRoadRoute(resolvedStops).then((roadCoords) => {
          if (!roadCoords || !mapInstanceRef.current?.getSource(ROUTE_SOURCE_ID)) return;
          const src = mapInstanceRef.current.getSource(ROUTE_SOURCE_ID) as any;
          src.setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: roadCoords },
          });
        });

        map.fitBounds(bounds, { padding: 40, maxZoom: 13, duration: 600 });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, resolvedStops]);

  // Stored stops or fallback from parsed route
  const displayStops: { name: string }[] =
    trip.stops && trip.stops.length > 0
      ? trip.stops
      : parsedRoute.allStops.map((s) => ({ name: s }));

  // Google / Apple Maps Directions URL
  const mapsDirectionsUrl = useMemo(() => {
    if (displayStops.length === 0) return null;
    if (displayStops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayStops[0].name)}`;
    }
    const origin = displayStops[0].name;
    const dest = displayStops[displayStops.length - 1].name;
    const waypoints = displayStops.slice(1, -1).map((s) => s.name);
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
    if (waypoints.length > 0) {
      url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }
    return url;
  }, [displayStops]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop drawer-right"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-route-modal-title"
    >
      <div
        className="modal-sheet trip-route-sheet"
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-surface-hover)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(23, 182, 166, 0.16)',
                color: 'var(--primary-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconMapPin size={20} />
            </div>
            <div>
              <h3
                id="trip-route-modal-title"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                Trip Route & Stops
              </h3>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                {parsedRoute.isMultiStop ? `${displayStops.length} Waypoints Itinerary` : 'Direct Route'}
                {trip.startDate && ` · ${formatDateRange(trip.startDate, trip.endDate || '')}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="secondary-btn touch-target-btn"
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              padding: 0,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
            onClick={onClose}
            aria-label="Close route modal"
          >
            <IconClose size={15} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Interactive Map */}
          <div
            style={{
              position: 'relative',
              height: '210px',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(6px)',
                color: '#FFFFFF',
                fontSize: '10.5px',
                padding: '3px 8px',
                borderRadius: '8px',
                fontWeight: 600,
                pointerEvents: 'none',
              }}
            >
              Tap any pin to zoom
            </div>
          </div>

          {/* Quick Header Toggle Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Header Route Chips Bar
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Show itinerary stop pills at top of trip screen
              </span>
            </div>
            <button
              type="button"
              className={stopsExpanded ? 'primary-btn' : 'secondary-btn'}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '9999px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                triggerHaptic('light');
                onToggleHeaderStops();
              }}
            >
              {stopsExpanded ? 'Showing' : 'Hidden'}
            </button>
          </div>

          {/* Waypoints Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4
              style={{
                margin: '0 0 4px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Waypoints & Stops ({displayStops.length})
            </h4>

            {displayStops.map((stop, idx) => {
              const isStart = idx === 0;
              const isDest = idx === displayStops.length - 1;
              const isSelected = activeStopIndex === idx;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveStopIndex(idx);
                    if (mapInstanceRef.current && resolvedStops[idx]) {
                      mapInstanceRef.current.flyTo({
                        center: [resolvedStops[idx].lng, resolvedStops[idx].lat],
                        zoom: 12,
                        speed: 1.2,
                      });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isSelected ? 'var(--primary-accent-subtle, rgba(23, 182, 166, 0.12))' : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--primary-accent)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isStart ? '#10B981' : isDest ? '#F43F5E' : '#3B82F6',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {stop.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isStart ? 'Starting Point · Origin' : isDest ? 'Final Destination' : 'Intermediate Waypoint'}
                    </div>
                  </div>

                  <IconChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface-hover)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          {mapsDirectionsUrl && (
            <a
              href={mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-btn"
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              title="Open turn-by-turn route navigation in Maps"
            >
              <span>🧭</span>
              <span>Open in Maps</span>
            </a>
          )}
          <button
            type="button"
            className="primary-btn"
            style={{
              flex: mapsDirectionsUrl ? 1 : undefined,
              width: mapsDirectionsUrl ? undefined : '100%',
              padding: '10px',
              fontSize: '14px',
              fontWeight: 600,
            }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
