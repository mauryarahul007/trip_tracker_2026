import { useEffect, useRef, useState, useCallback } from 'react';
import type { Category, Expense } from '../types';
import { IconMapPin } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
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
const TRAIL_SOURCE_ID = 'trip-route-trail';
const TRAIL_LAYER_ID = 'trip-route-trail-line';

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

export function calculateBearing(start: [number, number], end: [number, number]): number {
  const startLng = (start[0] * Math.PI) / 180;
  const startLat = (start[1] * Math.PI) / 180;
  const endLng = (end[0] * Math.PI) / 180;
  const endLat = (end[1] * Math.PI) / 180;
  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function interpolatePath(points: [number, number][], stepsPerSegment = 8): [number, number][] {
  if (points.length < 2) return points;
  const interpolated: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    interpolated.push(p1);
    for (let s = 1; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const lng = p1[0] + (p2[0] - p1[0]) * t;
      const lat = p1[1] + (p2[1] - p1[1]) * t;
      interpolated.push([lng, lat]);
    }
  }
  interpolated.push(points[points.length - 1]);
  return interpolated;
}

export function TripJourneyMap({ expenses, categories, baseCurrency }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupsRef = useRef<Popup[]>([]);
  const vehicleMarkerRef = useRef<Marker | null>(null);
  const vehicleElementRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const fullPathRef = useRef<[number, number][]>([]);
  const stopIndexMapRef = useRef<number[]>([]); // maps stop index -> path point index

  const currencySymbol = getCurrencySymbol(baseCurrency);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 3>(1);
  const [vehicleType, setVehicleType] = useState<'car' | 'plane'>('car');
  const [activeStopIdx, setActiveStopIdx] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [milestoneCard, setMilestoneCard] = useState<Expense | null>(null);

  // Filter valid geotagged expenses
  const geotaggedExpenses = expenses
    .filter((e) => !e.deletedAt && e.location && !e.location.locationUnresolved && !e.location.pendingName && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Initialize Map and Load Waypoints
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
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const firstLoc = geotaggedExpenses[0].location!;
    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [firstLoc.lng, firstLoc.lat],
      zoom: 13,
      pitch: 35, // 3D driving perspective
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
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #2F6FED;
          border: 2.5px solid #17B6A6;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          color: #fff;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
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

        const popup = new Popup({ offset: 18, closeButton: false }).setHTML(popupContent);
        popupsRef.current.push(popup);

        const marker = new Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Fit bounds nicely
      if (waypoints.length > 1) {
        const bounds = waypoints.reduce((b, coord) => b.extend(coord), new LngLatBounds(waypoints[0], waypoints[0]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 600 });
      }
    };

    map.on('load', () => {
      buildMarkers();

      // Create vehicle marker element
      const vEl = document.createElement('div');
      vEl.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: radial-gradient(circle, #3FCBBD 0%, #0D9488 100%);
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 0 16px rgba(63, 203, 189, 0.8), 0 8px 24px rgba(0,0,0,0.4);
        font-size: 22px;
        cursor: grab;
        transform-origin: center center;
        transition: transform 0.05s linear;
        z-index: 50;
      `;
      vEl.textContent = vehicleType === 'plane' ? '✈️' : '🚗';
      vehicleElementRef.current = vEl;

      const vMarker = new Marker({ element: vEl })
        .setLngLat(waypoints[0])
        .addTo(map);
      vehicleMarkerRef.current = vMarker;

      if (waypoints.length > 1) {
        const coordsQuery = waypoints.map((c) => `${c[0]},${c[1]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;

        const setupRouteSources = (rawCoords: [number, number][]) => {
          const finePath = interpolatePath(rawCoords, 6);
          fullPathRef.current = finePath;

          // Map each stop index to the closest path point
          stopIndexMapRef.current = waypoints.map((wp) => {
            let closestIdx = 0;
            let minDist = Infinity;
            finePath.forEach((pt, pIdx) => {
              const d = Math.hypot(pt[0] - wp[0], pt[1] - wp[1]);
              if (d < minDist) {
                minDist = d;
                closestIdx = pIdx;
              }
            });
            return closestIdx;
          });

          if (!map.getSource(ROUTE_SOURCE_ID)) {
            // Background Route Line
            map.addSource(ROUTE_SOURCE_ID, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: finePath },
              },
            });

            map.addLayer({
              id: ROUTE_LAYER_ID,
              type: 'line',
              source: ROUTE_SOURCE_ID,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#17B6A6',
                'line-width': 4,
                'line-opacity': 0.35,
                'line-dasharray': [2, 2],
              },
            });

            // Glowing Dynamic Active Trail
            map.addSource(TRAIL_SOURCE_ID, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [finePath[0]] },
              },
            });

            map.addLayer({
              id: TRAIL_LAYER_ID,
              type: 'line',
              source: TRAIL_SOURCE_ID,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#3FCBBD',
                'line-width': 6,
                'line-opacity': 0.95,
              },
            });
          }
        };

        fetch(osrmUrl)
          .then((res) => res.json())
          .then((data) => {
            if (data.routes && data.routes.length > 0 && map.getStyle()) {
              setupRouteSources(data.routes[0].geometry.coordinates);
            } else {
              setupRouteSources(waypoints);
            }
          })
          .catch(() => {
            if (map.getStyle()) setupRouteSources(waypoints);
          });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geotaggedExpenses.length, baseCurrency, vehicleType]);

  // Handle Play / Pause 60fps Route Simulator Loop
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    const map = mapInstanceRef.current;
    const path = fullPathRef.current;
    if (!map || path.length < 2) return;

    setIsPlaying(true);
    triggerHaptic('medium');

    let currentPointIdx = 0;
    const totalPoints = path.length;
    const stopIndices = stopIndexMapRef.current;
    let nextStopCheckIdx = 0;

    const animateStep = () => {
      if (currentPointIdx >= totalPoints - 1) {
        // Reached destination!
        setCurrentProgress(100);
        setActiveStopIdx(geotaggedExpenses.length - 1);
        setMilestoneCard(geotaggedExpenses[geotaggedExpenses.length - 1]);
        triggerHaptic('heavy');
        stopPlayback();
        return;
      }

      // Increment point based on playback speed (1x, 2x, 3x)
      const stepInc = playbackSpeed === 1 ? 1 : playbackSpeed === 2 ? 2 : 3;
      currentPointIdx = Math.min(currentPointIdx + stepInc, totalPoints - 1);

      const currentCoord = path[currentPointIdx];
      const nextCoord = path[Math.min(currentPointIdx + 1, totalPoints - 1)];

      // Calculate bearing / direction angle
      const bearing = calculateBearing(currentCoord, nextCoord);

      // Update vehicle marker position and rotation
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLngLat(currentCoord);
      }
      if (vehicleElementRef.current) {
        vehicleElementRef.current.style.transform = `rotate(${bearing}deg)`;
      }

      // Update dynamic trail GeoJSON line
      if (map.getSource(TRAIL_SOURCE_ID)) {
        const coveredPath = path.slice(0, currentPointIdx + 1);
        (map.getSource(TRAIL_SOURCE_ID) as any).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coveredPath },
        });
      }

      // Smooth camera chase
      map.easeTo({
        center: currentCoord,
        zoom: 14.5,
        bearing: bearing * 0.4, // subtle smooth camera follow
        pitch: 38,
        duration: 35,
      });

      // Update progress percentage
      const progress = Math.round((currentPointIdx / (totalPoints - 1)) * 100);
      setCurrentProgress(progress);

      // Check if vehicle arrived at a milestone stop
      if (nextStopCheckIdx < stopIndices.length && currentPointIdx >= stopIndices[nextStopCheckIdx]) {
        const stopIdx = nextStopCheckIdx;
        setActiveStopIdx(stopIdx);
        const exp = geotaggedExpenses[stopIdx];
        setMilestoneCard(exp);
        triggerHaptic('light');

        // Toggle popup for marker
        popupsRef.current.forEach((_p, idx) => {
          if (idx === stopIdx) markersRef.current[idx]?.togglePopup();
        });

        nextStopCheckIdx++;

        // Brief stop pause (1.2s / speed) before continuing next leg
        const pauseDuration = 1200 / playbackSpeed;
        pauseTimerRef.current = window.setTimeout(() => {
          animFrameIdRef.current = requestAnimationFrame(animateStep);
        }, pauseDuration);
        return;
      }

      animFrameIdRef.current = requestAnimationFrame(animateStep);
    };

    animFrameIdRef.current = requestAnimationFrame(animateStep);
  }, [playbackSpeed, geotaggedExpenses, stopPlayback]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

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
      {/* Header bar with controls */}
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
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
              Animated Route Playback
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {geotaggedExpenses.length} scenic stops • {currencySymbol} {totalGeotaggedSpend.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Vehicle Toggle Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card-soft, rgba(0,0,0,0.06))', padding: '3px 6px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setVehicleType('car');
            }}
            style={{
              background: vehicleType === 'car' ? 'var(--primary-accent)' : 'transparent',
              color: vehicleType === 'car' ? '#FFFFFF' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '8px',
              padding: '3px 7px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            🚗 Drive
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setVehicleType('plane');
            }}
            style={{
              background: vehicleType === 'plane' ? 'var(--primary-accent)' : 'transparent',
              color: vehicleType === 'plane' ? '#FFFFFF' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '8px',
              padding: '3px 7px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✈️ Fly
          </button>
        </div>
      </div>

      {/* Map viewport */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '320px',
          background: '#E2E8F0',
          zIndex: 1,
        }}
      />

      {/* Floating Milestone HUD Overlay */}
      {milestoneCard && (
        <div
          style={{
            position: 'absolute',
            top: '58px',
            left: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(63, 203, 189, 0.4)',
            borderRadius: '14px',
            padding: '8px 12px',
            zIndex: 15,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'fadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>
              {categoryMap.get(milestoneCard.category)?.icon || '📍'}
            </span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                Stop {activeStopIdx + 1}/{geotaggedExpenses.length}: {milestoneCard.title}
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.7)' }}>
                {milestoneCard.location?.placeName || milestoneCard.date}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#3FCBBD' }}>
              {currencySymbol} {milestoneCard.amount.toFixed(0)}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
              {currentProgress}% covered
            </div>
          </div>
        </div>
      )}

      {/* Floating Interactive Route Playback Dock */}
      {geotaggedExpenses.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '16px',
            padding: '8px 12px',
            zIndex: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          {/* Progress Bar Track */}
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${currentProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #17B6A6, #3FCBBD)',
                borderRadius: '2px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <button
              type="button"
              onClick={handleTogglePlay}
              style={{
                background: isPlaying ? '#FF7A00' : '#17B6A6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(23, 182, 166, 0.4)',
              }}
            >
              <span>{isPlaying ? '⏸ Pause' : '🎬 Relive Journey'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--font-family-mono)' }}>
                {vehicleType === 'plane' ? '✈️ Flying' : '🚗 Driving'} • {currentProgress}%
              </span>

              {/* Speed Switcher */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 3 : 1);
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
