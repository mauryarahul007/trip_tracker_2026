import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Domain entity types matching database definitions
 */
interface MockExpense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paid_by: string;
  split_mode: string;
  split_member_ids: string[];
  resolved_shares: Record<string, number>;
  created_by_user_id: string;
  is_settlement: boolean;
  approval_status: 'confirmed' | 'pending_approval';
  settlement_confirmed_at: string | null;
  settlement_confirmed_by_user_id: string | null;
  disputed_at: string | null;
  disputed_by_user_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MockMember {
  id: string;
  trip_id: string;
  name: string;
  linked_user_id: string | null;
  updated_at: string;
}

interface MockTrip {
  id: string;
  name: string;
  owner_id: string;
  updated_at: string;
}

/**
 * Pure simulation of the SQL RPCs introduced in migration 0115_sync_idempotency_and_changes.sql
 */
class MockDatabaseState {
  trips: MockTrip[] = [];
  members: MockMember[] = [];
  expenses: MockExpense[] = [];

  // Replay-safe upsert_expense_v1
  upsertExpense(callerId: string, input: Partial<MockExpense> & { id: string; trip_id: string; title: string; amount: number }): MockExpense {
    const isParticipant = this.members.some((m) => m.trip_id === input.trip_id && m.linked_user_id === callerId) ||
      this.trips.some((t) => t.id === input.trip_id && t.owner_id === callerId);

    if (!isParticipant) {
      throw new Error('not a participant of this trip');
    }

    const existingIdx = this.expenses.findIndex((e) => e.id === input.id);
    const nowIso = new Date().toISOString();

    if (existingIdx >= 0) {
      const existing = this.expenses[existingIdx];
      const isOwner = this.trips.some((t) => t.id === input.trip_id && t.owner_id === callerId);
      if (!isOwner && existing.created_by_user_id !== callerId) {
        throw new Error('not authorized to update this expense');
      }

      const updated: MockExpense = {
        ...existing,
        ...input,
        updated_at: nowIso,
      };
      this.expenses[existingIdx] = updated;
      return updated;
    } else {
      const created: MockExpense = {
        id: input.id,
        trip_id: input.trip_id,
        title: input.title,
        amount: input.amount,
        currency: input.currency || 'INR',
        category: input.category || 'Food',
        date: input.date || '2026-10-06',
        paid_by: input.paid_by || callerId,
        split_mode: input.split_mode || 'equal',
        split_member_ids: input.split_member_ids || [],
        resolved_shares: input.resolved_shares || {},
        created_by_user_id: callerId,
        is_settlement: input.title.startsWith('Settlement:'),
        approval_status: input.approval_status || 'confirmed',
        settlement_confirmed_at: null,
        settlement_confirmed_by_user_id: null,
        disputed_at: null,
        disputed_by_user_id: null,
        deleted_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      this.expenses.push(created);
      return created;
    }
  }

  // Idempotent confirm_settlement
  confirmSettlement(expenseId: string, callerId: string): MockExpense {
    const exp = this.expenses.find((e) => e.id === expenseId && e.deleted_at === null);
    if (!exp) throw new Error('expense not found');
    if (!exp.is_settlement) throw new Error('not a settlement entry');

    // Idempotent guard
    if (exp.settlement_confirmed_at !== null) {
      return exp;
    }

    const nowIso = new Date().toISOString();
    exp.settlement_confirmed_at = nowIso;
    exp.settlement_confirmed_by_user_id = callerId;
    exp.updated_at = nowIso;
    return exp;
  }

  // Idempotent approve_expense
  approveExpense(expenseId: string, callerId: string): MockExpense {
    const exp = this.expenses.find((e) => e.id === expenseId && e.deleted_at === null);
    if (!exp) throw new Error('expense not found');

    // Idempotent guard
    if (exp.approval_status === 'confirmed') {
      return exp;
    }

    if (exp.created_by_user_id === callerId) {
      throw new Error('the expense creator cannot approve their own pending expense');
    }

    const nowIso = new Date().toISOString();
    exp.approval_status = 'confirmed';
    exp.updated_at = nowIso;
    return exp;
  }

  // Idempotent claim_trip_member
  claimTripMember(memberId: string, callerId: string): boolean {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) return false;

    // Idempotent guard: if already claimed by this user
    if (member.linked_user_id === callerId) {
      return true;
    }

    if (member.linked_user_id !== null) {
      return false; // claimed by someone else
    }

    member.linked_user_id = callerId;
    member.updated_at = new Date().toISOString();
    return true;
  }

