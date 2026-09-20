import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Ensure globalThis.window is defined for Node.js test environment
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {} as unknown as Window & typeof globalThis;
}

import {
  isWebNotificationSupported,
  getWebNotificationPermission,
  requestWebNotificationPermission,
  showBrowserNotification,
} from './webNotifications';

describe('webNotifications utility', () => {
  const originalNotification = (globalThis.window as any).Notification;

  const setWindowNotification = (val: unknown) => {
    if (val === undefined) {
      delete (globalThis.window as any).Notification;
      delete (globalThis as any).Notification;
    } else {
      (globalThis.window as any).Notification = val;
      (globalThis as any).Notification = val;
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setWindowNotification(originalNotification);
  });

  it('detects when Notification is supported in web context', () => {
    setWindowNotification(undefined);
    expect(isWebNotificationSupported()).toBe(false);

    setWindowNotification({ permission: 'default' });
    expect(isWebNotificationSupported()).toBe(true);
  });

  it('returns current permission or null when unsupported', () => {
    const mockNotification = {
      permission: 'granted' as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
    setWindowNotification(mockNotification);

    expect(isWebNotificationSupported()).toBe(true);
    expect(getWebNotificationPermission()).toBe('granted');
  });

  it('returns null if Notification is undefined', () => {
    setWindowNotification(undefined);

    expect(isWebNotificationSupported()).toBe(false);
    expect(getWebNotificationPermission()).toBe(null);
  });

  it('requests permission and returns the resulting permission string', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    const mockNotification = {
      permission: 'default' as NotificationPermission,
      requestPermission: requestPermissionMock,
    };
    setWindowNotification(mockNotification);

    const res = await requestWebNotificationPermission();
    expect(res).toBe('granted');
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
  });

  it('safely catches error when requestPermission throws', async () => {
    const requestPermissionMock = vi.fn().mockRejectedValue(new Error('User denied'));
    const mockNotification = {
      permission: 'denied' as NotificationPermission,
      requestPermission: requestPermissionMock,
    };
    setWindowNotification(mockNotification);

    const res = await requestWebNotificationPermission();
    expect(res).toBe('denied');
  });

  it('shows browser notification when permission is granted', () => {
    const notificationConstructor = vi.fn();
    // @ts-expect-error mock Notification
    notificationConstructor.permission = 'granted';
    setWindowNotification(notificationConstructor);

    showBrowserNotification('New Expense', 'Alice added Lunch');
    expect(notificationConstructor).toHaveBeenCalledWith(
      'New Expense',
      expect.objectContaining({ body: 'Alice added Lunch' })
    );
  });

  it('does not fire browser notification when permission is not granted', () => {
    const notificationConstructor = vi.fn();
    // @ts-expect-error mock Notification
    notificationConstructor.permission = 'denied';
    setWindowNotification(notificationConstructor);

    showBrowserNotification('New Expense', 'Alice added Lunch');
    expect(notificationConstructor).not.toHaveBeenCalled();
  });
});
