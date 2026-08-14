import { useEffect, useRef } from 'react';
import type { Category, Expense } from '../types';
import { IconMapPin } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  expenses: Expense[];
  categories: Category[];
  baseCurrency: string;
}

export function TripJourneyMap({ expenses, categories, baseCurrency }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currencySymbol = getCurrencySymbol(baseCurrency);

  // Filter valid geotagged expenses
  const geotaggedExpenses = expenses
    .filter((e) => !e.deletedAt && e.location && !e.location.locationUnresolved && !e.location.pendingName && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  useEffect(() => {
    if (!mapContainerRef.current || geotaggedExpenses.length === 0) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    // Clean up existing map instance before re-init
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const first = geotaggedExpenses[0].location!;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([first.lat, first.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const latLngs: L.LatLngExpression[] = [];

    geotaggedExpenses.forEach((exp, idx) => {
      const loc = exp.location!;
      const cat = categoryMap.get(exp.category);
      const emoji = cat?.icon || '📍';
      latLngs.push([loc.lat, loc.lng]);

      const markerHtml = `
        <div style="
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
        ">
          ${emoji}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-map-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12.5px; color: #1E293B; min-width: 150px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #0F172A;">
            ${exp.title}
          </div>
          <div style="color: #00BFA5; font-weight: 700; font-size: 13.5px; margin-bottom: 4px;">
            ${currencySymbol} ${exp.amount.toFixed(2)}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
            📅 ${exp.date} • #${idx + 1} Stop
          </div>
          ${loc.placeName ? `<div style="font-size: 11px; color: #475569; font-weight: 500;">📍 ${loc.placeName}</div>` : ''}
        </div>
      `;

      L.marker([loc.lat, loc.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);
    });

    // Draw route line if multiple stops
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: '#00BFA5',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(map);
    }

    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    mapInstanceRef.current = map;

    return () => {
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
