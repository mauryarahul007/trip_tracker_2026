import type { Category, Expense, Trip } from '../types';
import { SettingsView, type ThemePref } from './SettingsView';

type Props = {
  categories: Category[];
  activeTripExpenses: Expense[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv: () => void;
  isAdmin: boolean;
  onOpenGlobalSettings?: () => void;

  themePref?: ThemePref;
  setThemePref?: (v: ThemePref) => void;
  onExportJson?: () => void;
  showImportArea?: boolean;
  setShowImportArea?: (v: boolean) => void;
  importJson?: string;
  setImportJson?: (v: string) => void;
  importStatus?: 'idle' | 'success' | 'error';
  onImport?: () => void;
  onClearDatabase?: () => void;
  onLoadDemoTrip?: () => void;
  archivedTrips?: Trip[];
  onRestoreTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
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
      hasActiveTrip={true}
    />
  );
}
