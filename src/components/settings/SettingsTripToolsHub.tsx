import type { Category, Trip } from '../../types';
import { IconBell, IconFileSpreadsheet, IconTag, IconTrash } from '../Icons';
import { SettingsCell } from '../common/SettingsCell';
import { triggerHaptic } from '../../utils/haptics';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  activeTrip: Trip;
  categories: Category[];
  deletedCount: number;
  isTripMuted: boolean;
  showCategories: boolean;
  showRecycleBin: boolean;
  onOpenCategories: () => void;
  onOpenRecycleBin: () => void;
  onToggleMute: (muted: boolean) => void;
  onOpenFxRates?: () => void;
  onExportCsv?: () => void;
  onOpenTripWrapped?: () => void;
};

export function SettingsTripToolsHub({
  parentTitle,
  onBack,
  activeTrip,
  categories,
  deletedCount,
  isTripMuted,
  showCategories,
  showRecycleBin,
  onOpenCategories,
  onOpenRecycleBin,
  onToggleMute,
  onOpenFxRates,
  onExportCsv,
  onOpenTripWrapped,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Trip Tools"
      subtitle={
        <>
          Categories, recycle bin, alerts{onOpenTripWrapped ? ', wrapped recap' : ''}{onOpenFxRates ? ', exchange rates' : ''} &amp; exports for {activeTrip.name}.
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

          <div className="settings-row-item" style={{ cursor: 'default' }}>
            <div className="settings-row-left">
              <div className="settings-squircle squircle-orange-glow">
                <IconBell size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Mute Trip Alerts</span>
                <span className="settings-row-subtitle">Silence push notifications for this trip</span>
              </div>
            </div>
            <div className="settings-row-right">
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isTripMuted}
                  onChange={(e) => {
                    triggerHaptic('light');
                    onToggleMute(e.target.checked);
                  }}
                  aria-label="Mute Notifications"
                  style={{ opacity: 0, width: 0, height: 0, margin: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: isTripMuted ? '#17B6A6' : 'var(--border-color)',
                    transition: '0.2s ease',
                    borderRadius: 'var(--border-radius-pill)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '18px',
                      width: '18px',
                      left: isTripMuted ? '23px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.2s ease',
                      borderRadius: '50%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {onOpenTripWrapped && (
            <SettingsCell
              icon={<span style={{ fontSize: '18px' }}>✨</span>}
              iconGlow="amber"
              title="Trip Wrapped & Highlights"
              subtitle="Infographic story card, superlatives & journey recap"
              badge="STORY"
              onClick={() => {
                triggerHaptic('light');
                onOpenTripWrapped();
              }}
            />
          )}

          {onOpenFxRates && (
            <SettingsCell
              icon={<span style={{ fontSize: '18px' }}>💱</span>}
              iconGlow="emerald"
              title="Multi-Currency FX Engine"
              subtitle="Live rates, offline lock & forex markup converter"
              badge="FX"
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
              hasDivider={false}
              onClick={onExportCsv}
            />
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