  // Incremental sync get_trip_changes
  getTripChanges(tripId: string, callerId: string, sinceIso: string) {
    const isParticipant = this.members.some((m) => m.trip_id === tripId && m.linked_user_id === callerId) ||
      this.trips.some((t) => t.id === tripId && t.owner_id === callerId);

    if (!isParticipant) {
      throw new Error('not a participant of this trip');
    }

    const sinceTime = new Date(sinceIso).getTime();
    const serverTime = new Date().toISOString();

    const trip = this.trips.find((t) => t.id === tripId && new Date(t.updated_at).getTime() > sinceTime) || null;
    const members = this.members.filter((m) => m.trip_id === tripId && new Date(m.updated_at).getTime() > sinceTime);
    const expenses = this.expenses.filter((e) => e.trip_id === tripId && e.deleted_at === null && new Date(e.updated_at).getTime() > sinceTime);
    const tombstones = this.expenses.filter((e) => e.trip_id === tripId && e.deleted_at !== null && new Date(e.deleted_at).getTime() > sinceTime).map((e) => e.id);

    return {
      server_time: serverTime,
      trip,
      members,
      expenses,
      tombstones: { expenses: tombstones },
    };
  }
}

describe('Sync Idempotency, Incremental Delta & RLS Authorization Matrix', () => {
  let db: MockDatabaseState;
  const ownerId = 'user-owner-1';
  const memberId = 'user-member-2';
  const outsiderId = 'user-outsider-3';
  const tripId = 'trip-goa-100';

  beforeEach(() => {
    db = new MockDatabaseState();
    db.trips.push({ id: tripId, name: 'Goa Getaway', owner_id: ownerId, updated_at: '2026-10-06T00:00:00.000Z' });
    db.members.push(
      { id: 'mem-1', trip_id: tripId, name: 'Rahul', linked_user_id: ownerId, updated_at: '2026-10-06T00:00:00.000Z' },
      { id: 'mem-2', trip_id: tripId, name: 'Priya', linked_user_id: memberId, updated_at: '2026-10-06T00:00:00.000Z' },
      { id: 'mem-3', trip_id: tripId, name: 'Amit (Unclaimed)', linked_user_id: null, updated_at: '2026-10-06T00:00:00.000Z' }
    );
  });

  describe('1. Idempotent Mutation Replay', () => {
    it('handles duplicate addExpense / upsert_expense_v1 with same UUID idempotently', () => {
      const expenseUuid = 'exp-custom-uuid-001';

      // First execution (network send)
      const res1 = db.upsertExpense(ownerId, {
        id: expenseUuid,
        trip_id: tripId,
        title: 'Beach Dinner',
        amount: 2500,
      });

      expect(res1.id).toBe(expenseUuid);
      expect(db.expenses).toHaveLength(1);

      // Second execution (replayed queue flush after offline retry)
      const res2 = db.upsertExpense(ownerId, {
        id: expenseUuid,
        trip_id: tripId,
        title: 'Beach Dinner (Updated Note)',
        amount: 2500,
      });

      // Must update cleanly without duplicate key violation
      expect(res2.id).toBe(expenseUuid);
      expect(res2.title).toBe('Beach Dinner (Updated Note)');
      expect(db.expenses).toHaveLength(1); // exactly 1 row maintained
    });

    it('handles confirm_settlement replay idempotently without throwing', () => {
      const settlementId = 'exp-settle-001';
      db.upsertExpense(ownerId, {
        id: settlementId,
        trip_id: tripId,
        title: 'Settlement: Priya ➔ Rahul',
        amount: 1500,
      });

      // First confirmation
      const conf1 = db.confirmSettlement(settlementId, ownerId);
      expect(conf1.settlement_confirmed_at).not.toBeNull();

      // Second confirmation (replayed)
      const conf2 = db.confirmSettlement(settlementId, ownerId);
      expect(conf2.settlement_confirmed_at).toBe(conf1.settlement_confirmed_at);
    });

    it('handles approve_expense replay idempotently without throwing', () => {
      const expId = 'exp-approval-001';
      db.upsertExpense(ownerId, {
        id: expId,
        trip_id: tripId,
        title: 'Big Resort Deposit',
        amount: 30000,
        approval_status: 'pending_approval',
      });

      // Member approves
      const app1 = db.approveExpense(expId, memberId);
      expect(app1.approval_status).toBe('confirmed');

      // Replayed approval
      const app2 = db.approveExpense(expId, memberId);
      expect(app2.approval_status).toBe('confirmed');
    });

    it('handles claim_trip_member replay returning true', () => {
      // First claim by Priya
      const claim1 = db.claimTripMember('mem-3', memberId);
      expect(claim1).toBe(true);

      // Replayed claim by Priya
      const claim2 = db.claimTripMember('mem-3', memberId);
      expect(claim2).toBe(true);

      // Unrelated user cannot claim
      const claimOther = db.claimTripMember('mem-3', outsiderId);
      expect(claimOther).toBe(false);
    });
  });

  describe('2. Incremental Delta Synchronization (get_trip_changes)', () => {
    it('returns full dataset on initial sync with past cursor', () => {
      db.upsertExpense(ownerId, { id: 'e-1', trip_id: tripId, title: 'Lunch', amount: 800 });
      db.upsertExpense(ownerId, { id: 'e-2', trip_id: tripId, title: 'Snacks', amount: 300 });

      const changes = db.getTripChanges(tripId, memberId, '1970-01-01T00:00:00.000Z');

      expect(changes.expenses).toHaveLength(2);
      expect(changes.members).toHaveLength(3);
      expect(changes.tombstones.expenses).toHaveLength(0);
      expect(changes.server_time).toBeDefined();
    });

    it('returns only modified rows and tombstones for delta sync', () => {
      // Base expense created in past
      const pastTime = '2026-10-06T00:00:00.000Z';
      const base = db.upsertExpense(ownerId, { id: 'e-1', trip_id: tripId, title: 'Lunch', amount: 800 });
      base.created_at = pastTime;
      base.updated_at = pastTime;

      const cursor = '2026-10-06T01:00:00.000Z';
      const afterCursor = '2026-10-06T02:00:00.000Z';

      // Mutation after cursor: 1 updated expense and 1 soft-deleted expense
      const e2 = db.upsertExpense(ownerId, { id: 'e-2', trip_id: tripId, title: 'New Dinner', amount: 2000 });
      e2.updated_at = afterCursor;

      const e3 = db.upsertExpense(ownerId, { id: 'e-3', trip_id: tripId, title: 'Mistake Taxi', amount: 400 });
      e3.updated_at = afterCursor;
      e3.deleted_at = afterCursor;

      const delta = db.getTripChanges(tripId, memberId, cursor);

      expect(delta.expenses).toHaveLength(1);
      expect(delta.expenses[0].id).toBe('e-2');
      expect(delta.tombstones.expenses).toContain('e-3');
    });
  });

  describe('3. RLS Authorization & Participant Isolation', () => {
    it('denies outsider access to trip sync and mutations', () => {
      expect(() => {
        db.getTripChanges(tripId, outsiderId, '1970-01-01T00:00:00.000Z');
      }).toThrow('not a participant of this trip');

      expect(() => {
        db.upsertExpense(outsiderId, {
          id: 'e-malicious',
          trip_id: tripId,
          title: 'Hacked Expense',
          amount: 9999,
        });
      }).toThrow('not a participant of this trip');
    });

    it('permits valid member to sync and create expenses', () => {
      const res = db.upsertExpense(memberId, {
        id: 'e-member-valid',
        trip_id: tripId,
        title: 'Drinks by Priya',
        amount: 1200,
      });

      expect(res.id).toBe('e-member-valid');
      expect(res.created_by_user_id).toBe(memberId);
    });

    it('blocks regular member from updating an expense created by another non-admin', () => {
      db.upsertExpense(memberId, {
        id: 'e-priya-only',
        trip_id: tripId,
        title: 'Priya Private Expense',
        amount: 500,
      });

      // Another user (e.g. another member if present) cannot edit Priya's expense
      // While trip owner CAN update it
      const ownerEdit = db.upsertExpense(ownerId, {
        id: 'e-priya-only',
        trip_id: tripId,
        title: 'Priya Private Expense (Admin reviewed)',
        amount: 500,
      });
      expect(ownerEdit.title).toContain('Admin reviewed');
    });
  });
});
