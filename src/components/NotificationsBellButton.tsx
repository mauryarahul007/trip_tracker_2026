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
      className="secondary-btn"
      style={{
        padding: '7px',
        color: '#F2ECDC',
        borderColor: 'rgba(242,236,220,0.28)',
        background: 'rgba(242,236,220,0.06)',
        position: 'relative',
      }}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      onClick={openPanel}
    >
      <IconBell size={15} className="icon-sm" />
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-3px',
            right: '-3px',
            minWidth: '15px',
            height: '15px',
            padding: '0 3px',
            borderRadius: 'var(--border-radius-pill)',
            background: 'var(--color-danger)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
