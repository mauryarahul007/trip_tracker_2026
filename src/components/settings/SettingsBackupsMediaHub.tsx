import { IconDatabase } from '../Icons';
import { SettingsCell } from '../common/SettingsCell';
import { triggerHaptic } from '../../utils/haptics';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  isSuperadmin: boolean;
  onOpenOfflineSnapshot?: () => void;
  onOpenMediaGallery?: () => void;
  onOpenBackups: () => void;
};

export function SettingsBackupsMediaHub({
  parentTitle,
  onBack,
  isSuperadmin,
  onOpenOfflineSnapshot,
  onOpenMediaGallery,
  onOpenBackups,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Backups & Media"
      subtitle="Export offline backups, browse trip media, or pull a raw database snapshot."
    >
      <div className="settings-group">
        <div className="settings-group-card">
          {onOpenOfflineSnapshot && (
            <SettingsCell
              icon={<span style={{ fontSize: '18px' }}>💾</span>}
              iconGlow="blue"
              title="Offline Snapshot (.triptracker)"
              subtitle="Export and restore 100% offline trip backups"
              badge="BACKUP"
              onClick={() => {
                triggerHaptic('light');
                onOpenOfflineSnapshot();
              }}
            />
          )}

          {onOpenMediaGallery && (
            <SettingsCell
              icon={<span style={{ fontSize: '18px' }}>📸</span>}
              iconGlow="teal"
              title="Receipts & Memories Gallery"
              subtitle="Browse cached receipt photos and trip media"
              badge="PHOTOS"
              onClick={() => {
                triggerHaptic('light');
                onOpenMediaGallery();
              }}
            />
          )}

          {isSuperadmin && (
            <SettingsCell
              icon={<IconDatabase size={18} />}
              iconGlow="indigo"
              title="Database Backups"
              subtitle="Export/Import JSON database snapshot"
              badge="JSON"
              hasDivider={false}
              onClick={onOpenBackups}
            />
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
