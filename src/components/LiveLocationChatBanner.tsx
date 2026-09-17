import { useEffect, useRef, useState } from 'react';
import type { Member } from '../types';
import { useTripStore } from '../store/tripStore';
import { getActiveTripLocationShares, type TripActiveShare } from '../services/locationShareApi';
import { formatRelativeTime } from '../utils/relativeTime';
import { triggerHaptic } from '../utils/haptics';
import { IconMapPin } from './Icons';

// maplibre is loaded only when a share map is expanded — a top-level import
// pulled maplibre into Notes via TripChatPanel and crashed the Notes hub.

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const POLL_MS = 30 * 1000;

interface Props {
  tripId: string;
  members: Member[];
  /** Opens the existing Live Location Share modal (Settings flow). */
  onShareMyLocation?: () => void;
}

export function LiveLocationChatBanner({ tripId, members, onShareMyLocation }: Props) {
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const enabled = isFeatureEnabled('enableLiveLocationShare', { tripId });
  const [shares, setShares] = useState<TripActiveShare[]>([]);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);

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

    let cancelled = false;
    const container = mapContainerRef.current;
    const { lng, lat } = expandedShare;

    void (async () => {
      try {
        const maplibre = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        try {
          maplibre.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.js`);
        } catch {
          /* worker optional */
        }
        if (cancelled || !container) return;
        mapRef.current?.remove();
        const map = new maplibre.Map({
          container,
          style: MAP_STYLE_URL,
          center: [lng, lat],
          zoom: 13,
          attributionControl: { compact: true },
        });
        new maplibre.Marker({ color: '#2F6FED' }).setLngLat([lng, lat]).addTo(map);
        mapRef.current = map;
      } catch (err) {
        console.warn('[LiveLocationChatBanner] map init failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only on which member is expanded
  }, [expandedMemberId]);

  if (!enabled) return null;
  if (shares.length === 0 && !onShareMyLocation) return null;

  const handleShareMine = () => {
    if (!onShareMyLocation) return;
    triggerHaptic('light');
    onShareMyLocation();
  };

  if (shares.length === 0) {
    return (
      <div style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
        <button
          type="button"
          className="live-location-chat-cta"
          onClick={handleShareMine}
          aria-label="Share my live location"
        >
          <span className="live-location-chat-cta-label">
            <IconMapPin size={14} className="icon-sm" style={{ color: '#2F6FED' }} />
            Let the squad see where you are
          </span>
          <span className="live-location-chat-cta-action">Share my location</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 12px', alignItems: 'center' }}>
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
        {onShareMyLocation && (
          <button
            type="button"
            className="live-location-share-mine-btn"
            onClick={handleShareMine}
            aria-label="Share my live location"
          >
            <IconMapPin size={12} className="icon-sm" />
            Share mine
          </button>
        )}
      </div>
      {expandedShare && (
        <div ref={mapContainerRef} style={{ height: '180px', borderTop: '1px solid var(--border-color)' }} />
      )}
    </div>
  );
}
