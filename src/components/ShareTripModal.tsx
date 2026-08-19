import { useEffect, useRef, useState } from 'react';
import type { Trip } from '../types';
import { IconClose, IconCopy, IconCheck } from './Icons';

type Props = {
  trip: Trip;
  onClose: () => void;
};

function buildJoinLink(joinCode: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${window.location.origin}${base}join/${joinCode}`;
}

export function ShareTripModal({ trip, onClose }: Props) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const hasJoinCode = Boolean(trip.joinCode && trip.joinCode.trim().length > 0);
  const joinLink = hasJoinCode ? buildJoinLink(trip.joinCode) : '';
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  const copy = async (value: string, which: 'link' | 'code') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the value is
      // still visible and selectable on screen, so this is a soft failure.
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-trip-title"
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '400px',
          background: 'var(--bg-surface)',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid var(--border-color)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <IconClose size={18} />
        </button>

        <h3 id="share-trip-title" style={{ fontSize: '17px', marginBottom: '4px' }}>Invite to "{trip.name}"</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Anyone with this link can sign in and claim their spot as a trip member.
        </p>

        {!hasJoinCode ? (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--bg-subtle, rgba(15,23,42,0.04))',
              border: '1px dashed var(--border-color)',
              textAlign: 'center',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Invite code pending sync</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
              This trip was created while offline. A shareable invite link and join code will be generated automatically once synced online.
            </p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Invite link</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" readOnly className="input-field" value={joinLink} style={{ flex: 1, fontSize: '13px' }} onFocus={(e) => e.target.select()} />
                <button type="button" className="secondary-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => copy(joinLink, 'link')}>
                  {copied === 'link' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
              <label className="form-label">Or share this code</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'var(--bg-subtle, rgba(15,23,42,0.04))',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {trip.joinCode}
                </div>
                <button type="button" className="secondary-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => copy(trip.joinCode, 'code')}>
                  {copied === 'code' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
