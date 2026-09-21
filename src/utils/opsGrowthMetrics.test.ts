import { describe, it, expect } from 'vitest';
import type { Expense, Member, Trip } from '../types';
import type { AdminUserRow } from '../types/admin';
import {
  classifyTripSlice,
  computeActivationFunnel,
  computeCloseoutPulse,
  computeFlagUsageProxies,
  computeGhostTrips,
  computeInviteAttribution,
  computeLoopHealth,
  computeSignupSources,
  computeSliceLoopHealth,
  computeSplitwiseImports,
  computeWinBackList,
  DAY_MS,
  TEN_MIN_MS,
} from './opsGrowthMetrics';

const NOW = Date.parse('2026-09-21T12:00:00.000Z');

function trip(partial: Partial<Trip> & Pick<Trip, 'id' | 'name'>): Trip {
  return {
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    baseCurrency: 'INR',
    ownerId: 'u1',
    memberIds: ['m1'],
    groupIds: [],
    joinCode: 'ABC123',
    createdAt: NOW - 2 * DAY_MS,
    updatedAt: NOW,
    ...partial,
  };
}

function member(id: string, name: string, extra: Partial<Member> = {}): Member {
  return { id, name, ...extra };
}

function expense(partial: Partial<Expense> & Pick<Expense, 'id' | 'tripId'>): Expense {
  return {
    title: 'Dinner',
    amount: 100,
    currency: 'INR',
    category: 'food',
    date: '2026-09-02',
    paidBy: 'm1',
    splitMode: 'equal',
    splitMemberIds: ['m1'],
    resolvedShares: { m1: 100 },
    isSettlement: false,
    createdByUserId: 'u1',
    createdAt: NOW - DAY_MS,
    updatedAt: NOW - DAY_MS,
    ...partial,
  };
}

