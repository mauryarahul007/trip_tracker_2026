import { useEffect, useRef } from 'react';
import type { Trip, Category, Expense } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconClose } from './Icons';
import { SettingsView, type ThemePref } from './SettingsView';
import { useTripStore } from '../store/tripStore';

type Props = {
  onClose: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  themePref: ThemePref;
  setThemePref: (v: ThemePref) => void;

  onExportJson: () => void;
  showImportArea: boolean;
  setShowImportArea: (v: boolean) => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importStatus: 'idle' | 'pending' | 'success' | 'error';
  importErrorMessage?: string | null;
  onImport: (jsonOverride?: string) => void;
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
  onOpenTripWrapped?: () => void;
};

export function GlobalSettingsModal({
  onClose,
  onRequestConfirm,
  onOpenTripWrapped,
  themePref,
  setThemePref,
  onExportJson,
  showImportArea,
  setShowImportArea,
  importJson,
  setImportJson,
  importStatus,
  importErrorMessage,
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

  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))' }}>
          <div className="app-header-top">
            <div className="app-title-group">
              <h2 id="global-settings-title" className="app-logo" style={{ fontSize: '22px', color: '#FFFFFF' }}>Settings</h2>
            </div>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '7px 8px', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
              aria-label="Close"
              title="Close"
              onClick={onClose}
            >
              <IconClose size={16} className="icon-sm" />
            </button>
          </div>
        </header>

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
          importErrorMessage={importErrorMessage}
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
          onRequestConfirm={onRequestConfirm}
          onOpenTripWrapped={onOpenTripWrapped}
        />
      </div>
    </div>
  );
}
