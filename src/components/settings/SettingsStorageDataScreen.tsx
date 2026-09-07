import { IconChevronRight, IconDatabase, IconDownload, IconTrash } from '../Icons';
import { triggerHaptic } from '../../utils/haptics';
import { SettingsSubscreenFrame } from './SettingsNavHeader';
import { formatBytes } from './formatBytes';

export type StorageBreakdown = {
  receiptCount: number;
  receiptBytes: number;
  dbBytes: number;
  cacheBytes: number;
  mediaPct: number;
  dbPct: number;
  cachePct: number;
};

type Props = {
  parentTitle: string;
  onBack: () => void;
  storageEstimate: { used: number; quota: number } | null;
  storageBreakdown: StorageBreakdown;
  tripCount: number;
  tempCacheCleared: boolean;
  onClearTempCache: () => void;
  onExportJson?: () => void;
  onOpenBackups: () => void;
};

export function SettingsStorageDataScreen({
  parentTitle,
  onBack,
  storageEstimate,
  storageBreakdown,
  tripCount,
  tempCacheCleared,
  onClearTempCache,
  onExportJson,
  onOpenBackups,
}: Props) {
  const totalUsedStr = storageEstimate ? formatBytes(storageEstimate.used) : '0 B';
  const quotaStr = storageEstimate ? formatBytes(storageEstimate.quota) : '50 GB';
  const percentUsed = storageEstimate && storageEstimate.quota > 0
    ? ((storageEstimate.used / storageEstimate.quota) * 100).toFixed(2)
    : '0.01';

  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Storage and Data"
      subtitle="Manage local media receipts, trip ledgers, offline cache, and backup exports."
    >
      <div className="settings-group">
        <h4 className="settings-group-title">Storage Usage</h4>
        <div className="settings-group-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {totalUsedStr} used
            </span>
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
              {quotaStr} total ({percentUsed}%)
            </span>
          </div>

          <div className="settings-storage-segmented-bar" role="progressbar" aria-valuenow={Number(percentUsed)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="storage-seg media"
              style={{ width: `${storageBreakdown.mediaPct}%` }}
              title={`Receipt Photos: ${storageBreakdown.mediaPct}%`}
            />
            <div
              className="storage-seg database"
              style={{ width: `${storageBreakdown.dbPct}%` }}
              title={`Trips & Ledgers: ${storageBreakdown.dbPct}%`}
            />
            <div
              className="storage-seg cache"
              style={{ width: `${storageBreakdown.cachePct}%` }}
              title={`Offline Cache: ${storageBreakdown.cachePct}%`}
            />
          </div>

          <div className="settings-storage-legend-card" style={{ background: 'transparent', border: 'none', padding: '6px 0 0' }}>
            <div className="settings-storage-legend-row">
              <div className="settings-storage-legend-left">
                <span className="settings-storage-color-dot media" />
                <span>Receipt Photos &amp; Attachments</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {storageBreakdown.receiptCount} {storageBreakdown.receiptCount === 1 ? 'receipt' : 'receipts'}
                </span>
                <span className="settings-storage-val-badge">
                  {formatBytes(storageBreakdown.receiptBytes)}
                </span>
              </div>
            </div>

            <div className="settings-storage-legend-row">
              <div className="settings-storage-legend-left">
                <span className="settings-storage-color-dot database" />
                <span>Trip Ledgers &amp; Categories</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {tripCount} {tripCount === 1 ? 'trip' : 'trips'}
                </span>
                <span className="settings-storage-val-badge">
                  {formatBytes(storageBreakdown.dbBytes)}
                </span>
              </div>
            </div>

            <div className="settings-storage-legend-row">
              <div className="settings-storage-legend-left">
                <span className="settings-storage-color-dot cache" />
                <span>App Shell, Icons &amp; Offline Cache</span>
              </div>
              <span className="settings-storage-val-badge">
                {formatBytes(storageBreakdown.cacheBytes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">Manage &amp; Free Up Space</h4>
        <div className="settings-group-card">
          <button
            type="button"
            className="settings-row-item"
            onClick={onClearTempCache}
          >
            <div className="settings-row-left">
              <div className="settings-squircle squircle-amber-glow">
                <IconTrash size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Free Up Cache Storage</span>
                <span className="settings-row-subtitle">
                  {tempCacheCleared ? 'Temporary cache cleared!' : 'Purge temporary web caches and unpinned tiles'}
                </span>
              </div>
            </div>
            <div className="settings-row-right">
              <span
                className="settings-badge-pill"
                style={{
                  color: tempCacheCleared ? 'var(--color-success)' : 'var(--primary-accent)',
                  fontWeight: 600,
                }}
              >
                {tempCacheCleared ? '✓ Cleared' : 'Free Up'}
              </span>
            </div>
          </button>

          {onExportJson && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                triggerHaptic('light');
                onExportJson();
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-emerald-glow">
                  <IconDownload size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Export Full Offline Backup</span>
                  <span className="settings-row-subtitle">Download JSON database snapshot for safe offline keeping</span>
                </div>
              </div>
              <div className="settings-row-right">
                <span className="settings-badge-pill">JSON</span>
              </div>
            </button>
          )}

          <button
            type="button"
            className="settings-row-item"
            onClick={() => {
              triggerHaptic('light');
              onOpenBackups();
            }}
          >
            <div className="settings-row-left">
              <div className="settings-squircle squircle-indigo-glow">
                <IconDatabase size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Backup &amp; Restore Manager</span>
                <span className="settings-row-subtitle">Inspect JSON payload, import previous backups</span>
              </div>
            </div>
            <div className="settings-row-right">
              <IconChevronRight size={16} />
            </div>
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h4 className="settings-group-title">Media Efficiency</h4>
        <div className="settings-group-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                Smart Camera Auto-Compression Active
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Photos captured up to 25MB are automatically downscaled and re-encoded client-side into WebP/JPEG (&lt;180KB footprint) before saving. This keeps local storage slim and cloud sync instant on spotty 3G/roaming connections.
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
