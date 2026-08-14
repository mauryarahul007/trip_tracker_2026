import React from 'react';
import { IconDownload, IconUpload, IconCheckCircle, IconAlertCircle, IconClose } from './Icons';
import { useTripStore } from '../store/tripStore';

type ThemePref = 'light' | 'dark' | 'system';


type Props = {
  onClose: () => void;
  themePref: ThemePref;
  setThemePref: (v: ThemePref) => void;

  onExportJson: () => void;
  showImportArea: boolean;
  setShowImportArea: (v: boolean) => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importStatus: 'idle' | 'success' | 'error';
  onImport: () => void;
  onClearDatabase: () => void;
  onLoadDemoTrip: () => void;

  userEmail: string | null;
  onSignOut: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
};

export function GlobalSettingsModal({
  onClose,
  themePref,
  setThemePref,
  onExportJson,
  showImportArea,
  setShowImportArea,
  importJson,
  setImportJson,
  importStatus,
  onImport,
  onClearDatabase,
  onLoadDemoTrip,
  userEmail,
  onSignOut,
  pwaInstallable = false,
  onInstallApp,
}: Props) {
  const p2pSyncEnabled = useTripStore((s) => s.p2pSyncEnabled);
  const setP2PSyncEnabled = useTripStore((s) => s.setP2PSyncEnabled);

  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [storageEstimate, setStorageEstimate] = React.useState<{ used: number; quota: number } | null>(null);


  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageEstimate({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card fade-in"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <IconClose size={18} />
        </button>

        <h3 style={{ fontSize: '18px', marginBottom: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          Global Settings & Preferences
        </h3>

        {/* Account Section */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Account</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{userEmail || 'Signed in'}</span>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 14px', fontSize: '13px' }}
              onClick={() => {
                onSignOut();
                onClose();
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Connection & Storage */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>App Connection & Storage</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Connection Status:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, color: isOnline ? 'var(--color-success)' : 'var(--color-danger)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--color-success)' : 'var(--color-danger)', display: 'inline-block' }}></span>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {storageEstimate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Local Disk Usage:</span>
                  <span style={{ fontWeight: 500 }}>
                    {formatBytes(storageEstimate.used)} of {formatBytes(storageEstimate.quota)}
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(15,23,42,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (storageEstimate.used / storageEstimate.quota) * 100)}%`, height: '100%', background: 'var(--primary-accent)' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Appearance</h4>
          <div className="theme-toggle-row">
            {([
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Night flight' },
              { value: 'system', label: 'System' },
            ] as { value: ThemePref; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`theme-toggle-btn${themePref === opt.value ? ' active' : ''}`}
                aria-pressed={themePref === opt.value}
                onClick={() => setThemePref(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Offline Peer Sync Feature Toggle */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="toggle-switch-container">
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Offline Peer Sync</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Show round sync button in header &amp; enable peer-to-peer offline syncing.
              </p>
            </div>
            <label className="toggle-switch" aria-label="Enable Offline Peer Sync">
              <input
                type="checkbox"
                checked={p2pSyncEnabled}
                onChange={(e) => setP2PSyncEnabled(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>


        {/* PWA Install */}
        {pwaInstallable && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Install App</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Install this ledger onto your home screen for quick, offline-ready access on your device.
            </p>
            <button
              type="button"
              className="gradient-btn"
              onClick={() => {
                onInstallApp?.();
                onClose();
              }}
            >
              Install Trip Tracker
            </button>
          </div>
        )}

        {/* Backups */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>JSON Database Backups</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Export your complete local database state to import onto another device or keep as a secure offline backup.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="gradient-btn" style={{ flex: 1, padding: '10px', fontSize: '13px' }} onClick={onExportJson}>
              <IconDownload size={16} className="icon-sm" /> Export Backup
            </button>
            <button className="secondary-btn" style={{ flex: 1, padding: '10px', fontSize: '13px' }} onClick={() => setShowImportArea(!showImportArea)}>
              <IconUpload size={16} className="icon-sm" /> Import Backup
            </button>
          </div>

          {showImportArea && (
            <div className="fade-in" style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Paste backup JSON string here..."
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
              />
              <button
                className="gradient-btn"
                style={{ padding: '8px' }}
                onClick={() => {
                  onImport();
                }}
              >
                Restore State
              </button>

              {importStatus === 'success' && (
                <p style={{ color: 'var(--color-success)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                  <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully! Reloading...
                </p>
              )}
              {importStatus === 'error' && (
                <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                  <IconAlertCircle size={15} className="icon-sm" /> Invalid database backup format.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Demo Seed */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Quick Seed Demo Data</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Populate a mock trip ("Road Trip to Goa") pre-loaded with sample members, custom groups, and 6 diverse expense splits.
          </p>
          <button
            type="button"
            className="gradient-btn"
            style={{ padding: '10px', background: 'var(--secondary-accent)' }}
            onClick={() => {
              onLoadDemoTrip();
              onClose();
            }}
          >
            Load Demo Trip
          </button>
        </div>

        {/* Factory Reset */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderColor: 'rgba(184, 69, 46, 0.25)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-danger)' }}>Factory Reset</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Wipe all local trips, expenses, members, and custom settings. This will completely clear your browser's IndexedDB.
          </p>
          <button
            type="button"
            className="gradient-btn"
            style={{ padding: '10px', background: 'var(--color-danger)' }}
            onClick={() => {
              onClearDatabase();
              onClose();
            }}
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
