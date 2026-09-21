import type { TripMessage, TripMessageExpensePayload, TripMessageKind } from '../types';

export type ExpenseLifecycleKind = Extract<
  TripMessageKind,
  | 'expense_added'
  | 'settlement_recorded'
  | 'expense_disputed'
  | 'expense_dispute_resolved'
  | 'expense_deleted'
  | 'expense_restored'
  | 'settlement_confirmed'
>;

export function expenseEventBody(kind: ExpenseLifecycleKind, expense: TripMessageExpensePayload): string {
  const money = `${expense.currency} ${expense.amount.toFixed(2)}`;
  switch (kind) {
    case 'expense_added':
      return `Added ${expense.title} · ${money}`;
    case 'settlement_recorded':
      return `Settlement ${expense.title} · ${money}`;
    case 'expense_disputed':
      return expense.note ? `Disputed ${expense.title} — ${expense.note}` : `Disputed ${expense.title}`;
    case 'expense_dispute_resolved':
      return `Dispute resolved: ${expense.title}`;
    case 'expense_deleted':
      return `Deleted ${expense.title} · ${money}`;
    case 'expense_restored':
      return `Restored ${expense.title} · ${money}`;
    case 'settlement_confirmed':
      return `Confirmed settlement ${expense.title} · ${money}`;
  }
}

export type ChatExpenseCardVariant =
  | 'expense'
  | 'settlement'
  | 'dispute'
  | 'resolved'
  | 'link'
  | 'deleted'
  | 'restored'
  | 'confirmed';

export type ChatExpenseLiveStatus = 'live' | 'deleted' | 'gone';

export function getChatExpenseCardPresentation(
  kind: TripMessageKind,
  isMine: boolean,
  senderName: string
): { variant: ChatExpenseCardVariant; icon: string; whoLabel: string } {
  const who = isMine ? 'You' : senderName;
  if (kind === 'settlement_recorded') {
    return { variant: 'settlement', icon: '🤝', whoLabel: `${who} recorded settlement` };
  }
  if (kind === 'expense_disputed') {
    return { variant: 'dispute', icon: '⚠️', whoLabel: `${who} disputed` };
  }
  if (kind === 'expense_dispute_resolved') {
    return { variant: 'resolved', icon: '✅', whoLabel: 'Dispute resolved' };
  }
  if (kind === 'expense_link') {
    return { variant: 'link', icon: '🔗', whoLabel: `${who} linked` };
  }
  if (kind === 'expense_deleted') {
    return { variant: 'deleted', icon: '🗑️', whoLabel: `${who} deleted` };
  }
  if (kind === 'expense_restored') {
    return { variant: 'restored', icon: '♻️', whoLabel: `${who} restored` };
  }
  if (kind === 'settlement_confirmed') {
    return { variant: 'confirmed', icon: '✅', whoLabel: `${who} confirmed settlement` };
  }
  return { variant: 'expense', icon: '💳', whoLabel: `${who} added` };
}

export function getChatExpenseLiveStatus(
  expenseId: string,
  liveIds: Set<string>,
  deletedIds: Set<string>
): ChatExpenseLiveStatus {
  if (liveIds.has(expenseId)) return 'live';
  if (deletedIds.has(expenseId)) return 'deleted';
  return 'gone';
}

/** Original add/settlement/link cards should dim when the ledger row is gone. */
export function shouldMarkChatExpenseCardStale(
  kind: TripMessageKind,
  liveStatus: ChatExpenseLiveStatus
): boolean {
  if (liveStatus === 'live') return false;
  return kind === 'expense_added' || kind === 'settlement_recorded' || kind === 'expense_link';
}

const MONEY_EVENT_KINDS = new Set<TripMessageKind>([
  'expense_added',
  'settlement_recorded',
  'expense_disputed',
  'expense_dispute_resolved',
  'expense_link',
  'expense_deleted',
  'expense_restored',
  'settlement_confirmed',
]);

const STACKABLE_KINDS = new Set<TripMessageKind>([
  'expense_added',
  'settlement_recorded',
  'expense_link',
]);

export function isChatMoneyEventKind(kind?: TripMessageKind): boolean {
  return Boolean(kind && MONEY_EVENT_KINDS.has(kind));
}

export function isStackableChatCardKind(kind?: TripMessageKind): boolean {
  return Boolean(kind && STACKABLE_KINDS.has(kind));
}

export type ChatRenderItem =
  | { type: 'single'; message: TripMessage }
  | { type: 'stack'; id: string; messages: TripMessage[] };

export function groupChatMessagesForRender(
  messages: TripMessage[],
  hideMoneyEvents: boolean
): ChatRenderItem[] {
  const items: ChatRenderItem[] = [];
  let i = 0;
  while (i < messages.length) {
    const message = messages[i];
    const kind = message.kind || 'text';
    if (hideMoneyEvents && !message.deletedAt && isChatMoneyEventKind(kind)) {
      i += 1;
      continue;
    }
    if (!message.deletedAt && isStackableChatCardKind(kind)) {
      const stack = [message];
      let j = i + 1;
      while (j < messages.length) {
        const next = messages[j];
        const nextKind = next.kind || 'text';
        if (hideMoneyEvents && !next.deletedAt && isChatMoneyEventKind(nextKind)) {
          j += 1;
          continue;
        }
        if (next.deletedAt || !isStackableChatCardKind(nextKind)) break;
        stack.push(next);
        j += 1;
      }
      if (stack.length >= 2) {
        items.push({ type: 'stack', id: stack[0].id, messages: stack });
        i = j;
        continue;
      }
    }
    items.push({ type: 'single', message });
    i += 1;
  }
  return items;
}

export function chatExpenseStackLabel(count: number): string {
  return `${count} bill${count === 1 ? '' : 's'}`;
}
