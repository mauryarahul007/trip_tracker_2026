import { create } from 'zustand';
import type { AppNotification } from '../types';
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '../services/notificationsApi';
import { showBrowserNotification } from '../utils/webNotifications';
import { useTripStore } from './tripStore';

interface NotificationsStore {
  notifications: AppNotification[];
  unreadCount: number;
  userId: string | null;
  unsubscribe: (() => void) | null;
  isPanelOpen: boolean;

  initialize: (userId: string) => void;
  teardown: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteOne: (id: string) => void;
  clearAll: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  userId: null,
  unsubscribe: null,
  isPanelOpen: false,

  initialize: (userId) => {
    if (get().userId === userId) return;
    get().teardown();
    set({ userId });

    fetchNotifications(userId)
      .then((notifications) => {
        if (get().userId !== userId) return; // superseded by a sign-out/switch while in flight
        set({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
      })
      .catch((err) => console.error('Failed to fetch notifications', err));

    const unsubscribe = subscribeToNotifications(userId, (notification) => {
      set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
      showBrowserNotification(notification.title, notification.body);

      // Trip list is loaded once at boot with no other live signal for
      // "someone just added you to a trip" (or removed one) — without
      // this, the change silently doesn't show up until the next full
      // app relaunch.
      const notifType = notification.data?.type;
      if (notifType === 'member_added' || notifType === 'trip_deleted') {
        useTripStore.getState().refreshTrips();
      }

      // If the trip someone just deleted is the one currently open, its
      // data is gone server-side — leaving the user looking at it would
      // just mean broken refetches from here on, so back them out to the
      // trip list instead.
      if (notifType === 'trip_deleted' && notification.tripId === useTripStore.getState().activeTripId) {
        useTripStore.getState().selectTrip(null);
      }

      // Only worth refetching if this is the trip currently open — no
      // reason to eagerly pull expense data for a trip the user isn't
      // even looking at right now.
      const expenseChangeTypes = new Set(['expense_added', 'expense_updated', 'expense_deleted', 'expense_restored']);
      if (
        notification.tripId &&
        expenseChangeTypes.has(notifType ?? '') &&
        notification.tripId === useTripStore.getState().activeTripId
      ) {
        useTripStore.getState().refreshActiveTripExpenses();
      }
    });
    set({ unsubscribe });
  },

  teardown: () => {
    get().unsubscribe?.();
    set({ notifications: [], unreadCount: 0, userId: null, unsubscribe: null });
  },

  markAsRead: (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.read) return;
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    markNotificationRead(id).catch((err) => console.error('Failed to mark notification read', err));
  },

  markAllAsRead: () => {
    const userId = get().userId;
    if (!userId || get().unreadCount === 0) return;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    markAllNotificationsRead(userId).catch((err) => console.error('Failed to mark all notifications read', err));
  },

  deleteOne: (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target) return;
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      unreadCount: target.read ? state.unreadCount : Math.max(0, state.unreadCount - 1),
    }));
    deleteNotification(id).catch((err) => console.error('Failed to delete notification', err));
  },

  clearAll: () => {
    const userId = get().userId;
    if (!userId || get().notifications.length === 0) return;
    set({ notifications: [], unreadCount: 0 });
    deleteAllNotifications(userId).catch((err) => console.error('Failed to delete all notifications', err));
  },

  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
}));
