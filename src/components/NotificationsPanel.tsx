import React, { useRef, useState } from 'react';
import type { AppNotification } from '../types';
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
  IconMailOpen,
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
      return { icon: <IconTrash size={17} />, colorClass: 'squircle-rose' };
    case 'member_added':
    case 'member_joined':
      return { icon: <IconMembers size={17} />, colorClass: 'squircle-purple' };
    case 'settlement':
    case 'settle':
      return { icon: <IconCheckCircle size={17} />, colorClass: 'squircle-emerald' };
    default:
      return { icon: <IconBell size={17} />, colorClass: 'squircle-blue' };
  }
}

const SWIPE_DELETE_THRESHOLD = 75;

function NotificationCard({
  notification,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  notification: AppNotification;
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
        <div className="notif-body">
          <div className="notif-row-top">
            <h4 className="notif-card-title">{notification.title}</h4>
            <span className="notif-time">{relativeTime(notification.createdAt)}</span>
          </div>
          <p className="notif-card-text">{notification.body}</p>
        </div>

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

export function NotificationsPanel() {
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

  // Stack navigation: swipe/browser back closes notifications panel
  useHistoryBack(isPanelOpen, closePanel);

  if (!isPanelOpen) return null;

  const handleOpenNotification = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.tripId && n.tripId !== useTripStore.getState().activeTripId) {
      useTripStore.getState().selectTrip(n.tripId);
      closePanel();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
      clearAll();
    }
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
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <div className="notif-title-group">
              <div className="notif-bell-icon-badge">
                <IconBell size={18} />
              </div>
              <h2 id="notifications-panel-title" className="notif-heading">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="notif-count-badge">
                  {unreadCount} new
                </span>
              )}
            </div>
          </div>

          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-toolbar-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <IconCheck size={13} />
                <span>Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="notif-toolbar-btn notif-toolbar-btn-danger"
                onClick={handleClearAll}
                title="Clear all notifications"
              >
                <IconTrash size={13} />
                <span>Clear all</span>
              </button>
            )}
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
          {notifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-wrap">
                <IconSparkles size={28} />
              </div>
              <h4 className="notif-empty-title">You're All Caught Up</h4>
              <p className="notif-empty-subtitle">
                No notifications right now. When friends add expenses, update settlements, or join your trips, you'll see them right here.
              </p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onOpen={() => handleOpenNotification(n)}
                  onToggleRead={() => toggleRead(n.id)}
                  onDelete={() => deleteOne(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
