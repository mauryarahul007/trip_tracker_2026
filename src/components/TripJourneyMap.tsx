import { useEffect, useRef } from 'react';
import type { Category, Expense } from '../types';
import { IconMapPin } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { Map as MaplibreMap, Marker, Popup, NavigationControl, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.js`);

interface Props {
  expenses: Expense[];
  categories: Category[];
  baseCurrency: string;
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ROUTE_SOURCE_ID = 'trip-route';
const ROUTE_LAYER_ID = 'trip-route-line';

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

export function TripJourneyMap({ expenses, categories, baseCurrency }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupsRef = useRef<Popup[]>([]);

  const currencySymbol = getCurrencySymbol(baseCurrency);

  // Filter valid geotagged expenses
  const geotaggedExpenses = expenses
    .filter((e) => !e.deletedAt && e.location && !e.location.locationUnresolved && !e.location.pendingName && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  useEffect(() => {
    if (!mapContainerRef.current || geotaggedExpenses.length === 0) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    popupsRef.current = [];
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const firstLoc = geotaggedExpenses[0].location!;
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [firstLoc.lng, firstLoc.lat],
      zoom: 12.5,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (mapContainerRef.current) {
          map.resize();
        }
      });
    });
    resizeObserver.observe(mapContainerRef.current);

    const waypoints: [number, number][] = [];

    const buildMarkers = () => {
      geotaggedExpenses.forEach((exp, idx) => {
        const loc = exp.location!;
        const cat = categoryMap.get(exp.category);
        const emoji = cat?.icon || '📍';
        waypoints.push([loc.lng, loc.lat]);

        const el = document.createElement('div');
        el.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2F6FED;
          border: 2px solid #17B6A6;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          color: #fff;
          font-size: 15px;
          cursor: pointer;
          transition: transform 0.15s ease-out;
        `;
        el.textContent = emoji;

        const safeTitle = escapeHtml(exp.title);
        const safePlaceName = loc.placeName ? escapeHtml(loc.placeName) : '';
        const safeCurrency = escapeHtml(currencySymbol);
        const safeDate = escapeHtml(exp.date);

        const popupContent = `
          <div style="font-family: inherit; font-size: 12.5px; color: #1E293B; min-width: 150px;">
            <div style="font-weight: 700; color: #0F172A; margin-bottom: 2px;">#${idx + 1} ${safeTitle}</div>
            ${safePlaceName ? `<div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">📍 ${safePlaceName}</div>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 4px; margin-top: 4px;">
              <span style="font-weight: 600; color: #2F6FED;">${safeCurrency} ${exp.amount.toFixed(2)}</span>
              <span style="font-size: 10px; color: #94A3B8;">${safeDate}</span>
            </div>
          </div>
        `;

        const popup = new Popup({ offset: 16, closeButton: false }).setHTML(popupContent);
        popupsRef.current.push(popup);

        const marker = new Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      if (waypoints.length > 1) {
        const bounds = waypoints.reduce((b, coord) => b.extend(coord), new LngLatBounds(waypoints[0], waypoints[0]));
        map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 600 });
      }
    };

    map.on('load', () => {
      buildMarkers();

      if (waypoints.length > 1) {
        const coordsQuery = waypoints.map((c) => `${c[0]},${c[1]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;

        fetch(osrmUrl)
          .then((res) => res.json())
          .then((data) => {
            if (data.routes && data.routes.length > 0 && map.getStyle()) {
              const geometry = data.routes[0].geometry;
              if (map.getSource(ROUTE_SOURCE_ID)) {
                (map.getSource(ROUTE_SOURCE_ID) as any).setData({
                  type: 'Feature',
                  properties: {},
                  geometry,
                });
              } else {
                map.addSource(ROUTE_SOURCE_ID, {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry,
                  },
                });

                map.addLayer({
                  id: ROUTE_LAYER_ID,
                  type: 'line',
                  source: ROUTE_SOURCE_ID,
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                  },
                  paint: {
                    'line-color': '#17B6A6',
                    'line-width': 4,
                    'line-opacity': 0.85,
                  },
                });
              }
            }
          })
          .catch(() => {
            if (!map.getSource(ROUTE_SOURCE_ID) && map.getStyle()) {
              map.addSource(ROUTE_SOURCE_ID, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: waypoints,
                  },
                },
              });

              map.addLayer({
                id: ROUTE_LAYER_ID,
                type: 'line',
                source: ROUTE_SOURCE_ID,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#17B6A6',
                  'line-width': 3,
                  'line-dasharray': [2, 2],
                  'line-opacity': 0.7,
                },
              });
            }
          });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geotaggedExpenses.length, baseCurrency]);

  if (geotaggedExpenses.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '24px 16px',
          textAlign: 'center',
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--border-radius-lg)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(23,182,166,0.1)',
            color: '#17B6A6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <IconMapPin size={24} />
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--text-primary)' }}>
          No Geotagged Expenses Yet
        </h4>
        <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '320px', marginInline: 'auto' }}>
          Enable <strong>"Geotag Expenses"</strong> in Settings to map your trip's travel path and location pins automatically!
        </p>
      </div>
    );
  }

  const totalGeotaggedSpend = geotaggedExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        padding: '0',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        marginBottom: '20px',
        background: 'var(--bg-surface)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#17B6A6', display: 'flex', alignItems: 'center' }}>
            <IconMapPin size={18} />
          </span>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            Trip Journey Map
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span className="badge" style={{ background: 'rgba(23,182,166,0.12)', color: '#17B6A6', fontWeight: 600 }}>
            {geotaggedExpenses.length} stops
          </span>
          <span className="privacy-blur">• {currencySymbol} {totalGeotaggedSpend.toFixed(0)}</span>
        </div>
      </div>

      {/* Map viewport */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '290px',
          background: '#E2E8F0',
          zIndex: 1,
        }}
      />
    </div>
  );
}
