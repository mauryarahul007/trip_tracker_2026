import { useNotificationsStore } from '../store/notificationsStore';
import { IconBell } from './Icons';

// Web-only trigger — lives inside .trip-dashboard-header, which is hidden
// entirely on native (see html.capacitor-ios rule in index.css) in favor
// of the real native header. Native reaches the same panel via the
// "Notifications" row in Settings instead (see SettingsView.tsx) — the
// modal itself (NotificationsPanel) is rendered once at the App root, not
// nested here, so either entry point opens the same instance.
export function NotificationsBellButton() {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const openPanel = useNotificationsStore((s) => s.openPanel);

  return (
    <button
      type="button"
      className="header-action-circle-btn"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      onClick={openPanel}
    >
      <IconBell size={16} />
      {unreadCount > 0 && (
        <span className="header-action-badge">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
