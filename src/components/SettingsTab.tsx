import type { Category, Expense, Trip } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import { SettingsView, type ThemePref } from './SettingsView';

type Props = {
  categories: Category[];
  activeTripExpenses: Expense[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv: () => void;
  isAdmin: boolean;
  onOpenGlobalSettings?: () => void;
  onOpenSuperadminPortal?: () => void;
  onOpenOpsBugs?: () => void;

  themePref?: ThemePref;
  setThemePref?: (v: ThemePref) => void;
  onExportJson?: () => void;
  showImportArea?: boolean;
  setShowImportArea?: (v: boolean) => void;
  importJson?: string;
  setImportJson?: (v: string) => void;
  importStatus?: 'idle' | 'pending' | 'success' | 'error';
  importErrorMessage?: string | null;
  onImport?: (jsonOverride?: string) => void;
  onClearDatabase?: () => void;
  onLoadDemoTrip?: () => void;
  archivedTrips?: Trip[];
  onRestoreTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  onOpenShareTrip?: () => void;
  onNavigateToBalances?: () => void;
  baseCurrency?: string;
  onOpenFxRates?: () => void;
  onOpenMediaGallery?: () => void;
  onOpenOfflineSnapshot?: () => void;
  isSurfaceVisible?: boolean;
};

export function SettingsTab({
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin,
  themePref = 'light',
  setThemePref = () => {},
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
  pwaInstallable,
  onInstallApp,
  onOpenSuperadminPortal,
  onOpenOpsBugs,
  onRequestConfirm,
  onOpenShareTrip,
  onNavigateToBalances,
  baseCurrency,
  onOpenFxRates,
  onOpenMediaGallery,
  onOpenOfflineSnapshot,
  isSurfaceVisible = true,
}: Props) {
  return (
    <SettingsView
      categories={categories}
      activeTripExpenses={activeTripExpenses}
      onAddCategory={onAddCategory}
      onDeleteCategory={onDeleteCategory}
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
      onOpenSuperadminPortal={onOpenSuperadminPortal}
      onOpenOpsBugs={onOpenOpsBugs}
      onRequestConfirm={onRequestConfirm}
      onOpenShareTrip={onOpenShareTrip}
      onNavigateToBalances={onNavigateToBalances}
      hasActiveTrip={true}
      baseCurrency={baseCurrency}
      onOpenFxRates={onOpenFxRates}
      onOpenMediaGallery={onOpenMediaGallery}
      onOpenOfflineSnapshot={onOpenOfflineSnapshot}
      isSurfaceVisible={isSurfaceVisible}
    />
  );
}
