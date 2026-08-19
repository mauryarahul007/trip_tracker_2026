import type { AppNotification } from '../types';

function cleanFallbackBody(body: string | null | undefined, verb: string): string {
  if (!body) return 'Details unavailable';
  const trimmed = body.trim();
  if (verb === 'deleted') {
    const match = trimmed.match(/^"?(.+?)"?\s+was deleted$/i);
    if (match) return match[1];
  } else if (verb === 'updated') {
    const match = trimmed.match(/^"?(.+?)"?\s+was updated$/i);
    if (match) return match[1];
  } else if (verb === 'restored') {
    const match = trimmed.match(/^"?(.+?)"?\s+was restored$/i);
    if (match) return match[1];
  } else if (verb === 'added') {
    const match = trimmed.match(/^(.+?)\s+added$/i);
    if (match) return match[1];
  }
  return trimmed;
}

// In-app notification card body renderer.
// The in-app NotificationCard already renders an explicit action headline
// (e.g. 'Expense Deleted', 'Expense Added') and a trip name badge, so the
// body text focuses cleanly on the affected item details without repeating
// redundant action verbs that cause awkward line-clamping truncation (e.g. '... was...').
export function renderNotificationBody(notification: AppNotification): string {
  const data = notification.data;
  const type = data?.type;
  switch (type) {
    case 'expense_added':
      if (data?.expenseTitle && data?.currency && data?.amount) {
        return `${data.expenseTitle} — ${data.currency} ${parseFloat(data.amount).toFixed(2)}`;
      }
      if (data?.expenseTitle) {
        return data.expenseTitle;
      }
      return cleanFallbackBody(notification.body, 'added');
    case 'expense_updated':
      if (data?.expenseTitle) {
        return data.expenseTitle;
      }
      return cleanFallbackBody(notification.body, 'updated');
    case 'expense_deleted':
      if (data?.expenseTitle) {
        if (data.currency && data.amount) {
          return `${data.expenseTitle} — ${data.currency} ${parseFloat(data.amount).toFixed(2)}`;
        }
        return data.expenseTitle;
      }
      return cleanFallbackBody(notification.body, 'deleted');
    case 'expense_restored':
      if (data?.expenseTitle) {
        return data.expenseTitle;
      }
      return cleanFallbackBody(notification.body, 'restored');
    case 'member_added':
      return data?.tripName ? `You were added to ${data.tripName}` : (notification.title ? `You were added to ${notification.title}` : (notification.body || 'You were added to a trip'));
    case 'member_added_notice':
      return data?.memberName ? `${data.memberName} was added to the trip` : (notification.body || 'A member was added to the trip');
    case 'member_joined':
      return data?.memberName ? `${data.memberName} joined the trip` : (notification.body || 'A member joined the trip');
    case 'settlement_reminder':
      if (data?.toLabel && data?.amount) {
        return `You owe ${data.toLabel} ${data.currency || ''}${data.amount} for this trip`;
      }
      return notification.body || 'You have a pending settlement reminder';
    case 'trip_deleted':
      return `"${data?.tripName || notification.title || 'Trip'}" was deleted`;
    default:
      // Fallback for legacy rows written before structured schemas existed
      return notification.body || 'You have a new notification';
  }
}
