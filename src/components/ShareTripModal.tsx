import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Trip } from '../types';
import { IconClose, IconCopy, IconCheck } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { buildCanonicalJoinLink } from '../utils/joinDeepLink';
import { useTripStore } from '../store/tripStore';
import { generateTripShareLink, revokeTripShareLink } from '../services/tripApi';

type Props = {
  trip: Trip;
  onClose: () => void;
  onOpenOfflineSnapshot?: () => void;
};

function buildTripShareUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}share/${token}`;
}

export function ShareTripModal({ trip, onClose, onOpenOfflineSnapshot }: Props) {
  const [copied, setCopied] = useState<'link' | 'code' | 'share' | null>(null);
  const [shareState, setShareState] = useState({ enabled: Boolean(trip.shareEnabled), token: trip.shareToken ?? null });
  const [shareBusy, setShareBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const hasJoinCode = Boolean(trip.joinCode && trip.joinCode.trim().length > 0);
  const joinLink = hasJoinCode ? buildCanonicalJoinLink(trip.joinCode) : '';
  const sheetRef = useRef<HTMLDivElement>(null);

  const isContactInviteEnabled = useTripStore((s) => s.isFeatureEnabled('enableContactInvite', { tripId: trip.id }));
  const isTripShareLinkEnabled = useTripStore((s) => s.isFeatureEnabled('enableTripShareLink', { tripId: trip.id }));

  useFocusTrap(sheetRef, true, false, onClose);

  const copy = async (value: string, which: 'link' | 'code' | 'share') => {
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

  const handleGenerateShareLink = async () => {
    setShareBusy(true);
    try {
      const result = await generateTripShareLink(trip.id);
      setShareState({ enabled: true, token: result.shareToken });
      useTripStore.setState((s) => ({
        trips: s.trips.map((t) =>
          t.id === trip.id
            ? { ...t, shareToken: result.shareToken, shareEnabled: true, shareExpiresAt: result.shareExpiresAt }
            : t
        ),
      }));
    } catch {
      // surfaced via the unchanged shareState — button stays actionable to retry
    } finally {
      setShareBusy(false);
    }
  };

  const autoShareStarted = useRef(false);
  useEffect(() => {
    if (!isTripShareLinkEnabled || autoShareStarted.current) return;
    if (shareState.enabled || shareState.token) return;
    autoShareStarted.current = true;
    void handleGenerateShareLink();
  }, [isTripShareLinkEnabled, shareState.enabled, shareState.token]);

  const handleRevokeShareLink = async () => {
    setShareBusy(true);
    try {
      await revokeTripShareLink(trip.id);
      setShareState((s) => ({ ...s, enabled: false }));
      useTripStore.setState((s) => ({
        trips: s.trips.map((t) => (t.id === trip.id ? { ...t, shareEnabled: false } : t)),
      }));
    } finally {
      setShareBusy(false);
    }
  };

  const handleInviteFromContacts = async () => {
    setContactError('');
    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== 'granted' && permission.contacts !== 'limited') {
        setContactError('Contacts permission was denied.');
        return;
      }
      const { contact } = await Contacts.pickContact({ projection: { name: true, phones: true } });
      const contactName = contact.name?.display || 'your contact';
      const shareText = `${contactName}, join our trip "${trip.name}" on Trip Tracker: ${joinLink}`;
      if (navigator.share) {
        await navigator.share({ title: 'Trip invite', text: shareText, url: joinLink });
      } else {
        await copy(shareText, 'share');
      }
    } catch {
      // user cancelled the picker/share sheet — nothing to surface
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
          maxWidth: '420px',
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
          aria-label="Close share dialog"
          className="touch-target-btn"
          style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px' }}
        >
          <IconClose size={18} />
        </button>


        <h3 id="share-trip-title" style={{ fontSize: '17px', marginBottom: '4px' }}>Share & Export "{trip.name}"</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {isTripShareLinkEnabled
            ? 'Send a view-only link — no account needed. Or invite companions to join and log.'
            : 'Invite travelers or save an offline trip archive.'}
        </p>

        {isTripShareLinkEnabled && (
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <span className="form-label">View-only link (no account)</span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
              Anyone with the link sees trip name, dates, and total spend — not individual expenses or balances. Expires in 30 days or when you revoke it.
            </p>
            {!shareState.enabled ? (
              <button type="button" className="gradient-btn" style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }} onClick={handleGenerateShareLink} disabled={shareBusy}>
                {shareBusy ? 'Generating…' : 'Copy view-only link'}
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input id="share-readonly-link" type="text" readOnly className="input-field" value={shareState.token ? buildTripShareUrl(shareState.token) : ''} style={{ flex: 1, fontSize: '13px' }} onFocus={(e) => e.target.select()} />
                  <button type="button" className="gradient-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => shareState.token && copy(buildTripShareUrl(shareState.token), 'share')}>
                    {copied === 'share' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                  </button>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: '100%', padding: '9px', fontSize: '12.5px', marginTop: '8px', color: 'var(--color-danger)', borderColor: 'rgba(184, 69, 46, 0.3)' }}
                  onClick={handleRevokeShareLink}
                  disabled={shareBusy}
                >
                  Revoke Link
                </button>
              </>
            )}
          </div>
        )}

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
            <div className="form-group" style={isTripShareLinkEnabled ? { borderTop: '1px solid var(--border-color)', paddingTop: '14px' } : undefined}>
              <label className="form-label" htmlFor="share-invite-link">{isTripShareLinkEnabled ? 'Invite to join (they can add expenses)' : 'Invite link'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input id="share-invite-link" type="text" readOnly className="input-field" value={joinLink} style={{ flex: 1, fontSize: '13px' }} onFocus={(e) => e.target.select()} />
                <button type="button" className="secondary-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => copy(joinLink, 'link')}>
                  {copied === 'link' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: '16px' }}>
              <span className="form-label">Or share this code</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    fontSize: '18px',
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textAlign: 'center',
                    padding: '8px',
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

            {isContactInviteEnabled && Capacitor.isNativePlatform() && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <button type="button" className="secondary-btn" style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }} onClick={handleInviteFromContacts}>
                  📇 Invite From Contacts
                </button>
                {contactError && <p style={{ fontSize: '11.5px', color: 'var(--color-danger, #ef4444)', marginTop: '4px' }}>{contactError}</p>}
              </div>
            )}
          </>
        )}

        {onOpenOfflineSnapshot && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%', padding: '9px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={() => {
              onClose();
              onOpenOfflineSnapshot();
            }}
          >
            <span>💾</span> Offline Snapshot Backup (.triptracker)
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
