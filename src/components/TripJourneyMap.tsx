import { useEffect, useRef } from 'react';
import type { Category, Expense } from '../types';
import { IconMapPin } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { Map as MaplibreMap, Marker, Popup, NavigationControl, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// MapLibre resolves its worker script via a relative URL next to its own
// module, which only holds up when that module is served as a standalone
// file (as Vite's dev server does). The production build bundles
// everything into one hashed chunk, so that relative path resolves to a
// URL that doesn't exist — Capacitor's local asset server falls back to
// serving index.html for it, and the worker fails parsing HTML as JS
// (silently, with no error surfaced anywhere reachable from the main
// thread). The worker file also imports a sibling "./maplibre-gl-shared.mjs"
// by bare relative path, so it can't just be pulled in individually via
// Vite's `?url` (which copies one file as an opaque hashed blob, breaking
// that relationship) — both files are synced verbatim into public/maplibre/
// (scripts/sync-maplibre-worker.mjs, run on install/build) and referenced
// here by their fixed, unhashed public path instead.
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

interface Props {
  expenses: Expense[];
  categories: Category[];
  baseCurrency: string;
}

// Free, unlimited, no-API-key vector tiles. Unlike hotlinking OSM's raster
// tile server directly (the previous Leaflet setup), this is a CDN built
// for third-party app traffic and doesn't throttle/rate-limit requests,
// plus vector+GPU rendering pans/zooms far faster than raster tiles.
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

    // Clean up existing map instance before re-init
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const first = geotaggedExpenses[0].location!;
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [first.lng, first.lat],
      zoom: 13,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    // The Analytics tab is `display:none` until switched to, so on a
    // first-ever visit the container can still measure 0×0 (or a stale
    // size) at the exact instant MapLibre reads it to size its WebGL
    // canvas — tiles then get requested for a degenerate viewport and the
    // map renders blank until something (like a big pinch-zoom) forces a
    // fresh layout pass. Watching the container and calling resize()
    // whenever its size actually changes is the standard fix.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapContainerRef.current);

    const lngLats: [number, number][] = [];

    const buildMarkers = () => {
      geotaggedExpenses.forEach((exp, idx) => {
        const loc = exp.location!;
        const cat = categoryMap.get(exp.category);
        const emoji = cat?.icon || '📍';
        lngLats.push([loc.lng, loc.lat]);

        const el = document.createElement('div');
        el.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1C2A38;
          border: 2.5px solid #00BFA5;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          color: #fff;
          font-size: 15px;
          cursor: pointer;
        `;
        el.textContent = emoji;

        const safeTitle = escapeHtml(exp.title);
        const safePlaceName = loc.placeName ? escapeHtml(loc.placeName) : '';
        const safeCurrency = escapeHtml(currencySymbol);
        const safeDate = escapeHtml(exp.date);

        const popupContent = `
          <div style="font-family: inherit; font-size: 12.5px; color: #1E293B; min-width: 150px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #0F172A;">
              ${safeTitle}
            </div>
            <div style="color: #00BFA5; font-weight: 700; font-size: 13.5px; margin-bottom: 4px;">
              ${safeCurrency} ${exp.amount.toFixed(2)}
            </div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
              📅 ${safeDate} • #${idx + 1} Stop
            </div>
            ${safePlaceName ? `<div style="font-size: 11px; color: #475569; font-weight: 500;">📍 ${safePlaceName}</div>` : ''}
          </div>
        `;

        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new Popup({ offset: 18 }).setHTML(popupContent))
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Draw route line if multiple stops
      if (lngLats.length > 1) {
        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: lngLats } },
        });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00BFA5',
            'line-width': 3.5,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1.5],
          },
        });
      }

      if (lngLats.length > 0) {
        const bounds = lngLats.reduce(
          (b, coord) => b.extend(coord),
          new LngLatBounds(lngLats[0], lngLats[0])
        );
        map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
      }
    };

    map.on('load', buildMarkers);

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
          borderRadius: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(0,191,165,0.1)',
            color: '#00BFA5',
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
        padding: '0',
        borderRadius: '16px',
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
          <span style={{ color: '#00BFA5', display: 'flex', alignItems: 'center' }}>
            <IconMapPin size={18} />
          </span>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            Trip Journey Map
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span className="badge" style={{ background: 'rgba(0,191,165,0.12)', color: '#00BFA5', fontWeight: 600 }}>
            {geotaggedExpenses.length} stops
          </span>
          <span>• {currencySymbol} {totalGeotaggedSpend.toFixed(0)}</span>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '280px',
          background: '#E2E8F0',
          zIndex: 1,
        }}
      />
    </div>
  );
}
