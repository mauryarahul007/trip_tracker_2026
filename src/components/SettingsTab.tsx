import React from 'react';
import type { Category } from '../types';
import { IconDownload, IconUpload, IconCheckCircle, IconAlertCircle } from './Icons';
import { CategoryIcon } from './CategoryIcon';

const CATEGORY_ICON_PRESETS = ['🍔', '🏨', '✈️', '🎟️', '🛍️', '📦', '🚗', '⛽', '🎬', '🍺', '💊', '🎁', '🧾', '🏥', '🎓', '🐾', '🎵', '🚕'];

type ThemePref = 'light' | 'dark' | 'system';

type Props = {
  themePref: ThemePref;
  setThemePref: (v: ThemePref) => void;

  categories: Category[];
  onDeleteCategory: (id: string, name: string) => void;
  onAddCategory: (e: React.FormEvent) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  newCategoryIcon: string;
  setNewCategoryIcon: (v: string) => void;
  showIconPicker: boolean;
  setShowIconPicker: (v: boolean) => void;

  onExportCsv: () => void;
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
  isAdmin: boolean;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
};

export function SettingsTab({
  themePref,
  setThemePref,
  categories,
  onDeleteCategory,
  onAddCategory,
  newCategoryName,
  setNewCategoryName,
  newCategoryIcon,
  setNewCategoryIcon,
  showIconPicker,
  setShowIconPicker,
  onExportCsv,
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
  isAdmin,
  pwaInstallable = false,
  onInstallApp,
}: Props) {
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
    <div className="fade-in">
      <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Settings & Data Utility</h3>

      {/* Account */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Account</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{userEmail || 'Signed in'}</span>
          <button type="button" className="secondary-btn" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Diagnostics Panel */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>App Connection & Storage</h4>
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

      {/* Appearance — "night flight" is a deliberately designed dark
          variant, not an inverted filter, so it gets its own named option
          rather than a plain on/off switch. */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Appearance</h4>
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

      {pwaInstallable && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px' }}>Install App</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Install this ledger onto your home screen for quick, offline-ready access on your device.
          </p>
          <button type="button" className="gradient-btn" onClick={onInstallApp}>
            Install Trip Tracker
          </button>
        </div>
      )}

      {/* Manage Categories */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Manage Categories</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 'var(--border-radius-sm)' }}>
              <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-accent)' }}>
                <CategoryIcon categoryId={cat.id} fallbackEmoji={cat.icon} size={16} />
                <span style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
              </span>
              {cat.isCustom && isAdmin ? (
                <button
                  className="secondary-btn"
                  style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                  onClick={() => onDeleteCategory(cat.id, cat.name)}
                >
                  Delete
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cat.isCustom ? 'Custom' : 'Built-in'}</span>
              )}
            </div>
          ))}
        </div>

        {!isAdmin && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Only the trip admin can manage categories.</p>
        )}

        {isAdmin && (
        <form onSubmit={onAddCategory} style={{ display: 'flex', gap: '8px' }}>
          <div
            style={{ position: 'relative' }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowIconPicker(false);
            }}
          >
            <input
              type="text"
              className="input-field"
              style={{ width: '52px', height: '44px', textAlign: 'center', fontSize: '19px', padding: '0' }}
              placeholder="🏷️"
              maxLength={4}
              value={newCategoryIcon}
              onChange={(e) => setNewCategoryIcon(e.target.value)}
              onFocus={() => setShowIconPicker(true)}
              aria-label="Category emoji icon"
              title="Pick an emoji or type/paste your own"
            />
            {showIconPicker && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
                width: '204px', display: 'flex', flexWrap: 'wrap', gap: '6px',
                padding: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)', boxShadow: '0 10px 25px -5px rgba(28,42,56,0.2)'
              }}>
                {CATEGORY_ICON_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setNewCategoryIcon(icon);
                      setShowIconPicker(false);
                    }}
                    style={{
                      width: '32px', height: '32px', fontSize: '16px', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 'var(--border-radius-sm)', cursor: 'pointer',
                      transition: 'var(--transition-smooth)',
                      border: newCategoryIcon === icon ? '2px solid var(--primary-accent)' : '1.5px solid transparent',
                      background: newCategoryIcon === icon ? 'rgba(31,110,104,0.10)' : 'var(--bg-surface-hover)',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            required
            className="input-field"
            style={{ flex: 1 }}
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button type="submit" className="gradient-btn" style={{ padding: '10px 16px' }}>Add</button>
        </form>
        )}
      </div>

      {/* Excel CSV Exporter */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Excel CSV Export</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Download a secure, formula-injection-protected CSV file containing your expense lists, member balances, and outstanding settlements. This file can be opened directly in Microsoft Excel or Google Sheets.
        </p>
        <button className="gradient-btn" style={{ padding: '12px' }} onClick={onExportCsv}>
          <IconDownload size={16} className="icon-sm" /> Export Excel CSV
        </button>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>JSON Database Backups</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Export your complete local database state to import onto another device or keep as a secure offline backup.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="gradient-btn" style={{ flex: 1, padding: '12px' }} onClick={onExportJson}>
            <IconDownload size={16} className="icon-sm" /> Export Backup JSON
          </button>
          <button className="secondary-btn" style={{ flex: 1, padding: '12px' }} onClick={() => setShowImportArea(!showImportArea)}>
            <IconUpload size={16} className="icon-sm" /> Import Backup JSON
          </button>
        </div>

        {showImportArea && (
          <div className="fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              className="input-field"
              rows={6}
              placeholder="Paste backup JSON string here..."
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            <button className="gradient-btn" style={{ padding: '10px' }} onClick={onImport}>
              Restore State
            </button>

            {importStatus === 'success' && (
              <p style={{ color: 'var(--color-success)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully! Reloading...
              </p>
            )}
            {importStatus === 'error' && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <IconAlertCircle size={15} className="icon-sm" /> Invalid database backup format. Please verify the string.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Seed Demo Trip */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Quick Seed Demo Data</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Populate a mock trip ("Road Trip to Goa") pre-loaded with sample members, custom groups, and 6 diverse expense splits to see the settlement engine and charts in action.
        </p>
        <button type="button" className="gradient-btn" style={{ padding: '12px', background: 'var(--secondary-accent)' }} onClick={onLoadDemoTrip}>
          Load Demo Trip
        </button>
      </div>

      {/* Factory Reset */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', borderColor: 'rgba(184, 69, 46, 0.25)' }}>
        <h4 style={{ fontSize: '16px', color: 'var(--color-danger)' }}>Factory Reset</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Wipe all local trips, expenses, members, and custom settings. This will completely clear your browser's IndexedDB for this application. Ensure you have backed up your data if needed.
        </p>
        <button type="button" className="gradient-btn" style={{ padding: '12px', background: 'var(--color-danger)' }} onClick={onClearDatabase}>
          Clear All Data
        </button>
      </div>
    </div>
  );
}
