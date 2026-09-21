import { describe, expect, it } from 'vitest';
import type { TripMessage } from '../types';
import {
  chatExpenseStackLabel,
  expenseEventBody,
  getChatExpenseCardPresentation,
  getChatExpenseLiveStatus,
  groupChatMessagesForRender,
  shouldMarkChatExpenseCardStale,
} from './chatExpenseCards';

function msg(overrides: Partial<TripMessage> & Pick<TripMessage, 'id' | 'kind'>): TripMessage {
  return {
    tripId: 't1',
    memberId: 'm1',
    body: 'x',
    createdAt: 1,
    ...overrides,
  };
}

describe('getChatExpenseCardPresentation', () => {
  it('labels delete, restore, and settlement confirm for the actor', () => {
    expect(getChatExpenseCardPresentation('expense_deleted', true, 'Alex').whoLabel).toBe('You deleted');
    expect(getChatExpenseCardPresentation('expense_deleted', false, 'Alex').whoLabel).toBe('Alex deleted');
    expect(getChatExpenseCardPresentation('expense_restored', true, 'Alex').variant).toBe('restored');
    expect(getChatExpenseCardPresentation('settlement_confirmed', false, 'Sam').whoLabel).toBe(
      'Sam confirmed settlement'
    );
  });
});

describe('getChatExpenseLiveStatus', () => {
  it('prefers live over deleted when the expense is back in the ledger', () => {
    expect(getChatExpenseLiveStatus('e1', new Set(['e1']), new Set(['e1']))).toBe('live');
    expect(getChatExpenseLiveStatus('e1', new Set(), new Set(['e1']))).toBe('deleted');
    expect(getChatExpenseLiveStatus('e1', new Set(), new Set())).toBe('gone');
  });
});

describe('expenseEventBody', () => {
  const expense = { expenseId: 'e1', title: 'Dinner', amount: 12.5, currency: 'INR' };

  it('keeps add copy stable and describes delete/restore/confirm', () => {
    expect(expenseEventBody('expense_added', expense)).toBe('Added Dinner · INR 12.50');
    expect(expenseEventBody('expense_deleted', expense)).toBe('Deleted Dinner · INR 12.50');
    expect(expenseEventBody('expense_restored', expense)).toBe('Restored Dinner · INR 12.50');
    expect(expenseEventBody('settlement_confirmed', { ...expense, title: 'Settlement: A ➔ B' })).toBe(
      'Confirmed settlement Settlement: A ➔ B · INR 12.50'
    );
  });
});

describe('shouldMarkChatExpenseCardStale', () => {
  it('dims the original add/settlement card after delete, not the delete event itself', () => {
    expect(shouldMarkChatExpenseCardStale('expense_added', 'deleted')).toBe(true);
    expect(shouldMarkChatExpenseCardStale('settlement_recorded', 'gone')).toBe(true);
    expect(shouldMarkChatExpenseCardStale('expense_deleted', 'deleted')).toBe(false);
    expect(shouldMarkChatExpenseCardStale('expense_added', 'live')).toBe(false);
  });
});

describe('groupChatMessagesForRender', () => {
  it('stacks consecutive add/settlement cards and leaves talk as singles', () => {
    const items = groupChatMessagesForRender(
      [
        msg({ id: 'a', kind: 'expense_added' }),
        msg({ id: 'b', kind: 'expense_added' }),
        msg({ id: 'c', kind: 'text', body: 'ok' }),
        msg({ id: 'd', kind: 'settlement_recorded' }),
      ],
      false
    );
    expect(items[0]).toMatchObject({ type: 'stack', id: 'a' });
    if (items[0].type === 'stack') expect(items[0].messages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(items[1]).toMatchObject({ type: 'single', message: { id: 'c' } });
    expect(items[2]).toMatchObject({ type: 'single', message: { id: 'd' } });
  });

  it('hides money event cards when muted', () => {
    const items = groupChatMessagesForRender(
      [msg({ id: 'a', kind: 'expense_added' }), msg({ id: 'c', kind: 'text', body: 'ok' })],
      true
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'single', message: { id: 'c' } });
  });

  it('labels a stack', () => {
    expect(chatExpenseStackLabel(3)).toBe('3 bills');
  });
});
