import { useRef, useState } from 'react';
import type { AppNotification } from '../types';
import { useNotificationsStore } from '../store/notificationsStore';
import { getWebNotificationPermission, requestWebNotificationPermission } from '../utils/webNotifications';
import { IconClose, IconTrash } from './Icons';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

const SWIPE_DELETE_THRESHOLD = 80;

function SwipeableNotificationRow({ notification, onOpen, onDelete }: { notification: AppNotification; onOpen: () => void; onDelete: () => void }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const directionRef = useRef<'horizontal' | 'vertical' | null>(null);

  const handleStart = (x: number, y: number) => {
    startRef.current = { x, y };
    directionRef.current = null;
    setDragging(true);
  };

  const handleMove = (x: number, y: number): boolean => {
    if (!startRef.current) return false;
    const dx = x - startRef.current.x;
    const dy = y - startRef.current.y;

    if (directionRef.current === null) {
      // Wait for enough movement to confidently tell a horizontal swipe
      // (delete gesture) apart from a vertical one (the panel's own list
      // scroll) — deciding too early on a near-diagonal drag picks the
      // wrong one.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
      directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (directionRef.current !== 'horizontal') return false;

    setDragX(Math.min(0, dx));
    return true; // signals the caller to suppress native scroll/selection
  };

  const handleEnd = () => {
    if (directionRef.current === 'horizontal' && dragX < -SWIPE_DELETE_THRESHOLD) {
      onDelete();
    } else {
      setDragX(0);
    }
    setDragging(false);
    startRef.current = null;
    directionRef.current = null;
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--border-radius-sm)' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 16px',
          background: 'var(--color-danger)',
          color: '#fff',
        }}
      >
        <IconTrash size={16} className="icon-sm" />
      </div>
      <div
        className="glass-card"
        onClick={() => dragX === 0 && onOpen()}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => {
          if (handleMove(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault();
        }}
        onTouchEnd={handleEnd}
        onPointerDown={(e) => handleStart(e.clientX, e.clientY)}
        onPointerMove={(e) => {
          if (startRef.current) handleMove(e.clientX, e.clientY);
        }}
        onPointerUp={handleEnd}
        onPointerLeave={() => startRef.current && handleEnd()}
        style={{
          position: 'relative',
          padding: '12px 14px',
          cursor: notification.read ? 'default' : 'pointer',
          background: notification.read ? undefined : 'rgba(31,110,104,0.06)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
      >
        {!notification.read && (
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--primary-accent)',
              flexShrink: 0,
              marginTop: '5px',
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: notification.read ? 500 : 700 }}>{notification.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{notification.body}</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>{relativeTime(notification.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

// Rendered once at the App root regardless of platform — opened either by
// NotificationsBellButton (web header) or the "Notifications" row in
// Settings (both platforms), both of which just flip isPanelOpen in the
// shared store rather than owning their own open state.
export function NotificationsPanel() {
  const isPanelOpen = useNotificationsStore((s) => s.isPanelOpen);
  const closePanel = useNotificationsStore((s) => s.closePanel);
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markAsRead = useNotificationsStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead);
  const deleteOne = useNotificationsStore((s) => s.deleteOne);
  const [permission, setPermission] = useState(getWebNotificationPermission());
  const sheetRef = useRef<HTMLDivElement>(null);

  if (!isPanelOpen) return null;

  return (
    <div className="modal-backdrop" onClick={closePanel}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))' }}>
          <div className="app-header-top">
            <div className="app-title-group">
              <h2 id="notifications-panel-title" className="app-logo" style={{ fontSize: '22px', color: '#F2ECDC' }}>
                Notifications
              </h2>
            </div>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '7px 8px', color: '#F2ECDC', borderColor: 'rgba(242,236,220,0.28)', background: 'rgba(242,236,220,0.06)', flexShrink: 0 }}
              aria-label="Close"
              title="Close"
              onClick={closePanel}
            >
              <IconClose size={16} className="icon-sm" />
            </button>
          </div>
        </header>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            style={{
              display: 'block',
              marginLeft: 'auto',
              marginBottom: '12px',
              background: 'none',
              border: 'none',
              color: 'var(--primary-accent)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Mark all read
          </button>
        )}

        {permission !== 'granted' && (
          <button
            type="button"
            onClick={async () => setPermission(await requestWebNotificationPermission())}
            style={{
              width: '100%',
              marginBottom: '16px',
              padding: '10px 12px',
              fontSize: '13px',
              textAlign: 'left',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface-hover)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            🔔 Enable browser alerts for new notifications while a tab is open
          </button>
        )}

        {notifications.length === 0 ? (
          <p style={{ padding: '32px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Nothing here yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map((n) => (
              <SwipeableNotificationRow
                key={n.id}
                notification={n}
                onOpen={() => markAsRead(n.id)}
                onDelete={() => deleteOne(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
