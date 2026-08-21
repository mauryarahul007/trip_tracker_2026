import { Capacitor } from '@capacitor/core';

// Native already has its own FCM-based push path (see pushRegistration.ts)
// — this is strictly the browser fallback for "while a tab is open",
// scoped to web so the two never double-fire on the same event.
export function isWebNotificationSupported(): boolean {
  return !Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window;
}

export function getWebNotificationPermission(): NotificationPermission | null {
  return isWebNotificationSupported() ? Notification.permission : null;
}

export async function requestWebNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isWebNotificationSupported()) return null;
  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string): void {
  if (!isWebNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    const notification = new Notification(title, { body, icon: `${import.meta.env.BASE_URL}favicon.svg` });
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
