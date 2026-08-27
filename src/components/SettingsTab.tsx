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
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  onOpenShareTrip?: () => void;
  onOpenTripWrapped?: () => void;
  baseCurrency?: string;
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
  pwaInstallable,
  onInstallApp,
  onOpenSuperadminPortal,
  onRequestConfirm,
  onOpenShareTrip,
  onOpenTripWrapped,
  baseCurrency,
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
      pwaInstallable={pwaInstallable}
      onInstallApp={onInstallApp}
      onOpenSuperadminPortal={onOpenSuperadminPortal}
      onRequestConfirm={onRequestConfirm}
      onOpenShareTrip={onOpenShareTrip}
      onOpenTripWrapped={onOpenTripWrapped}
      hasActiveTrip={true}
      baseCurrency={baseCurrency}
    />
  );
}
