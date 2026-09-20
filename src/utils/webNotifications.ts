import { Capacitor } from '@capacitor/core';

// Native already has its own FCM-based push path (see pushRegistration.ts)
// — this is strictly the browser fallback for "while a tab is open",
// scoped to web so the two never double-fire on the same event.
export function isWebNotificationSupported(): boolean {
  return !Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window;
}

export function getWebNotificationPermission(): NotificationPermission | null {
  return isWebNotificationSupported() ? window.Notification.permission : null;
}

export async function requestWebNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isWebNotificationSupported()) return null;
  try {
    return await window.Notification.requestPermission();
  } catch (err) {
    console.warn('Failed to request web notification permission:', err);
    return typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : null;
  }
}

export function showBrowserNotification(title: string, body: string): void {
  if (!isWebNotificationSupported() || window.Notification.permission !== 'granted') return;
  try {
    const notification = new window.Notification(title, { body, icon: `${import.meta.env.BASE_URL}favicon.svg` });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    // Some browsers (notably iOS Safari outside a PWA install) throw on
    // `new Notification(...)` even when permission reads "granted" —
    // this is best-effort UI polish, never worth surfacing to the user.
    console.error('Failed to show browser notification', err);
  }
}
