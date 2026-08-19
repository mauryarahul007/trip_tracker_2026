import type { AppNotification } from '../types';

// Mirrored in supabase/functions/send-push/index.ts's renderNotification
// (Deno, for the FCM push payload) — two small independent copies rather
// than a shared package across the browser/Deno runtime split, since a
// single switch statement is far cheaper to keep in sync by hand than a
// cross-runtime module would be worth for an app this size.
export function renderNotificationBody(notification: AppNotification): string {
  const data = notification.data;
  const type = data?.type;
  switch (type) {
    case 'expense_added':
      return `${data?.expenseTitle} — ${data?.currency} ${data?.amount} added`;
    case 'expense_updated':
      return `${data?.expenseTitle} was updated`;
    case 'expense_deleted':
      return `${data?.expenseTitle} was deleted`;
    case 'expense_restored':
      return `${data?.expenseTitle} was restored`;
    case 'member_added':
      return `You were added to ${notification.title || 'a trip'}`;
    case 'member_added_notice':
      return `${data?.memberName} was added to the trip`;
    case 'member_joined':
      return `${data?.memberName} joined the trip`;
    case 'settlement_reminder':
      return `You owe ${data?.toLabel} ${data?.currency}${data?.amount} for this trip`;
    case 'trip_deleted':
      return `${notification.title || 'A trip'} was deleted`;
    default:
      // Rows written before this rendering scheme existed still have a
      // real sentence in body — fall back to it rather than showing
      // nothing for older notifications.
      return notification.body || 'You have a new notification';
  }
}
