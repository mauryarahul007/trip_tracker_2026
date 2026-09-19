import { describe, it, expect } from 'vitest';
import { describeSyncItem } from './syncQueueLabel';

describe('describeSyncItem', () => {
  it('includes the title when the payload has one', () => {
    expect(describeSyncItem({ type: 'addExpense', payload: { expenseData: { title: 'Dinner' } } })).toBe('Add expense: Dinner');
    expect(describeSyncItem({ type: 'createTrip', payload: { name: 'Goa' } })).toBe('Create trip: Goa');
  });
  it('falls back to a plain label without a name', () => {
    expect(describeSyncItem({ type: 'addExpense', payload: {} })).toBe('Add expense');
    expect(describeSyncItem({ type: 'deleteMember', payload: { id: 'm1' } })).toBe('Delete member');
    expect(describeSyncItem({ type: 'deleteMember', payload: { id: 'm1', name: 'Asha' } })).toBe('Delete member: Asha');
  });
  it('distinguishes archive from unarchive', () => {
    expect(describeSyncItem({ type: 'toggleArchiveMember', payload: { archived: true } })).toBe('Archive member');
    expect(describeSyncItem({ type: 'toggleArchiveMember', payload: { archived: false } })).toBe('Unarchive member');
  });
  it('humanizes unknown types', () => {
    expect(describeSyncItem({ type: 'somethingNew', payload: null })).toBe('something new');
  });
});
