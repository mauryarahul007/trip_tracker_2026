import { IconBell, IconClipboardList } from '../Icons';
import { SettingsCell } from '../common/SettingsCell';
import { SettingsToggleRow } from '../common/SettingsSwitch';
import type { QuietHoursPreference } from '../../services/quietHoursApi';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  unreadCount: number;
  onOpenInbox: () => void;
  showMute: boolean;
  muted: boolean;
  onToggleMute: (next: boolean) => void;
  showDigest: boolean;
  digestOn: boolean;
  onToggleDigest: (next: boolean) => void;
  showQuiet: boolean;
  quiet: QuietHoursPreference;
  quietBusy: boolean;
  onToggleQuiet: (enabled: boolean) => void;
  onQuietStart: (value: string) => void;
  onQuietEnd: (value: string) => void;
  showPassReminders: boolean;
  passRemindersOn: boolean;
  onTogglePassReminders: (next: boolean) => void;
};

export function SettingsNotificationsScreen({
  parentTitle,
  onBack,
  unreadCount,
  onOpenInbox,
  showMute,
  muted,
  onToggleMute,
  showDigest,
  digestOn,
  onToggleDigest,
  showQuiet,
  quiet,
  quietBusy,
  onToggleQuiet,
  onQuietStart,
  onQuietEnd,
  showPassReminders,
  passRemindersOn,
  onTogglePassReminders,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Notifications"
      subtitle="Inbox, quiet hours, and reminders."
    >
      <div className="settings-group">
        <div className="settings-group-card">
          <SettingsCell
            icon={<IconBell size={18} />}
            title="Inbox"
            subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            onClick={onOpenInbox}
          />
          {showMute && (
            <SettingsToggleRow
              icon={<IconBell size={18} />}
              title="Mute this trip"
              subtitle="No push alerts for this trip"
              checked={muted}
              onChange={onToggleMute}
              label="Mute this trip"
            />
          )}
          {showDigest && (
            <SettingsToggleRow
              icon={<IconClipboardList size={18} />}
              title="Daily digest"
              subtitle="One summary instead of a push per event"
              checked={digestOn}
              onChange={onToggleDigest}
              label="Daily digest"
            />
          )}
          {showQuiet && (
            <SettingsToggleRow
              icon={<IconBell size={18} />}
              title="Quiet hours"
              subtitle={quiet.enabled ? `${quiet.startTime}–${quiet.endTime}` : 'Pause push during a window'}
              checked={quiet.enabled}
              onChange={onToggleQuiet}
              label="Quiet hours"
              disabled={quietBusy}
            >
              {quiet.enabled && (
                <div className="settings-quiet-times">
                  <input
                    type="time"
                    className="input-field"
                    value={quiet.startTime}
                    aria-label="Quiet hours start"
                    onChange={(e) => onQuietStart(e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    className="input-field"
                    value={quiet.endTime}
                    aria-label="Quiet hours end"
                    onChange={(e) => onQuietEnd(e.target.value)}
                  />
                </div>
              )}
            </SettingsToggleRow>
          )}
          {showPassReminders && (
            <SettingsToggleRow
              icon={<IconClipboardList size={18} />}
              title="Pass reminders"
              subtitle="24h before departure, 3h for flights and trains"
              checked={passRemindersOn}
              onChange={onTogglePassReminders}
              label="Pass reminders"
            />
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
