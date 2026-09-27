import type { AppNotification } from '../types';

// enableNotificationGrouping helpers. Pure so they're easy to test.

export const MONEY_NOTIFICATION_TYPES = new Set([
  'settlement',
  'settle',
  'settlement_reminder',
  'settlement_confirmation_requested',
]);

export function isMoneyNotification(n: AppNotification): boolean {
  return MONEY_NOTIFICATION_TYPES.has(n.data?.type ?? '');
}

const BURST_WINDOW_MS = 60 * 60 * 1000;

/**
 * Folds runs of adjacent notifications (list is newest-first) that share a
 * trip, a type and a sender, each within an hour of the previous one, into
 * one group. Chat messages never fold -- each one is its own conversation.
 */
export function groupNotificationBursts(list: AppNotification[]): AppNotification[][] {
  const key = (n: AppNotification) =>
    `${n.tripId ?? ''}|${n.data?.type ?? ''}|${n.data?.senderName ?? n.data?.memberName ?? ''}`;
  const groups: AppNotification[][] = [];
  for (const n of list) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    if (
      prev &&
      n.data?.type !== 'chat_message' &&
      key(prev) === key(n) &&
      Math.abs(Date.parse(prev.createdAt) - Date.parse(n.createdAt)) <= BURST_WINDOW_MS
    ) {
      last.push(n);
    } else {
      groups.push([n]);
    }
  }
  return groups;
}
