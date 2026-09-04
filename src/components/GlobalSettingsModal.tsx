import { useRef, useState, useEffect } from 'react';
import type { Trip, Category, Expense } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconClose } from './Icons';
import { SettingsView, type ThemePref } from './SettingsView';
import { useTripStore } from '../store/tripStore';
import { getAppVersion, WEB_APP_VERSION } from '../utils/appVersion';
import { useFocusTrap } from '../hooks/useFocusTrap';

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
  onDeleteAccount?: () => void;
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
  onOpenAchievements?: () => void;
  onOpenShareTrip?: () => void;
  onNavigateToBalances?: () => void;
  baseCurrency?: string;
};

export function GlobalSettingsModal({
  onClose,
  onRequestConfirm,
  onOpenTripWrapped,
  onOpenAchievements,
  onNavigateToBalances,
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
  onDeleteAccount,
  pwaInstallable = false,
  onInstallApp,
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin = true,
  onOpenShareTrip,
  baseCurrency,
}: Props) {
  const storeCategories = useTripStore((s) => s.categories);
  const storeExpenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);

  const effectiveCategories = categories || storeCategories;
  const effectiveExpenses = activeTripExpenses || storeExpenses.filter((e) => e.tripId === activeTripId);

  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, true, false, onClose);

  const [appVersion, setAppVersion] = useState<string>(() => `${WEB_APP_VERSION}`);
  useEffect(() => {
    getAppVersion().then(setAppVersion).catch(() => {});
  }, []);

  return (
    <div className="modal-backdrop drawer-right" onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="modal-sheet settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))' }}>
          <div className="app-header-top">
            <div className="app-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 id="global-settings-title" className="app-logo" style={{ fontSize: '20px', color: '#FFFFFF' }}>Settings</h2>
              <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-family-mono)', background: 'rgba(23, 182, 166, 0.2)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '1px 7px', borderRadius: '10px', fontWeight: 700 }}>
                v{appVersion}
              </span>
            </div>
            <button
              type="button"
              className="secondary-btn touch-target-btn"
              style={{ minWidth: '38px', minHeight: '38px', width: '38px', height: '38px', padding: 0, color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Close settings"
              title="Close"
              onClick={onClose}
            >
              <IconClose size={15} className="icon-sm" />
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
          onDeleteAccount={onDeleteAccount}
          pwaInstallable={pwaInstallable}
          onInstallApp={onInstallApp}
          hasActiveTrip={Boolean(activeTripId)}
          onClose={onClose}
          onRequestConfirm={onRequestConfirm}
          onOpenTripWrapped={onOpenTripWrapped}
          onOpenAchievements={onOpenAchievements}
          onOpenShareTrip={onOpenShareTrip}
          onNavigateToBalances={onNavigateToBalances}
          baseCurrency={baseCurrency}
        />
      </div>
    </div>
  );
}
