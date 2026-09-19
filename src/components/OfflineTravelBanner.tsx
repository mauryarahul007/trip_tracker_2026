import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTripStore } from '../store/tripStore';
import { triggerHaptic } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useHistoryBack } from '../utils/useHistoryBack';
import { IconClose, IconRefresh, IconCheck } from './Icons';
import { describeSyncItem } from '../utils/syncQueueLabel';

/**
 * "In-Flight / Remote" Offline State Banner
 * Floating travel pill displayed whenever the browser/device is offline,
 * showing live count of locally staged changes and an inspectable queue drawer.
 */
export const OfflineTravelBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showDrawer, setShowDrawer] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setShowDrawer(false), []);
  useHistoryBack(showDrawer, closeDrawer);
  useFocusTrap(drawerRef, showDrawer, false, closeDrawer);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncQueue = useTripStore((s) => s.syncQueue);
  const processQueue = useTripStore((s) => s.processQueue);
  const inspectorOn = useTripStore((s) => s.isFeatureEnabled('enableSyncQueueInspector'));
  const retrySyncItem = useTripStore((s) => s.retrySyncItem);
  const discardSyncItem = useTripStore((s) => s.discardSyncItem);
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  // The banner unmounts its whole UI once online with nothing queued; reset
  // the flag too so the drawer's history entry doesn't linger and it doesn't
  // pop back open the next time something is queued.
  const bannerHidden = isOnline && syncQueue.length === 0;
  useEffect(() => {
    if (bannerHidden) setShowDrawer(false);
  }, [bannerHidden]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If online and no queued items, don't show the banner
  if (isOnline && syncQueue.length === 0) {
    return null;
  }

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      triggerHaptic();
      return;
    }
    setIsSyncing(true);
    triggerHaptic();
    try {
      await processQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      {/* Floating In-Flight Status Pill */}
      <aside
        aria-label="Offline sync status"
        className="offline-travel-banner fade-in"
        style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          maxWidth: '92%',
          width: 'max-content',
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            setShowDrawer(true);
          }}
          className="compositor-blur"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            background: !isOnline ? 'rgba(22, 24, 29, 0.92)' : 'rgba(15, 111, 99, 0.94)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#FFFFFF',
            border: !isOnline ? '1px solid rgba(255, 122, 0, 0.4)' : '1px solid rgba(63, 203, 189, 0.4)',
            borderRadius: '9999px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '13px' }}>{!isOnline ? '✈️' : '☁️'}</span>
          <span>
            {!isOnline ? 'In-Flight Mode' : 'Online Sync'}
            {syncQueue.length > 0 ? ` · ${syncQueue.length} staged offline` : ' · Saved locally'}
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              background: 'rgba(255, 255, 255, 0.18)',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Details
          </span>
        </button>
      </aside>

      {/* Offline Queue Drawer / Modal */}
      {showDrawer && (
        <div
          ref={drawerRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Offline Sync Queue"
          className="modal-overlay"
          onClick={closeDrawer}
          style={{
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="glass-card fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '100%',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '22px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>✈️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    In-Flight Offline Queue
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {!isOnline ? 'Zero connectivity — writes safe on device' : 'Connected to network'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '6px' }}
                onClick={() => setShowDrawer(false)}
                aria-label="Close"
              >
                <IconClose size={16} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 16px 0' }}>
              All expenses, members, and notes created or edited while disconnected are safely queued in local storage and will automatically reconcile with Supabase when you land.
            </p>

            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '18px',
                padding: '4px',
              }}
            >
              {syncQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <IconCheck size={28} style={{ color: 'var(--color-success)', marginBottom: '6px' }} />
                  <div>All local changes are fully reconciled!</div>
                </div>
              ) : (
                syncQueue.map((item, idx) => {
                  const failed = inspectorOn && !!item.lastError;
                  return (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'var(--bg-surface)',
                      border: `1px solid ${item.needsAttention && inspectorOn ? 'var(--color-danger, #DC2626)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                      <span style={{ color: failed ? 'var(--color-danger, #DC2626)' : 'var(--accent-orange)' }}>●</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                          {inspectorOn ? describeSyncItem(item) : item.type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </div>
                        {failed && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', overflowWrap: 'anywhere' }}>
                            {item.needsAttention ? 'Needs attention' : `Retrying (attempt ${item.attempts ?? 1})`}: {item.lastError}
                          </div>
                        )}
                      </div>
                    </div>
                    {inspectorOn ? (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {isOnline && (
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => { triggerHaptic(); void retrySyncItem(item.id); }}
                            disabled={isSyncing}
                          >
                            Retry
                          </button>
                        )}
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--color-danger, #DC2626)' }}
                          onClick={() => {
                            triggerHaptic();
                            if (confirmDiscardId === item.id) {
                              setConfirmDiscardId(null);
                              void discardSyncItem(item.id);
                            } else {
                              setConfirmDiscardId(item.id);
                            }
                          }}
                          onBlur={() => setConfirmDiscardId((cur) => (cur === item.id ? null : cur))}
                        >
                          {confirmDiscardId === item.id ? 'Confirm?' : 'Discard'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                        Staged locally
                      </span>
                    )}
                  </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDrawer(false)}
                style={{ padding: '8px 16px', borderRadius: '9999px' }}
              >
                Done
              </button>
              {isOnline && syncQueue.length > 0 && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '9999px' }}
                >
                  <IconRefresh size={14} className={isSyncing ? 'spin' : ''} />
                  <span>{isSyncing ? 'Syncing…' : 'Sync Now'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
