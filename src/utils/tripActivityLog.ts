import type { AppNotification, Expense, Member, TripMessage } from '../types';

const MAX_LOG_ITEMS = 200;
const EDIT_GAP_MS = 60 * 1000;

/**
 * Builds the unified trip activity log, combining local expenses (including refunds
 * and settlements), recycled items, messages, and incoming push notifications.
 * Skips items that notifications already cover so nothing appears duplicated.
 */
export function buildTripActivityLog({
  tripId,
  expenses,
  recycled = [],
  messages = [],
  members = {},
  notifications = [],
}: {
  tripId: string;
  expenses: Expense[];
  recycled?: Expense[];
  messages?: TripMessage[];
  members?: Record<string, Member> | Member[];
  notifications?: AppNotification[];
}): AppNotification[] {
  const seen = new Set<string>();
  const out: AppNotification[] = [];

  for (const n of notifications) {
    if (n.tripId === tripId) {
      out.push(n);
      const type = n.data?.type;
      const keyItem = n.data?.expenseTitle || n.data?.preview;
      if (type && keyItem) {
        seen.add(`${type}|${keyItem}`);
      }
    }
  }

  const memberMap: Record<string, string> = Array.isArray(members)
    ? Object.fromEntries(members.map((m) => [m.id, m.name]))
    : Object.fromEntries(Object.entries(members).map(([k, v]) => [k, v.name]));

  const add = (
    id: string,
    type: string,
    atMs: number,
    data: Record<string, string>,
    body = ''
  ) => {
    const key = `${type}|${data.expenseTitle || data.preview || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: `log-${id}`,
      tripId,
      title: '',
      body,
      data: { type, ...data },
      read: true,
      createdAt: new Date(atMs).toISOString(),
    });
  };

  for (const e of expenses) {
    if (e.tripId !== tripId) continue;
    const isRefundItem = Boolean(e.refundOfExpenseId);
    const moneyData: Record<string, string> = {
      expenseTitle: e.title,
      amount: String(e.amount),
      currency: e.currency,
      targetKind: 'expense',
      targetId: e.id,
    };
    add(
      `add-${e.id}`,
      isRefundItem ? 'expense_refunded' : (e.isSettlement ? 'settlement' : 'expense_added'),
      e.createdAt,
      moneyData
    );
    if (!isRefundItem && !e.isSettlement && e.updatedAt && e.createdAt && e.updatedAt - e.createdAt > EDIT_GAP_MS) {
      add(`edit-${e.id}`, 'expense_updated', e.updatedAt, moneyData);
    }
  }

  for (const e of recycled) {
    if (e.tripId === tripId && e.deletedAt) {
      add(`del-${e.id}`, 'expense_deleted', e.deletedAt, {
        expenseTitle: e.title,
        amount: String(e.amount),
        currency: e.currency,
        targetKind: 'bin',
        targetId: e.id,
      });
    }
  }

  for (const m of messages) {
    if (m.tripId !== tripId || m.deletedAt || (m.kind && m.kind !== 'text')) continue;
    add(`msg-${m.id}`, 'chat_message', m.createdAt, {
      senderName: memberMap[m.memberId] || 'Someone',
      preview: m.body,
      targetKind: 'message',
      targetId: m.id,
    });
  }

  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out.slice(0, MAX_LOG_ITEMS);
}
