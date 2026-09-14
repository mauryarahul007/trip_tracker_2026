import { useState, useEffect, useRef } from 'react';
import { getCurrentGPSPosition } from '../utils/geolocation';
import { startLocationShare, updateLocationShare, stopLocationShare, getMyLocationShare } from '../services/locationShareApi';
import { formatRelativeTime } from '../utils/relativeTime';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  memberId: string;
  userId: string;
}

const HEARTBEAT_MS = 60 * 1000;

function buildShareUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}live/${token}`;
}

export function LiveLocationShareModal({ isOpen, onClose, tripId, memberId, userId }: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    getMyLocationShare(tripId)
      .then((share) => {
        if (!share) return;
        setIsSharing(share.isSharing);
        setShareToken(share.shareToken);
        setExpiresAt(share.expiresAt);
      })
      .catch(() => {});
  }, [isOpen, tripId]);

  // Heartbeat only runs while this modal stays mounted -- there's no
  // background service, so closing the sheet stops position updates even
  // though is_sharing stays true server-side until the 12h expiry or the
  // user stops it explicitly. Copy below is upfront about this.
  useEffect(() => {
    if (!isSharing) return;
    heartbeatRef.current = setInterval(() => {
      getCurrentGPSPosition().then((pos) => {
        if (pos) void updateLocationShare(tripId, pos.lat, pos.lng).catch(() => {});
      });
    }, HEARTBEAT_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isSharing, tripId]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setIsBusy(true);
    setError('');
    try {
      const pos = await getCurrentGPSPosition();
      if (!pos) {
        setError("Couldn't get your location. Check location permissions and try again.");
        return;
      }
      const share = await startLocationShare(tripId, memberId, userId, pos.lat, pos.lng);
      setIsSharing(true);
      setShareToken(share.shareToken);
      setExpiresAt(share.expiresAt);
      triggerHaptic('success');
    } catch {
      setError('Failed to start sharing. Try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    setIsBusy(true);
    try {
      await stopLocationShare(tripId);
      setIsSharing(false);
      triggerHaptic('medium');
    } catch {
      setError('Failed to stop sharing. Try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!shareToken) return;
    await navigator.clipboard.writeText(buildShareUrl(shareToken));
    triggerHaptic('light');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!shareToken) return;
    const url = buildShareUrl(shareToken);
    triggerHaptic('light');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My live location', url });
      } catch {
        // cancelled
      }
    } else {
      void handleCopy();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '100%', padding: '0', overflow: 'hidden', borderRadius: '24px' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Live Location Share</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Public link -- no login needed to view</span>
            </div>
          </div>
          <button type="button" className="secondary-btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onClose}>Close</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {error && (
            <div style={{ fontSize: '12px', color: 'var(--color-danger, #ef4444)', padding: '8px 10px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          {!isSharing ? (
            <>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                Share a link showing your current position for the next 12 hours. Anyone with the link can see it -- no account required. Keep this screen open while sharing to keep your position updating.
              </p>
              <button type="button" className="gradient-btn" style={{ padding: '10px', fontSize: '13px' }} onClick={handleStart} disabled={isBusy}>
                {isBusy ? 'Starting…' : '📍 Start Sharing My Location'}
              </button>
            </>
          ) : (
            <>
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(23,182,166,0.08)', border: '1px solid rgba(23,182,166,0.25)', fontSize: '12.5px' }}>
                Sharing your location{expiresAt ? ` -- expires ${formatRelativeTime(expiresAt)}` : ''}.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="secondary-btn" style={{ flex: 1, padding: '9px', fontSize: '12.5px' }} onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
                <button type="button" className="secondary-btn" style={{ flex: 1, padding: '9px', fontSize: '12.5px' }} onClick={handleShare}>
                  Share…
                </button>
              </div>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '9px', fontSize: '12.5px', color: 'var(--color-danger)', borderColor: 'rgba(184, 69, 46, 0.3)' }}
                onClick={handleStop}
                disabled={isBusy}
              >
                Stop Sharing
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
