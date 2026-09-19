import { useEffect, useRef } from 'react';
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

  const bannerRef = useRef<HTMLDivElement>(null);
  const dragYRef = useRef(0);
  const dragStartY = useRef<number | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!banner) return;
    dragYRef.current = 0;
    draggingRef.current = false;
    if (bannerRef.current) {
      bannerRef.current.style.transform = 'translateY(0px)';
      bannerRef.current.style.opacity = '1';
    }
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
      dragYRef.current = delta;
      if (bannerRef.current) {
        bannerRef.current.style.transform = `translateY(${delta}px)`;
        bannerRef.current.style.opacity = String(Math.max(0, 1 + delta / 100));
      }
    }
  };
  const handlePointerUp = () => {
    if (dragYRef.current < -SWIPE_DISMISS_THRESHOLD) {
      dismissBanner();
    } else if (bannerRef.current) {
      bannerRef.current.style.transform = 'translateY(0px)';
      bannerRef.current.style.opacity = '1';
    }
    dragYRef.current = 0;
    dragStartY.current = null;
  };
  const handleTap = () => {
    if (draggingRef.current) return;
    openPanel();
    dismissBanner();
  };

  return (
    <div
      ref={bannerRef}
      className="in-app-notif-banner"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          dismissBanner();
        }
      }}
      tabIndex={0}
      role="alert"
      aria-label={`${headline}: ${body}. Press Enter to view notifications, Escape to dismiss.`}
    >
      <span className={`notif-squircle ${colorClass}`} aria-hidden="true">{icon}</span>
      <span className="in-app-notif-banner-text">
        <strong>{headline}</strong>
        <span>{body}</span>
      </span>
    </div>

  );
}
