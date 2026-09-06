import { useState, useRef } from 'react';
import type { Trip, TripState } from '../types';
import { validateAndSanitizeBackup } from '../utils/backupValidation';
import { triggerHaptic } from '../utils/haptics';
import { formatAmount } from '../utils/currency';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTrip?: Trip | null;
  fullTripState: TripState;
  onImportState: (sanitizedState: TripState, asNewTrip?: boolean) => Promise<{ success: boolean; error?: string }>;
}

export function OfflineSnapshotModal({
  isOpen,
  onClose,
  activeTrip,
  fullTripState,
  onImportState,
}: Props) {
  const [importPreview, setImportPreview] = useState<TripState | null>(null);
  const [importError, setImportError] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useHistoryBack(isOpen && importPreview !== null, () => setImportPreview(null));
  useHistoryBack(isOpen && importPreview === null, onClose);
  useEscapeKey(isOpen && importPreview !== null, () => setImportPreview(null));
  useEscapeKey(isOpen && importPreview === null, onClose);

  if (!isOpen) return null;

  const handleExportSnapshot = () => {
    triggerHaptic('light');
    const exportBundle = {
      manifest: {
        version: '3.3.0',
        exportedAt: new Date().toISOString(),
        appName: 'Trip Tracker 2026',
        tripCount: activeTrip ? 1 : fullTripState.trips.length,
        type: activeTrip ? 'single_trip_snapshot' : 'full_backup',
      },
      trips: activeTrip ? [activeTrip] : fullTripState.trips,
      members: fullTripState.members,
      groups: fullTripState.groups,
      expenses: activeTrip
        ? fullTripState.expenses.filter((e) => e.tripId === activeTrip.id)
        : fullTripState.expenses,
      categories: fullTripState.categories,
    };

    const jsonStr = JSON.stringify(exportBundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sanitizedTripName = (activeTrip?.name || 'all-trips').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `triptracker-${sanitizedTripName}-${dateStr}.triptracker`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerHaptic('success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') {
        setImportError('Failed to read backup file.');
        return;
      }

      const validation = validateAndSanitizeBackup(content);
      if (!validation.valid || !validation.sanitizedState) {
        setImportError(validation.error || 'Invalid backup snapshot file.');
        setImportPreview(null);
        return;
      }

      setImportPreview(validation.sanitizedState);
      triggerHaptic('light');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async (asNewTrip: boolean) => {
    if (!importPreview) return;
    setIsImporting(true);
    setImportError('');
    try {
      const res = await onImportState(importPreview, asNewTrip);
      if (res.success) {
        triggerHaptic('success');
        setImportSuccess(true);
        setTimeout(() => {
          onClose();
          setImportPreview(null);
          setImportSuccess(false);
        }, 1200);
      } else {
        setImportError(res.error || 'Failed to import snapshot.');
      }
    } catch {
      setImportError('Unexpected error during snapshot import.');
    } finally {
      setIsImporting(false);
    }
  };

  const previewTrip = importPreview?.trips[0];
  const previewExpenses = importPreview?.expenses || [];
  const totalPreviewSpend = previewExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '92%',
          padding: '24px',
          borderRadius: 'var(--border-radius-lg, 20px)',
          background: 'var(--card-bg, var(--bg-surface))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>💾</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Offline Snapshot Backup</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Export & import offline .triptracker files</p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 10px', fontSize: '13px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Export Section */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border-color)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              Export Current Trip
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--primary-accent)', background: 'rgba(15, 169, 143, 0.12)', padding: '2px 8px', borderRadius: '999px' }}>
              100% Offline
            </span>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Downloads a standalone snapshot ({activeTrip ? `"${activeTrip.name}"` : 'All Trips'}) including members, expenses, routes, checklists, and notes.
          </p>
          <button
            type="button"
            className="primary-btn"
            style={{ width: '100%', padding: '10px 16px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleExportSnapshot}
          >
            <span>📥</span> Download .triptracker Snapshot
          </button>
        </div>

        {/* Import Section */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Import Snapshot File
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Select a .triptracker or .json file from another device or backup.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".triptracker,.json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {!importPreview ? (
            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '10px 16px', fontSize: '13.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <span>📂</span> Choose .triptracker File
            </button>
          ) : (
            <div style={{ marginTop: '8px' }}>
              {/* Import Preview Card */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(15, 169, 143, 0.08)',
                  border: '1px solid rgba(15, 169, 143, 0.25)',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Snapshot Verified
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {previewTrip?.name || 'Trip Backup'}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {importPreview.trips.length} trip(s) • {previewExpenses.length} expense(s) • {Object.keys(importPreview.members).length} member(s)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px' }}>
                  Total: {formatAmount(totalPreviewSpend, previewTrip?.baseCurrency || 'INR')}
                </div>
              </div>

              {importSuccess ? (
                <div style={{ color: 'var(--color-success, #10b981)', fontSize: '13px', textAlign: 'center', fontWeight: 600, padding: '8px' }}>
                  ✓ Snapshot imported successfully!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    disabled={isImporting}
                    onClick={() => handleConfirmImport(true)}
                  >
                    {isImporting ? 'Importing...' : 'Import as New Trip'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    onClick={() => setImportPreview(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {importError && (
            <div style={{ color: 'var(--color-danger, #ef4444)', fontSize: '12px', marginTop: '10px' }}>
              {importError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
