import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Map as MaplibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getSharedLocation, type SharedLocation } from '../services/locationShareApi';
import { formatRelativeTime } from '../utils/relativeTime';
import { IconMapPin } from './Icons';

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
      markerRef.current = new Marker({ color: '#0F6F63' }).setLngLat([location.lng, location.lat]).addTo(mapRef.current);
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
    <div className="share-page share-page-live">
      <header className="share-live-bar">
        <div className="share-pass-eyebrow">Trip Tracker · Live location</div>
        {status === 'ok' && location && (
          <>
            <div className="share-live-name">{location.memberName} · {location.tripName}</div>
            <div className="share-live-meta">
              <span className="share-live-dot" aria-hidden="true" />
              Updated {formatRelativeTime(location.updatedAt)}
            </div>
          </>
        )}
        {status === 'loading' && (
          <div role="status" aria-label="Loading location" style={{ display: 'grid', gap: '6px', marginTop: '4px' }}>
            <div className="skeleton" style={{ width: '60%', height: '18px' }} />
            <div className="skeleton" style={{ width: '35%', height: '12px' }} />
          </div>
        )}
        {status === 'ended' && <div className="share-live-meta">This share has ended or expired.</div>}
      </header>

      <div ref={mapContainerRef} className="share-live-map" />

      {status === 'ended' && (
        <div className="share-live-ended">
          <div className="share-pass share-pass-ended">
            <span className="share-pass-ended-icon" aria-hidden="true"><IconMapPin size={22} /></span>
            <h1 className="share-pass-title">This location share has ended</h1>
            <p className="share-pass-sub">Links expire automatically after 12 hours, or when the traveler stops sharing.</p>
          </div>
        </div>
      )}
    </div>
  );
}
