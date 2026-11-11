import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Trip } from '../types';
import { IconClose, IconCopy, IconCheck, IconDatabase } from './Icons';
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

  const handleGenerateShareLink = async (opts?: { copyOnSuccess?: boolean }) => {
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
      if (opts?.copyOnSuccess) {
        await copy(buildTripShareUrl(result.shareToken), 'share');
      }
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


        <h3 id="share-trip-title" style={{ fontSize: '17px', marginBottom: '4px' }}>Invite to "{trip.name}"</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {isTripShareLinkEnabled
            ? 'Copy a view-only link (no account) or a join code for people who will log expenses.'
            : 'Share a join code or link so companions can log expenses.'}
        </p>

        {isTripShareLinkEnabled && (
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <span className="form-label">View-only link</span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
              Name, dates, and total spend only. Expires in 30 days.
            </p>
            {!shareState.enabled ? (
              <button type="button" className="gradient-btn" style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }} onClick={() => void handleGenerateShareLink({ copyOnSuccess: true })} disabled={shareBusy}>
                {shareBusy ? 'Generating…' : copied === 'share' ? 'Copied!' : 'Copy view-only link'}
              </button>
            ) : (
              <>
                <div className="u-flex-gap-8">
                  <input id="share-readonly-link" type="text" readOnly className="input-field" value={shareState.token ? buildTripShareUrl(shareState.token) : ''} style={{ flex: 1, fontSize: '13px' }} onFocus={(e) => e.target.select()} />
                  <button type="button" className="gradient-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => shareState.token && copy(buildTripShareUrl(shareState.token), 'share')} aria-label={copied === 'share' ? 'Copied' : 'Copy view-only link'}>
                    {copied === 'share' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                  </button>
                </div>
                {copied === 'share' && (
                  <p style={{ fontSize: '11.5px', color: 'var(--color-success, #2c7a4b)', margin: '6px 0 0', fontWeight: 600 }}>Copied — ready to paste</p>
                )}
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
              <span className="form-label">Join code</span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
                Companions enter this to join and add expenses.
              </p>
              <div className="u-flex-gap-8">
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
                <button type="button" className="gradient-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => copy(trip.joinCode, 'code')} aria-label={copied === 'code' ? 'Copied' : 'Copy join code'}>
                  {copied === 'code' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                </button>
              </div>
              {copied === 'code' && (
                <p style={{ fontSize: '11.5px', color: 'var(--color-success, #2c7a4b)', margin: '6px 0 0', fontWeight: 600 }}>Copied — ready to paste</p>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '12px', marginBottom: '16px' }}>
              <label className="form-label" htmlFor="share-invite-link">Invite link</label>
              <div className="u-flex-gap-8">
                <input id="share-invite-link" type="text" readOnly className="input-field" value={joinLink} style={{ flex: 1, fontSize: '13px' }} onFocus={(e) => e.target.select()} />
                <button type="button" className="secondary-btn" style={{ padding: '0 14px', flexShrink: 0 }} onClick={() => copy(joinLink, 'link')} aria-label={copied === 'link' ? 'Copied' : 'Copy invite link'}>
                  {copied === 'link' ? <IconCheck size={16} className="icon-sm" /> : <IconCopy size={16} className="icon-sm" />}
                </button>
              </div>
              {copied === 'link' && (
                <p style={{ fontSize: '11.5px', color: 'var(--color-success, #2c7a4b)', margin: '6px 0 0', fontWeight: 600 }}>Copied — ready to paste</p>
              )}
            </div>

            {isContactInviteEnabled && Capacitor.isNativePlatform() && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <button type="button" className="secondary-btn" style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }} onClick={handleInviteFromContacts}>
                  Invite from contacts
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
            <IconDatabase size={15} /> Offline Snapshot Backup (.triptracker)
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
