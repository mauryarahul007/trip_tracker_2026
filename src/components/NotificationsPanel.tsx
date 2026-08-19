import React, { useRef, useState } from 'react';
import type { AppNotification } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import { useNotificationsStore } from '../store/notificationsStore';
import { useTripStore } from '../store/tripStore';
import { useHistoryBack } from '../utils/useHistoryBack';
import { getWebNotificationPermission, requestWebNotificationPermission } from '../utils/webNotifications';
import {
  IconClose,
  IconTrash,
  IconCheck,
  IconCheckCircle,
  IconExpenses,
  IconMembers,
  IconBell,
  IconEdit,
  IconSparkles,
  IconMail,
} from './Icons';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  return `${diffDay}d ago`;
}

function getNotificationMeta(type?: string): { icon: React.ReactNode; colorClass: string } {
  switch (type) {
    case 'expense_added':
      return { icon: <IconExpenses size={17} />, colorClass: 'squircle-teal' };
    case 'expense_updated':
      return { icon: <IconEdit size={17} />, colorClass: 'squircle-amber' };
    case 'expense_deleted':
    case 'trip_deleted':
      return { icon: <IconTrash size={17} />, colorClass: 'squircle-rose' };
    case 'expense_restored':
      return { icon: <IconSparkles size={17} />, colorClass: 'squircle-emerald' };
    case 'member_added':
    case 'member_joined':
      return { icon: <IconMembers size={17} />, colorClass: 'squircle-purple' };
    case 'settlement':
    case 'settle':
    case 'settlement_reminder':
      return { icon: <IconCheckCircle size={17} />, colorClass: 'squircle-emerald' };
    default:
      return { icon: <IconBell size={17} />, colorClass: 'squircle-blue' };
  }
}

function getNotificationDisplay(
  notification: AppNotification,
  resolvedTripName: string | null
): { headline: string; badge: string | null; body: string } {
  const type = notification.data?.type;
  const rawTitle = (notification.title || '').trim();
  const rawBody = (notification.body || '').trim();

  const typeHeadlines: Record<string, string> = {
    expense_added: 'Expense Added',
    expense_updated: 'Expense Updated',
    expense_deleted: 'Expense Deleted',
    expense_restored: 'Expense Restored',
    trip_deleted: 'Trip Deleted',
    member_added: 'Member Added',
    member_joined: 'Member Joined',
    settlement_reminder: 'Settlement Reminder',
    settlement: 'Settlement Updated',
    settle: 'Settlement Updated',
  };

  // If push title has "Headline • TripName", extract the clean headline
  let headline = rawTitle;
  if (headline.includes('•')) {
    const parts = headline.split('•').map((s) => s.trim());
    if (parts[0]) headline = parts[0];
  }

  // If headline is identical to the tripName (historical data) or generic, use smart action headline
  const isGenericOrTripName =
    !headline ||
    headline.toLowerCase() === 'trip tracker' ||
    (resolvedTripName && headline.toLowerCase() === resolvedTripName.toLowerCase());

  if (isGenericOrTripName) {
    if (type && typeHeadlines[type]) {
      headline = typeHeadlines[type];
    } else if (rawBody.toLowerCase().includes('was deleted')) {
      headline = rawBody.toLowerCase().includes('trip') ? 'Trip Deleted' : 'Expense Deleted';
    } else if (rawBody.toLowerCase().includes('added')) {
      headline = 'Expense Added';
    } else if (rawBody.toLowerCase().includes('joined')) {
      headline = 'Member Joined';
    } else if (rawBody.toLowerCase().includes('owe')) {
      headline = 'Settlement Reminder';
    } else {
      headline = 'Notification';
    }
  }

  let formattedBody = rawBody;
  if (type === 'trip_deleted' && resolvedTripName && rawBody === `${resolvedTripName} was deleted`) {
    formattedBody = `"${resolvedTripName}" was deleted`;
  }

  const badge =
    resolvedTripName && resolvedTripName.toLowerCase() !== headline.toLowerCase()
      ? resolvedTripName
      : null;

  return { headline, badge, body: formattedBody };
}

const SWIPE_DELETE_THRESHOLD = 75;

