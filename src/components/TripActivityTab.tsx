import type { AppNotification } from '../types';
import { NotificationCard } from './NotificationsPanel';
import { IconBell, IconCheck, IconTrash } from './Icons';

type Props = {
  notifications: AppNotification[];
  onOpen: (n: AppNotification) => void;
  onToggleRead: (n: AppNotification) => void;
  onDelete: (n: AppNotification) => void;
  onMarkAllRead: () => void;
  onDeleteAll: () => void;
};

/**
 * Calm Passport Activity tab (flag `enableCalmPassportUi`): this trip's own notifications only,
 * newest first, with mark-all/delete-all. A lighter port of
 * flutter_app/lib/features/notifications/presentation/trip_activity_pane.dart --
 * ponytail: the filter chips (All/Unread/Money/People/Chat) and the merged activity log
 * (expense edits, settlements, joins, chat all folded into one timeline, not just push
 * notifications) are not ported yet; add them if trip-scoped filtering is actually needed.
 */
export function TripActivityTab({ notifications, onOpen, onToggleRead, onDelete, onMarkAllRead, onDeleteAll }: Props) {
  const sorted = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = sorted.filter((n) => !n.read).length;

  return (
    <div className="fade-in" style={{ padding: '0 0 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          {unreadCount === 0 ? 'Activity' : `Activity · ${unreadCount} new`}
        </h2>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className="notif-row-action-btn notif-btn-read"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            title="Mark all as read"
            aria-label="Mark all as read"
          >
            <IconCheck size={15} />
          </button>
          <button
            type="button"
            className="notif-row-action-btn danger"
            onClick={onDeleteAll}
            disabled={sorted.length === 0}
            title="Delete all activity"
            aria-label="Delete all activity"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <IconBell size={28} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 4px' }}>No activity yet</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Expenses, settlements, new travelers and messages show up here.</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              isCurrentTrip
              onOpen={() => onOpen(n)}
              onToggleRead={() => onToggleRead(n)}
              onDelete={() => onDelete(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
