import { useEffect, useRef, useState } from 'react';
import { Map as MaplibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Member } from '../types';
import { useTripStore } from '../store/tripStore';
import { getActiveTripLocationShares, type TripActiveShare } from '../services/locationShareApi';
import { formatRelativeTime } from '../utils/relativeTime';
import { triggerHaptic } from '../utils/haptics';
import { IconMapPin } from './Icons';

setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.js`);

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const POLL_MS = 30 * 1000;

interface Props {
  tripId: string;
  members: Member[];
}

// Surfaces active live-location shares (Settings > Live Location Share)
// directly in chat -- trip participants can see the pin in-app (migration
// 0089's RLS) instead of needing the separate public /live/:token link,
// which stays the mechanism for sharing with people outside the trip.
export function LiveLocationChatBanner({ tripId, members }: Props) {
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const enabled = isFeatureEnabled('enableLiveLocationShare', { tripId });
  const [shares, setShares] = useState<TripActiveShare[]>([]);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const poll = () => {
      getActiveTripLocationShares(tripId)
        .then((result) => {
          if (!cancelled) setShares(result);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, tripId]);

  const expandedShare = shares.find((s) => s.memberId === expandedMemberId) || null;

  useEffect(() => {
    if (!expandedShare || !mapContainerRef.current) {
      mapRef.current?.remove();
      mapRef.current = null;
      return;
    }
    mapRef.current = new MaplibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [expandedShare.lng, expandedShare.lat],
      zoom: 13,
      attributionControl: { compact: true },
    });
    new Marker({ color: '#2F6FED' }).setLngLat([expandedShare.lng, expandedShare.lat]).addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only on which member is expanded, not on every position refresh
  }, [expandedMemberId]);

  if (!enabled || shares.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 12px' }}>
        {shares.map((share) => {
          const name = members.find((m) => m.id === share.memberId)?.name || 'A traveler';
          const isExpanded = expandedMemberId === share.memberId;
          return (
            <button
              key={share.memberId}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setExpandedMemberId(isExpanded ? null : share.memberId);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                padding: '5px 10px',
                borderRadius: 'var(--border-radius-pill, 999px)',
                border: isExpanded ? '1px solid #2F6FED' : '1px solid var(--border-color)',
                background: isExpanded ? 'rgba(47,111,237,0.08)' : 'transparent',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <IconMapPin size={12} className="icon-sm" style={{ color: '#2F6FED' }} />
              {name} · {formatRelativeTime(share.updatedAt)}
            </button>
          );
        })}
      </div>
      {expandedShare && (
        <div ref={mapContainerRef} style={{ height: '180px', borderTop: '1px solid var(--border-color)' }} />
      )}
    </div>
  );
}
