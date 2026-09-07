import type { ChangeEvent, RefObject } from 'react';
import { IconAlertCircle, IconCheckCircle, IconDownload, IconUpload } from '../Icons';
import { SettingsSubscreenFrame } from './SettingsNavHeader';
import { formatBytes } from './formatBytes';

type Props = {
  parentTitle: string;
  onBack: () => void;
  storageEstimate: { used: number; quota: number } | null;
  onExportJson?: () => void;
  showImportArea: boolean;
  setShowImportArea?: (v: boolean) => void;
  importFileInputRef: RefObject<HTMLInputElement | null>;
  handleImportFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  importStatus: 'idle' | 'pending' | 'success' | 'error';
  importJson: string;
  importFileError: string | null;
  setImportJson?: (v: string) => void;
  onImport?: (jsonOverride?: string) => void;
  importErrorMessage?: string | null;
};

export function SettingsBackupsScreen({
  parentTitle,
  onBack,
  storageEstimate,
  onExportJson,
  showImportArea,
  setShowImportArea,
  importFileInputRef,
  handleImportFileChange,
  importStatus,
  importJson,
  importFileError,
  setImportJson,
  onImport,
  importErrorMessage,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Database & Backups"
      subtitle="Manage your local database, sync storage, and export JSON or CSV backups."
    >
      {storageEstimate && (
        <div className="settings-group">
          <h4 className="settings-group-title">Storage Consumption</h4>
          <div className="settings-group-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Local Disk Usage:</span>
              <span style={{ fontWeight: 600 }}>
                {formatBytes(storageEstimate.used)} of {formatBytes(storageEstimate.quota)}
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, (storageEstimate.used / storageEstimate.quota) * 100)}%`,
                  height: '100%',
                  background: 'var(--primary-accent)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="settings-group">
        <h4 className="settings-group-title">JSON Snapshot</h4>
        <div className="settings-group-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Export your local database to keep as a cold offline backup or restore onto another device.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="gradient-btn"
              style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              onClick={onExportJson}
            >
              <IconDownload size={15} className="icon-sm" /> Export Backup
            </button>
            <button
              type="button"
              className="secondary-btn"
              style={{ flex: 1, padding: '10px', fontSize: '13px' }}
              onClick={() => setShowImportArea?.(!showImportArea)}
            >
              <IconUpload size={15} className="icon-sm" /> Import Backup
            </button>
          </div>

          {showImportArea && (
            <div className="fade-in" style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '10px' }}
                disabled={importStatus === 'pending'}
                onClick={() => importFileInputRef.current?.click()}
              >
                <IconUpload size={15} className="icon-sm" /> {importStatus === 'pending' ? 'Restoring...' : 'Choose Backup File...'}
              </button>
              {importJson && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Loaded {formatBytes(new Blob([importJson]).size)} of backup data. Review and restore below.
                </p>
              )}
              {importFileError && (
                <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>{importFileError}</p>
              )}
              <details>
                <summary style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Or paste JSON manually</summary>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Paste backup JSON string here..."
                  aria-label="Backup JSON data"
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', marginTop: '8px' }}
                  value={importJson}
                  onChange={(e) => setImportJson?.(e.target.value)}
                />
              </details>
              <button
                type="button"
                className="gradient-btn"
                style={{ padding: '8px' }}
                disabled={!importJson || importStatus === 'pending'}
                onClick={() => onImport?.()}
              >
                {importStatus === 'pending' ? 'Restoring...' : 'Restore Snapshot'}
              </button>

              {importStatus === 'success' && (
                <p style={{ color: 'var(--color-success-text)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                  <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully!
                </p>
              )}
              {importStatus === 'error' && (
                <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                  <IconAlertCircle size={15} className="icon-sm" /> {importErrorMessage || 'Invalid database snapshot format.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