function NotificationCard({
  notification,
  tripName,
  isCurrentTrip,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  notification: AppNotification;
  tripName?: string | null;
  isCurrentTrip: boolean;
  onOpen: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
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
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
      directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (directionRef.current !== 'horizontal') return false;

    setDragX(Math.min(0, dx));
    return true;
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

  const meta = getNotificationMeta(notification.data?.type);

  return (
    <div className="notif-swipe-container">
      {/* Swipe reveal action */}
      <div className="notif-swipe-delete-action" aria-hidden="true">
        <IconTrash size={17} />
      </div>

      <div
        className={`notif-card ${!notification.read ? 'unread' : 'read'}`}
        onClick={() => {
          if (dragX === 0) onOpen();
        }}
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
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Left Squircle Avatar with quick Read/Unread click */}
        <div
          className="notif-avatar-wrap"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead();
          }}
          title={notification.read ? 'Mark as unread' : 'Mark as read'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              onToggleRead();
            }
          }}
        >
          <div className={`notif-squircle ${meta.colorClass}`}>
            {meta.icon}
          </div>
          {!notification.read && <span className="notif-unread-dot" />}
        </div>

        {/* Center Content */}
        {(() => {
          const display = getNotificationDisplay(notification, tripName ?? null);
          return (
            <div className="notif-body">
              <div className="notif-row-top">
                <div className="notif-title-wrap">
                  <h4 className="notif-card-title">{display.headline}</h4>
                  {display.badge && (
                    <span className={`notif-trip-badge ${isCurrentTrip ? 'current' : 'other'}`}>
                      {display.badge}
                    </span>
                  )}
                </div>
                <span className="notif-time">{relativeTime(notification.createdAt)}</span>
              </div>
              <p className="notif-card-text">{display.body}</p>
            </div>
          );
        })()}

        {/* Actions Toolbar for Read/Unread and Delete */}
        <div className="notif-hover-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`notif-row-action-btn ${notification.read ? 'notif-btn-unread' : 'notif-btn-read'}`}
            onClick={onToggleRead}
            title={notification.read ? 'Mark as unread' : 'Mark as read'}
            aria-label={notification.read ? 'Mark as unread' : 'Mark as read'}
          >
            {notification.read ? <IconMail size={13} /> : <IconCheck size={13} />}
          </button>
          <button
            type="button"
            className="notif-row-action-btn danger"
            onClick={onDelete}
            title="Delete notification"
            aria-label="Delete notification"
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPanel({
  onRequestConfirm,
}: {
  onRequestConfirm?: (req: ConfirmRequest) => void;
} = {}) {
  const isPanelOpen = useNotificationsStore((s) => s.isPanelOpen);
  const closePanel = useNotificationsStore((s) => s.closePanel);
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const markAsRead = useNotificationsStore((s) => s.markAsRead);
  const toggleRead = useNotificationsStore((s) => s.toggleRead);
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead);
  const deleteOne = useNotificationsStore((s) => s.deleteOne);
  const clearAll = useNotificationsStore((s) => s.clearAll);
  const [permission, setPermission] = useState(getWebNotificationPermission());
  const sheetRef = useRef<HTMLDivElement>(null);

  // Multi-Trip Filter State (Option C Hybrid)
  const activeTripId = useTripStore((s) => s.activeTripId);
  const trips = useTripStore((s) => s.trips);
  const activeTrip = trips.find((t) => t.id === activeTripId);

  const [tripFilter, setTripFilter] = useState<'current' | 'all'>(activeTripId ? 'current' : 'all');

  // Stack navigation: swipe/browser back closes notifications panel
  useHistoryBack(isPanelOpen, closePanel);

  if (!isPanelOpen) return null;

  // Filtered notifications
  const displayedNotifications =
    tripFilter === 'current' && activeTripId
      ? notifications.filter((n) => n.tripId === activeTripId)
      : notifications;

  const currentTripUnreadCount = activeTripId
    ? notifications.filter((n) => n.tripId === activeTripId && !n.read).length
    : 0;

  const displayedUnreadCount =
    tripFilter === 'current' && activeTripId ? currentTripUnreadCount : unreadCount;

  const handleOpenNotification = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.tripId && n.tripId !== useTripStore.getState().activeTripId) {
      useTripStore.getState().selectTrip(n.tripId);
      closePanel();
    }
  };

  const handleMarkFilteredAsRead = () => {
    if (tripFilter === 'current' && activeTripId) {
      displayedNotifications.filter((n) => !n.read).forEach((n) => markAsRead(n.id));
    } else {
      markAllAsRead();
    }
  };

  const handleClearAll = () => {
    if (tripFilter === 'current' && activeTrip) {
      onRequestConfirm?.({
        title: 'Clear notifications',
        message: `Clear all notifications for "${activeTrip.name}"?`,
        confirmLabel: 'Clear',
        danger: true,
        onConfirm: () => displayedNotifications.forEach((n) => deleteOne(n.id)),
      });
    } else {
      onRequestConfirm?.({
        title: 'Clear all notifications',
        message: 'Are you sure you want to clear all notifications across all trips? This cannot be undone.',
        confirmLabel: 'Clear All',
        danger: true,
        onConfirm: () => clearAll(),
      });
    }
  };

  const getTripNameForNotification = (n: AppNotification): string | null => {
    if (n.data?.tripName) return n.data.tripName;
    if (n.tripId) {
      const matched = trips.find((t) => t.id === n.tripId);
      return matched?.name || null;
    }
    return null;
  };

  return (
    <div className="modal-backdrop notif-backdrop" onClick={closePanel}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="modal-sheet notif-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Top Row */}
        <div className="notif-header">
          <div className="notif-header-left">
            <div className="notif-title-group">
              <div className="notif-bell-icon-badge">
                <IconBell size={18} />
              </div>
              <h2 id="notifications-panel-title" className="notif-heading">
                Notifications
              </h2>
              {displayedUnreadCount > 0 && (
                <span className="notif-count-badge">
                  {displayedUnreadCount} new
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="notif-close-btn"
            onClick={closePanel}
            aria-label="Close notifications"
            title="Close"
          >
            <IconClose size={15} />
          </button>
        </div>

        {/* Sub-Header Toolbar & Filter Controls */}
        <div className="notif-controls-bar">
          {activeTrip ? (
            <div className="notif-filter-tabs">
              <button
                type="button"
                className={`notif-filter-tab ${tripFilter === 'current' ? 'active' : ''}`}
                onClick={() => setTripFilter('current')}
              >
                <span className="notif-filter-tab-label">Current Trip</span>
                {currentTripUnreadCount > 0 && (
                  <span className="notif-tab-count-badge">{currentTripUnreadCount}</span>
                )}
              </button>
              <button
                type="button"
                className={`notif-filter-tab ${tripFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTripFilter('all')}
              >
                <span className="notif-filter-tab-label">All Trips</span>
                {unreadCount > 0 && (
                  <span className="notif-tab-count-badge">{unreadCount}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="notif-controls-spacer" />
          )}

          {(displayedUnreadCount > 0 || displayedNotifications.length > 0) && (
            <div className="notif-header-actions">
              {displayedUnreadCount > 0 && (
                <button
                  type="button"
                  className="notif-toolbar-btn"
                  onClick={handleMarkFilteredAsRead}
                  title="Mark as read"
                >
                  <IconCheck size={13} />
                  <span className="notif-toolbar-btn-text">Mark read</span>
                </button>
              )}
              {displayedNotifications.length > 0 && (
                <button
                  type="button"
                  className="notif-toolbar-btn notif-toolbar-btn-danger"
                  onClick={handleClearAll}
                  title="Clear notifications"
                >
                  <IconTrash size={13} />
                  <span className="notif-toolbar-btn-text">
                    Clear {tripFilter === 'current' && activeTrip ? 'trip' : 'all'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Web Notification Alert Opt-In Banner */}
        {permission !== 'granted' && (
          <div className="notif-alert-banner">
            <div className="notif-alert-banner-left">
              <span className="notif-alert-icon">🔔</span>
              <div className="notif-alert-text">
                <strong className="notif-alert-title">Enable Live Alerts</strong>
                <span className="notif-alert-desc">Get browser alerts when friends add expenses or settle</span>
              </div>
            </div>
            <button
              type="button"
              className="notif-alert-enable-btn"
              onClick={async () => setPermission(await requestWebNotificationPermission())}
            >
              Enable
            </button>
          </div>
        )}

        {/* Content List or Empty State */}
        <div className="notif-content-area">
          {displayedNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-wrap">
                <IconSparkles size={28} />
              </div>
              <h4 className="notif-empty-title">
                {tripFilter === 'current' && activeTrip
                  ? `No Notifications for ${activeTrip.name}`
                  : "You're All Caught Up"}
              </h4>
              <p className="notif-empty-subtitle">
                {tripFilter === 'current' && activeTrip ? (
                  notifications.length > 0 ? (
                    <>
                      There are no notifications in this trip. You have {notifications.length} notification
                      {notifications.length > 1 ? 's' : ''} in other trips.{' '}
                      <button
                        type="button"
                        onClick={() => setTripFilter('all')}
                        className="notif-empty-switch-link"
                      >
                        View All Trips
                      </button>
                    </>
                  ) : (
                    'No notifications for this trip right now.'
                  )
                ) : (
                  'No notifications right now. When friends add expenses, update settlements, or join your trips, you\'ll see them right here.'
                )}
              </p>
            </div>
          ) : (
            <div className="notif-list">
              {displayedNotifications.map((n) => {
                const tripName = getTripNameForNotification(n);
                const isCurrentTrip = n.tripId === activeTripId;
                return (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    tripName={tripName}
                    isCurrentTrip={isCurrentTrip}
                    onOpen={() => handleOpenNotification(n)}
                    onToggleRead={() => toggleRead(n.id)}
                    onDelete={() => deleteOne(n.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