describe('opsGrowthMetrics', () => {
  const members: Record<string, Member> = {
    m1: member('m1', 'Rahul', { linkedUserId: 'u1' }),
    m2: member('m2', 'Priya', { linkedUserId: 'u2' }),
    m3: member('m3', 'Asha'),
  };

  it('scores loop health: first expense, second member, settle, lock, next trip', () => {
    const t1 = trip({
      id: 't1',
      name: 'Goa',
      memberIds: ['m1', 'm2'],
      createdAt: NOW - DAY_MS,
      closed: true,
    });
    const t2 = trip({
      id: 't2',
      name: 'Coorg',
      memberIds: ['m1', 'm2'],
      ownerId: 'u1',
      createdAt: NOW - 4 * DAY_MS,
    });
    const expenses = [
      expense({ id: 'e1', tripId: 't1', createdAt: t1.createdAt + 60_000 }),
      expense({ id: 'e2', tripId: 't1', title: 'Settlement: Rahul ➔ Priya', isSettlement: true, createdAt: t1.createdAt + 120_000 }),
    ];

    const health = computeLoopHealth([t1, t2], expenses, members, NOW);
    expect(health.tripCount).toBe(2);
    const byKey = Object.fromEntries(health.steps.map((s) => [s.key, s]));
    expect(byKey.firstExpense10m.count).toBe(1);
    expect(byKey.secondMember.count).toBe(2);
    expect(byKey.firstSettle.count).toBe(1);
    expect(byKey.locked.count).toBe(1);
    expect(byKey.nextTrip90d.count).toBe(1); // t2 then t1 with same names
  });

  it('does not count a first expense after 10 minutes as fast start', () => {
    const t1 = trip({ id: 'slow', name: 'Slow', createdAt: NOW - DAY_MS });
    const expenses = [expense({ id: 'e1', tripId: 'slow', createdAt: t1.createdAt + TEN_MIN_MS + 1 })];
    const health = computeLoopHealth([t1], expenses, members, NOW);
    expect(health.steps[0].count).toBe(0);
  });

  it('builds activation funnel from signup through settle', () => {
    const users: AdminUserRow[] = [
      { id: 'u1', email: 'a@x.com', displayName: 'A', banned: false, createdAt: '2026-09-01' },
      { id: 'u2', email: 'b@x.com', displayName: 'B', banned: false, createdAt: '2026-09-02' },
    ];
    const trips = [
      trip({ id: 't1', name: 'Goa', memberIds: ['m1', 'm2'] }),
      trip({ id: 't2', name: 'Solo' }),
    ];
    const expenses = [expense({ id: 'e1', tripId: 't1' })];
    const funnel = computeActivationFunnel(users, trips, expenses, members);
    expect(funnel[0].count).toBe(2);
    expect(funnel[1].count).toBe(2);
    expect(funnel[2].count).toBe(1);
    expect(funnel[4].count).toBe(1);
    expect(funnel[5].count).toBe(0);
  });

  it('lists idle ghosts and ended unpaid trips', () => {
    const idle = trip({ id: 'idle', name: 'Abandoned', createdAt: NOW - 3 * DAY_MS, memberIds: ['m1'] });
    const unpaid = trip({
      id: 'unpaid',
      name: 'Ended bills',
      memberIds: ['m1', 'm2'],
      endDate: '2026-09-01',
      createdAt: NOW - 20 * DAY_MS,
    });
    const healthy = trip({ id: 'ok', name: 'Fresh', createdAt: NOW - 60 * 60 * 1000 });
    const expenses = [expense({ id: 'e1', tripId: 'unpaid', paidBy: 'm1', splitMemberIds: ['m1', 'm2'] })];
    const ghosts = computeGhostTrips([idle, unpaid, healthy], expenses, members, NOW);
    expect(ghosts.map((g) => g.kind).sort()).toEqual(['idle', 'unpaid']);
  });

  it('classifies cafe vs pass-holder vs multi-currency', () => {
    const cafe = trip({ id: 'c', name: 'Cafe' });
    const pass = trip({
      id: 'p',
      name: 'Flight',
      passes: [{ id: 'pass1', tripId: 'p', type: 'flight', title: 'BLR-DEL', createdAt: NOW, updatedAt: NOW }],
    });
    const fx = trip({ id: 'f', name: 'Nomad' });
    expect(classifyTripSlice(cafe, [expense({ id: 'e1', tripId: 'c', currency: 'INR' })])).toBe('cafe');
    expect(classifyTripSlice(pass, [])).toBe('pass_holder');
    expect(classifyTripSlice(fx, [
      expense({ id: 'fx1', tripId: 'f', currency: 'USD' }),
      expense({ id: 'fx2', tripId: 'f', currency: 'EUR' }),
    ])).toBe('multi_currency');
  });

  it('attributes join-code claims and share-link views', () => {
    const trips = [
      trip({ id: 't1', name: 'Goa', memberIds: ['m1', 'm2'], shareToken: 'tok', shareEnabled: true, shareViewCount: 4, joinPreviewCount: 7 }),
      trip({ id: 't2', name: 'Solo', memberIds: ['m3'] }),
    ];
    const attr = computeInviteAttribution(trips, [], members);
    expect(attr.joinCodeClaimed).toBe(1);
    expect(attr.shareLinkCreated).toBe(1);
    expect(attr.shareLinkViews).toBe(4);
    expect(attr.joinPreviews).toBe(7);
    expect(attr.placeholderMembers).toBe(1);
  });

  it('flags clone-last proxy when two identical expenses land in 5 minutes', () => {
    const t1 = trip({ id: 't1', name: 'Goa', memberIds: ['m1'] });
    const expenses = [
      expense({ id: 'e1', tripId: 't1', title: 'Taxi', amount: 80, createdAt: NOW - 4 * 60 * 1000 }),
      expense({ id: 'e2', tripId: 't1', title: 'Taxi', amount: 80, createdAt: NOW - 3 * 60 * 1000 }),
    ];
    const rows = computeFlagUsageProxies([t1], expenses, members);
    const clone = rows.find((r) => r.key === 'enableCloneLastExpense');
    expect(clone?.used).toBe(1);
  });

  it('lists win-back trips settled 60-90 days ago with no newer trip', () => {
    const old = trip({
      id: 'old',
      name: 'Bali',
      closed: true,
      createdAt: NOW - 80 * DAY_MS,
    });
    const expenses = [expense({ id: 's1', tripId: 'old', isSettlement: true, title: 'Settlement: x', createdAt: NOW - 70 * DAY_MS })];
    const list = computeWinBackList([old], expenses, NOW);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Bali');
  });

  it('summarizes closeout pulse and Splitwise imports from trip fields', () => {
    const trips = [
      trip({ id: 'a', name: 'A', closeoutPulse: 'yes', splitwiseImportCount: 12, splitwiseImportedAt: NOW }),
      trip({ id: 'b', name: 'B', closeoutPulse: 'no' }),
      trip({ id: 'c', name: 'C', closeoutPulse: 'skip' }),
    ];
    const pulse = computeCloseoutPulse(trips);
    expect(pulse.answered).toBe(3);
    expect(pulse.wouldReusePct).toBe(50);
    const sw = computeSplitwiseImports(trips);
    expect(sw.tripCount).toBe(1);
    expect(sw.expenseCount).toBe(12);
  });

  it('groups signup UTM sources', () => {
    const users: AdminUserRow[] = [
      { id: '1', email: 'a@x.com', displayName: 'A', banned: false, createdAt: '2026-09-01', signupSource: { utm_source: 'whatsapp' } },
      { id: '2', email: 'b@x.com', displayName: 'B', banned: false, createdAt: '2026-09-01', signupSource: { utm_source: 'whatsapp' } },
      { id: '3', email: 'c@x.com', displayName: 'C', banned: false, createdAt: '2026-09-01' },
    ];
    const rows = computeSignupSources(users);
    expect(rows[0]).toEqual({ source: 'whatsapp', count: 2 });
    expect(rows[1]).toEqual({ source: 'direct / unknown', count: 1 });
  });

  it('splits loop KPIs by trip type', () => {
    const cafe = trip({ id: 'c', name: 'Cafe', memberIds: ['m1', 'm2'] });
    const pass = trip({
      id: 'p',
      name: 'Flight',
      memberIds: ['m1'],
      passes: [{ id: 'pass1', tripId: 'p', type: 'flight', title: 'AI 101', createdAt: NOW, updatedAt: NOW }],
    });
    const slices = computeSliceLoopHealth([cafe, pass], [], members, NOW);
    expect(slices.find((s) => s.slice === 'cafe')?.tripCount).toBe(1);
    expect(slices.find((s) => s.slice === 'pass_holder')?.tripCount).toBe(1);
    expect(slices.find((s) => s.slice === 'cafe')?.secondMemberPct).toBe(100);
  });
});
