import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Map as MaplibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSharedLocation, type SharedLocation } from '../services/locationShareApi';
import { formatRelativeTime } from '../utils/relativeTime';

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.js`);

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const POLL_MS = 20 * 1000;

// Public, unauthenticated page -- anyone with the link (no login) lands
// here. Reads only through the SECURITY DEFINER get_shared_location RPC
// (migration 0086), which already refuses to return anything once the
// share has expired or been stopped, so there's nothing extra to hide here.
export function LiveLocationPage() {
  const { token } = useParams<{ token: string }>();
  const [location, setLocation] = useState<SharedLocation | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'ended'>('loading');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const poll = () => {
      getSharedLocation(token)
        .then((result) => {
          if (cancelled) return;
          if (result) {
            setLocation(result);
            setStatus('ok');
          } else {
            setStatus('ended');
          }
        })
        .catch(() => {
          if (!cancelled) setStatus('ended');
        });
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (!location || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = new MaplibreMap({
        container: mapContainerRef.current,
        style: MAP_STYLE_URL,
        center: [location.lng, location.lat],
        zoom: 14,
        attributionControl: { compact: true },
      });
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([location.lng, location.lat]);
    } else {
      markerRef.current = new Marker({ color: '#2F6FED' }).setLngLat([location.lng, location.lat]).addTo(mapRef.current);
    }
    mapRef.current.panTo([location.lng, location.lat]);

    return () => {
      // Kept across polls -- only torn down on unmount.
    };
  }, [location]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0F172A' }}>
      <div style={{ padding: '16px 20px', color: '#fff', background: 'rgba(15,23,42,0.9)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.7 }}>Trip Tracker · Live Location</span>
        {status === 'ok' && location && (
          <>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>{location.memberName} · {location.tripName}</span>
            <span style={{ fontSize: '12.5px', opacity: 0.75 }}>Updated {formatRelativeTime(location.updatedAt)}</span>
          </>
        )}
        {status === 'loading' && <span style={{ fontSize: '14px', opacity: 0.8 }}>Loading…</span>}
        {status === 'ended' && <span style={{ fontSize: '14px', opacity: 0.8 }}>This share has ended or expired.</span>}
      </div>

      <div ref={mapContainerRef} style={{ flex: 1, minHeight: '300px' }} />

      {status === 'ended' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(15,23,42,0.85)', color: '#fff', padding: '16px 24px', borderRadius: '16px', textAlign: 'center', maxWidth: '280px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📍</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>This location share has ended</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>Links expire automatically after 12 hours, or when the traveler stops sharing.</div>
          </div>
        </div>
      )}
    </div>
  );
}
