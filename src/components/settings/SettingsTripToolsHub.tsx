import type { Category, Trip } from '../../types';
import { IconFileSpreadsheet, IconSparkles, IconTag, IconTrash, IconUpload, IconWallet } from '../Icons';
import { SettingsCell } from '../common/SettingsCell';
import { triggerHaptic } from '../../utils/haptics';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  activeTrip: Trip;
  categories: Category[];
  deletedCount: number;
  showCategories: boolean;
  showRecycleBin: boolean;
  onOpenCategories: () => void;
  onOpenRecycleBin: () => void;
  onOpenFxRates?: () => void;
  onExportCsv?: () => void;
  onOpenSplitwiseImport?: () => void;
  onOpenTripWrapped?: () => void;
};

export function SettingsTripToolsHub({
  parentTitle,
  onBack,
  activeTrip,
  categories,
  deletedCount,
  showCategories,
  showRecycleBin,
  onOpenCategories,
  onOpenRecycleBin,
  onOpenFxRates,
  onExportCsv,
  onOpenSplitwiseImport,
  onOpenTripWrapped,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Trip Tools"
      subtitle={
        <>
          Categories, recycle bin{onOpenTripWrapped ? ', wrapped' : ''}{onOpenFxRates ? ', exchange rates' : ''}, and exports for {activeTrip.name}.
        </>
      }
    >
      <div className="settings-group">
        <div className="settings-group-card">
          {showCategories && (
            <SettingsCell
              icon={<IconTag size={18} />}
              iconGlow="purple"
              title="Categories & Tags"
              subtitle={`${categories.length} active categories`}
              onPointerEnter={() => { void import('./SettingsCategoriesScreen'); }}
              onPointerDown={() => { void import('./SettingsCategoriesScreen'); }}
              onClick={onOpenCategories}
            />
          )}

          {showRecycleBin && (
            <SettingsCell
              icon={<IconTrash size={18} />}
              iconGlow="rose"
              title="Recycle Bin"
              subtitle={deletedCount === 0 ? 'Empty (24h retention)' : `${deletedCount} deleted expense${deletedCount === 1 ? '' : 's'}`}
              badge={deletedCount > 0 ? deletedCount : undefined}
              onPointerEnter={() => { void import('./SettingsRecycleBinScreen'); }}
              onPointerDown={() => { void import('./SettingsRecycleBinScreen'); }}
              onClick={onOpenRecycleBin}
            />
          )}

          {onOpenTripWrapped && (
            <SettingsCell
              icon={<IconSparkles size={18} />}
              title="Trip wrapped"
              subtitle="A recap of this trip"
              onClick={() => {
                triggerHaptic('light');
                onOpenTripWrapped();
              }}
            />
          )}

          {onOpenFxRates && (
            <SettingsCell
              icon={<IconWallet size={18} />}
              title="Exchange rates"
              subtitle="Rates for this trip"
              onClick={() => {
                triggerHaptic('light');
                onOpenFxRates();
              }}
            />
          )}

          {onExportCsv && (
            <SettingsCell
              icon={<IconFileSpreadsheet size={18} />}
              iconGlow="emerald"
              title="Excel CSV Export"
              subtitle="Download settlement ledger & expense breakdown"
              badge="CSV"
              hasDivider={Boolean(onOpenSplitwiseImport)}
              onClick={onExportCsv}
            />
          )}

          {onOpenSplitwiseImport && (
            <SettingsCell
              icon={<IconUpload size={18} />}
              iconGlow="teal"
              title="Import Splitwise CSV"
              subtitle="Bring a Splitwise group spreadsheet into this trip"
              badge="CSV"
              hasDivider={false}
              onClick={onOpenSplitwiseImport}
            />
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
