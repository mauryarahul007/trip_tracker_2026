import { describe, expect, it } from 'vitest';
import type { AppNotification } from '../types';
import { groupNotificationBursts, isMoneyNotification } from './notificationGroups';

const n = (id: string, type: string, minutesAgo: number, sender = 'Riya', tripId = 't1'): AppNotification => ({
  id, tripId, title: '', body: '', read: false,
  data: { type, senderName: sender },
  createdAt: new Date(Date.UTC(2026, 8, 27, 12, 0) - minutesAgo * 60_000).toISOString(),
});

describe('groupNotificationBursts', () => {
  it('folds same trip + type + sender within an hour, keeps order', () => {
    const groups = groupNotificationBursts([
      n('a', 'expense_added', 0), n('b', 'expense_added', 10), n('c', 'expense_added', 50),
      n('d', 'member_joined', 55),
      n('e', 'expense_added', 200),
    ]);
    expect(groups.map((g) => g.map((x) => x.id))).toEqual([['a', 'b', 'c'], ['d'], ['e']]);
  });
  it('never folds chat, other senders or other trips', () => {
    const groups = groupNotificationBursts([
      n('a', 'chat_message', 0), n('b', 'chat_message', 1),
      n('c', 'expense_added', 2, 'Riya'), n('d', 'expense_added', 3, 'Aman'),
      n('e', 'expense_added', 4, 'Aman', 't2'),
    ]);
    expect(groups).toHaveLength(5);
  });
});

describe('isMoneyNotification', () => {
  it('flags settlement types only', () => {
    expect(isMoneyNotification(n('a', 'settlement_reminder', 0))).toBe(true);
    expect(isMoneyNotification(n('b', 'expense_added', 0))).toBe(false);
  });
});
