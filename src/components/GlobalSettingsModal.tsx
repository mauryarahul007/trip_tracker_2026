import type { Trip, Category, Expense } from '../types';
import { IconClose } from './Icons';
import { SettingsView, type ThemePref } from './SettingsView';
import { useTripStore } from '../store/tripStore';

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

  archivedTrips: Trip[];
  onRestoreTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;

  userEmail: string | null;
  onSignOut: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;

  // Optional trip context if opened while inside a trip
  categories?: Category[];
  activeTripExpenses?: Expense[];
  onAddCategory?: (name: string, icon: string) => Promise<void>;
  onDeleteCategory?: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv?: () => void;
  isAdmin?: boolean;
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
  archivedTrips,
  onRestoreTrip,
  onDeleteTrip,
  userEmail,
  onSignOut,
  pwaInstallable = false,
  onInstallApp,
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin = true,
}: Props) {
  const storeCategories = useTripStore((s) => s.categories);
  const storeExpenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);

  const effectiveCategories = categories || storeCategories;
  const effectiveExpenses = activeTripExpenses || storeExpenses.filter((e) => e.tripId === activeTripId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card fade-in modal-sheet"
        style={{
          maxWidth: '480px',
          background: 'var(--bg-surface)',
          boxShadow: 'var(--glass-shadow)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          padding: '24px 20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <IconClose size={18} />
          </button>
        </div>

        <SettingsView
          categories={effectiveCategories}
          activeTripExpenses={effectiveExpenses}
          onAddCategory={onAddCategory || (async () => {})}
          onDeleteCategory={onDeleteCategory || (async () => {})}
          onExportCsv={onExportCsv}
          isAdmin={isAdmin}
          themePref={themePref}
          setThemePref={setThemePref}
          onExportJson={onExportJson}
          showImportArea={showImportArea}
          setShowImportArea={setShowImportArea}
          importJson={importJson}
          setImportJson={setImportJson}
          importStatus={importStatus}
          onImport={onImport}
          onClearDatabase={onClearDatabase}
          onLoadDemoTrip={onLoadDemoTrip}
          archivedTrips={archivedTrips}
          onRestoreTrip={onRestoreTrip}
          onDeleteTrip={onDeleteTrip}
          userEmail={userEmail}
          onSignOut={onSignOut}
          pwaInstallable={pwaInstallable}
          onInstallApp={onInstallApp}
          hasActiveTrip={Boolean(activeTripId)}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
