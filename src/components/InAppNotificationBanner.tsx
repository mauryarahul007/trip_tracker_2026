import { useEffect, useRef, useState } from 'react';
import { useNotificationsStore } from '../store/notificationsStore';
import { renderNotificationBody, getNotificationHeadline } from '../utils/notificationText';
import { getNotificationMeta } from './NotificationsPanel';

// Native equivalent of showBrowserNotification (see webNotifications.ts) —
// real push (APNs) isn't available on the free personal-team dev builds
// this app is signed with, so this rides the same Realtime subscription
// that already drives the panel, and only fires while the app is open.
const AUTO_DISMISS_MS = 5000;
const SWIPE_DISMISS_THRESHOLD = 40;

export function InAppNotificationBanner() {
  const banner = useNotificationsStore((s) => s.activeBanner);
  const dismissBanner = useNotificationsStore((s) => s.dismissBanner);
  const openPanel = useNotificationsStore((s) => s.openPanel);

  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!banner) return;
    setDragY(0);
    draggingRef.current = false;
    const timer = setTimeout(() => dismissBanner(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [banner, dismissBanner]);

  if (!banner) return null;

  const type = banner.data?.type;
  const { icon, colorClass } = getNotificationMeta(type);
  const headline = getNotificationHeadline(type);
  const body = renderNotificationBody(banner);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    draggingRef.current = false;
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta < 0) {
      draggingRef.current = true;
      setDragY(delta);
    }
  };
  const handlePointerUp = () => {
    if (dragY < -SWIPE_DISMISS_THRESHOLD) {
      dismissBanner();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  };
  const handleTap = () => {
    if (draggingRef.current) return;
    openPanel();
    dismissBanner();
  };

  return (
    <div
      className="in-app-notif-banner"
      style={{ transform: `translateY(${dragY}px)`, opacity: dragY < 0 ? Math.max(0, 1 + dragY / 100) : 1 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleTap}
      role="alert"
    >
      <span className={`notif-squircle ${colorClass}`} aria-hidden="true">{icon}</span>
      <span className="in-app-notif-banner-text">
        <strong>{headline}</strong>
        <span>{body}</span>
      </span>
    </div>
  );
}
