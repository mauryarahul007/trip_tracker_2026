import { describe, it, expect } from 'vitest';
import { calculateSettlements, memberBalancesForDisplay, calculateGroupInternalTransfers, settlementPartiesForRecorder, summarizeSettlement } from './settlement';
import type { Trip, Member, Expense, Group } from '../types';

describe('Settlement Utilities', () => {
  const membersList: Member[] = [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' },
    { id: 'm3', name: 'Charlie' },
  ];

  const members: Record<string, Member> = {
    m1: membersList[0],
    m2: membersList[1],
    m3: membersList[2],
  };

  const trip: Trip = {
    id: 't1',
    name: 'Euro Trip',
    startDate: '2026-08-01',
    endDate: '2026-08-10',
    baseCurrency: 'EUR',
    ownerId: 'u1',
    memberIds: ['m1', 'm2', 'm3'],
    groupIds: [],
    joinCode: 'ABC123',
    createdAt: 0,
    updatedAt: 0,
  };

  it('calculates settlements correctly for a simple equal split', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        title: 'Dinner',
        amount: 90,
        currency: 'EUR',
        category: 'Food',
        date: '2026-08-02',
        paidBy: 'm1',
        splitMode: 'equal',
        splitMemberIds: ['m1', 'm2', 'm3'],
        resolvedShares: { m1: 30, m2: 30, m3: 30 },
        createdAt: 0,
        updatedAt: 0,
        isSettlement: false,
        createdByUserId: 'u1',
      },
    ];

    const { balances, transfers } = calculateSettlements(trip, members, expenses);

    // Alice paid 90, owes 30 => balance +60
    // Bob paid 0, owes 30 => balance -30
    // Charlie paid 0, owes 30 => balance -30
    expect(balances.find((b) => b.memberId === 'm1')?.balance).toBe(60);
    expect(balances.find((b) => b.memberId === 'm2')?.balance).toBe(-30);
    expect(balances.find((b) => b.memberId === 'm3')?.balance).toBe(-30);

    // Expected transfers: Bob and Charlie pay Alice 30 each
    expect(transfers).toHaveLength(2);
    const bobTransfer = transfers.find((t) => t.fromMemberId === 'm2');
    const charlieTransfer = transfers.find((t) => t.fromMemberId === 'm3');

    expect(bobTransfer?.toMemberId).toBe('m1');
    expect(bobTransfer?.amount).toBe(30);

    expect(charlieTransfer?.toMemberId).toBe('m1');
    expect(charlieTransfer?.amount).toBe(30);
  });

  it('calculates group internal transfers correctly', () => {
    const balances = [
      { memberId: 'm2', name: 'Bob', balance: -10 },
      { memberId: 'm3', name: 'Charlie', balance: 10 },
    ];
    const group: Group = {
      id: 'g1',
      name: 'Bob & Charlie',
      memberIds: ['m2', 'm3'],
    };

    const transfers = calculateGroupInternalTransfers(balances, group);

    // Bob owes 10, Charlie gets back 10 => Bob pays Charlie 10
    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromMemberId).toBe('m2');
    expect(transfers[0].toMemberId).toBe('m3');
    expect(transfers[0].amount).toBe(10);
  });

  describe('settlementPartiesForRecorder', () => {
    const couple: Group = { id: 'g1', name: 'Bob & Charlie', memberIds: ['m2', 'm3'] };
    const hotel: Expense = {
      id: 'e1',
      tripId: 't1',
      title: 'Hotel',
      amount: 1000,
      currency: 'EUR',
      category: 'Stay',
      date: '2026-08-02',
      paidBy: 'm1',
      splitMode: 'equal',
      splitMemberIds: ['m2', 'm3'],
      resolvedShares: { m2: 500, m3: 500 },
      createdAt: 0,
      updatedAt: 0,
      isSettlement: false,
      createdByUserId: 'u1',
    };
    const bobPaysTen: Expense = {
      ...hotel,
      id: 'e2',
      title: 'Settlement: Bob & Charlie ➔ Alice',
      amount: 10,
      paidBy: 'm2',
      splitMode: 'exact',
      splitMemberIds: ['m1'],
      splitConfig: { m1: 10 },
      resolvedShares: { m1: 10 },
      isSettlement: true,
      createdByUserId: 'u2',
    };

    it('keeps Bob as payer after his partial payment flips the group representative to Charlie', () => {
      const { transfers } = calculateSettlements(trip, members, [hotel, bobPaysTen], [couple]);
      expect(transfers).toHaveLength(1);
      expect(transfers[0].from).toBe('group:g1');
      expect(transfers[0].amount).toBe(990);
      // Charlie now has the bigger debt, so the raw transfer names him --
      // recording that as Bob would fail the expenses insert policy.
      expect(transfers[0].fromMemberId).toBe('m3');

      expect(settlementPartiesForRecorder(transfers[0], 'm2', [couple])).toEqual({ fromMemberId: 'm2', toMemberId: 'm1' });
    });

    it('records a creditor-side group member as the recipient', () => {
      const t = { from: 'member:m1', to: 'group:g1', fromLabel: 'Alice', toLabel: 'Bob & Charlie', fromMemberId: 'm1', toMemberId: 'm3', amount: 40 };
      expect(settlementPartiesForRecorder(t, 'm2', [couple])).toEqual({ fromMemberId: 'm1', toMemberId: 'm2' });
    });

    it('leaves the transfer alone for a recorder outside both sides or without a member', () => {
      const t = { from: 'group:g1', to: 'member:m1', fromLabel: 'Bob & Charlie', toLabel: 'Alice', fromMemberId: 'm3', toMemberId: 'm1', amount: 40 };
      expect(settlementPartiesForRecorder(t, 'm4', [couple])).toEqual({ fromMemberId: 'm3', toMemberId: 'm1' });
      expect(settlementPartiesForRecorder(t, null, [couple])).toEqual({ fromMemberId: 'm3', toMemberId: 'm1' });
      expect(settlementPartiesForRecorder(t, 'm1', [couple])).toEqual({ fromMemberId: 'm3', toMemberId: 'm1' });
    });

    it('does not swap in a groupmate on a direct (member-to-member) transfer', () => {
      const t = { from: 'member:m3', to: 'member:m1', fromLabel: 'Charlie', toLabel: 'Alice', fromMemberId: 'm3', toMemberId: 'm1', amount: 40 };
      expect(settlementPartiesForRecorder(t, 'm2', [couple])).toEqual({ fromMemberId: 'm3', toMemberId: 'm1' });
    });
  });

  it('distinguishes simplified greedy settlement from direct bilateral debts', () => {
    // Scenario:
    // Alice (m1) pays 60 for Bob (m2) -> Bob owes Alice 60
    // Bob (m2) pays 60 for Charlie (m3) -> Charlie owes Bob 60
    // Net balances: Alice: +60, Bob: 0, Charlie: -60
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        title: 'Alice pays for Bob',
        amount: 60,
        currency: 'EUR',
        category: 'Transport',
        date: '2026-08-03',
        paidBy: 'm1',
        splitMode: 'exact',
        splitMemberIds: ['m2'],
        resolvedShares: { m2: 60 },
        createdAt: 1,
        updatedAt: 1,
        isSettlement: false,
        createdByUserId: 'u1',
      },
      {
        id: 'e2',
        tripId: 't1',
        title: 'Bob pays for Charlie',
        amount: 60,
        currency: 'EUR',
        category: 'Transport',
        date: '2026-08-04',
        paidBy: 'm2',
        splitMode: 'exact',
        splitMemberIds: ['m3'],
        resolvedShares: { m3: 60 },
        createdAt: 2,
        updatedAt: 2,
        isSettlement: false,
        createdByUserId: 'u1',
      },
    ];

    // 1. Simplified Debts (Greedy minimization):
    // Charlie pays Alice directly (collapsing Bob out) -> 1 transfer
    const simplified = calculateSettlements(trip, members, expenses, [], { simplifyDebts: true });
    expect(simplified.isSimplified).toBe(true);
    expect(simplified.transfers).toHaveLength(1);
    expect(simplified.transfers[0].fromMemberId).toBe('m3');
    expect(simplified.transfers[0].toMemberId).toBe('m1');
    expect(simplified.transfers[0].amount).toBe(60);

    // 2. Direct Bilateral Debts (simplifyDebts: false):
    // Charlie pays Bob 60, Bob pays Alice 60 (exact pairwise chains preserved) -> 2 transfers
    const direct = calculateSettlements(trip, members, expenses, [], { simplifyDebts: false });
    expect(direct.isSimplified).toBe(false);
    expect(direct.transfers).toHaveLength(2);

    const charlieToBob = direct.transfers.find((t) => t.fromMemberId === 'm3' && t.toMemberId === 'm2');
    const bobToAlice = direct.transfers.find((t) => t.fromMemberId === 'm2' && t.toMemberId === 'm1');

    expect(charlieToBob).toBeDefined();
    expect(charlieToBob?.amount).toBe(60);
    expect(bobToAlice).toBeDefined();
    expect(bobToAlice?.amount).toBe(60);
  });

  it('correctly calculates balances and transfers for multi-payer single expenses', () => {
    const trip: Trip = {
      id: 't1',
      name: 'Goa',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      baseCurrency: 'INR',
      memberIds: ['m1', 'm2', 'm3', 'm4'],
      groupIds: [],
      ownerId: 'u1',
      joinCode: 'GOA1',
      createdAt: 0,
      updatedAt: 0,
    };

    const members: Record<string, Member> = {
      m1: { id: 'm1', name: 'Alice' },
      m2: { id: 'm2', name: 'Bob' },
      m3: { id: 'm3', name: 'Charlie' },
      m4: { id: 'm4', name: 'David' },
    };

    // Alice paid 60 and Bob paid 40 for a 100 dinner split equally among all 4
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        title: 'Villa Dinner',
        amount: 100,
        currency: 'INR',
        category: 'cat-food',
        date: '2026-03-01',
        paidBy: 'm1', // primary
        paidByShares: { m1: 60, m2: 40 },
        splitMode: 'equal',
        splitMemberIds: ['m1', 'm2', 'm3', 'm4'],
        resolvedShares: { m1: 25, m2: 25, m3: 25, m4: 25 },
        createdAt: 1,
        updatedAt: 1,
        isSettlement: false,
        createdByUserId: 'u1',
      },
    ];

    const res = calculateSettlements(trip, members, expenses);
    const bAlice = res.balances.find((b) => b.memberId === 'm1')?.balance;
    const bBob = res.balances.find((b) => b.memberId === 'm2')?.balance;
    const bCharlie = res.balances.find((b) => b.memberId === 'm3')?.balance;
    const bDavid = res.balances.find((b) => b.memberId === 'm4')?.balance;

    expect(bAlice).toBe(35); // 60 paid - 25 share
    expect(bBob).toBe(15);   // 40 paid - 25 share
    expect(bCharlie).toBe(-25); // 0 paid - 25 share
    expect(bDavid).toBe(-25);   // 0 paid - 25 share

    // Check zero-sum balance invariant
    const sum = res.balances.reduce((acc, b) => acc + b.balance, 0);
    expect(Math.abs(sum)).toBeLessThan(0.01);

    // Check direct transfers
    const direct = calculateSettlements(trip, members, expenses, [], { simplifyDebts: false });
    expect(direct.isSimplified).toBe(false);

    // In direct debts:
    // Charlie (share 25) owes Alice 60% of 25 = 15, and Bob 40% of 25 = 10
    // David (share 25) owes Alice 60% of 25 = 15, and Bob 40% of 25 = 10
    // Bob (share 25) owes Alice 60% of 25 = 15, but Alice owes Bob 40% of 25 = 10 -> net Bob owes Alice 5
    const charlieToAlice = direct.transfers.find((t) => t.fromMemberId === 'm3' && t.toMemberId === 'm1');
    const charlieToBob = direct.transfers.find((t) => t.fromMemberId === 'm3' && t.toMemberId === 'm2');
    const davidToAlice = direct.transfers.find((t) => t.fromMemberId === 'm4' && t.toMemberId === 'm1');
    const davidToBob = direct.transfers.find((t) => t.fromMemberId === 'm4' && t.toMemberId === 'm2');
    const bobToAlice = direct.transfers.find((t) => t.fromMemberId === 'm2' && t.toMemberId === 'm1');

    expect(charlieToAlice?.amount).toBe(15);
    expect(charlieToBob?.amount).toBe(10);
    expect(davidToAlice?.amount).toBe(15);
    expect(davidToBob?.amount).toBe(10);
    expect(bobToAlice?.amount).toBe(5);
  });

  it('per person view with groups lists the one net payment, not opposing pair debts between the groups', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const four: Trip = { ...trip, memberIds: ids };
    const mem = Object.fromEntries(ids.map((id) => [id, { id, name: id }])) as Record<string, Member>;
    const groups: Group[] = [
      { id: 'g2', name: '2B', memberIds: ['a', 'b'] },
      { id: 'g1', name: '1B', memberIds: ['c', 'd'] },
    ];
    const exp = (id: string, amount: number, paidBy: string): Expense => ({
      id, tripId: 't1', title: `Item ${id}`, amount, currency: 'EUR', category: 'c', date: '2026-08-02', paidBy,
      splitMode: 'equal', splitMemberIds: ids, resolvedShares: Object.fromEntries(ids.map((m) => [m, amount / 4])),
      createdAt: 1, updatedAt: 1, isSettlement: false, createdByUserId: 'u1',
    });
    // 2B is owed 300 net, but pair by pair c owes a 350 while a and b each owe d 100.
    const res = calculateSettlements(four, mem, [exp('e1', 1000, 'a'), exp('e2', 400, 'd')], groups, { simplifyDebts: false });
    expect(res.transfers).toHaveLength(1);
    expect(res.transfers[0].amount).toBe(300);
  });

  it('summarizes the same outstanding total Summary shows', () => {
    const summary = summarizeSettlement(
      [{ balance: 40 }, { balance: -40 }, { balance: 0 }],
      [{ amount: 40 }],
    );
    expect(summary).toEqual({
      isFullySettled: false,
      totalOutstanding: 40,
      transferCount: 1,
      unsettledMemberCount: 2,
    });
    expect(summarizeSettlement([], []).isFullySettled).toBe(true);
  });

  describe('Per person view after settling with Fewest payments', () => {
    const base = { tripId: 't1', currency: 'EUR', category: 'Food', date: '2026-08-02', createdAt: 0, updatedAt: 0, createdByUserId: 'u1', isSettlement: false, splitMode: 'equal' as const };
    // Alice paid 60 for Alice+Bob (Bob owes 30); Bob paid 60 for Bob+Charlie (Charlie owes 30).
    const e1: Expense = { ...base, id: 'e1', title: 'Lunch', amount: 60, paidBy: 'm1', splitMemberIds: ['m1', 'm2'], resolvedShares: { m1: 30, m2: 30 } };
    const e2: Expense = { ...base, id: 'e2', title: 'Cab', amount: 60, paidBy: 'm2', splitMemberIds: ['m2', 'm3'], resolvedShares: { m2: 30, m3: 30 } };
    // Fewest payments: Charlie pays Alice 30 straight (not the pair Charlie owes).
    const pay: Expense = { ...base, id: 'e3', title: 'Settlement: Charlie ➔ Alice', amount: 30, category: 'cat-misc', paidBy: 'm3', splitMode: 'exact', splitMemberIds: ['m1'], resolvedShares: { m1: 30 }, isSettlement: true };

    it('is settled in both views once everyone is square', () => {
      const fewest = calculateSettlements(trip, members, [e1, e2, pay], [], { simplifyDebts: true });
      const perPerson = calculateSettlements(trip, members, [e1, e2, pay], [], { simplifyDebts: false });
      expect(fewest.transfers).toEqual([]);
      expect(perPerson.transfers).toEqual([]);
      expect(perPerson.balances.every((b) => Math.abs(b.balance) < 0.01)).toBe(true);
    });

    it('a settled group settles its members too, in Per person', () => {
      const couple: Group = { id: 'g1', name: 'Bob & Charlie', memberIds: ['m2', 'm3'], tripId: 't1', createdAt: 0, updatedAt: 0 } as Group;
      const dinner: Expense = { ...base, id: 'd1', title: 'Dinner', amount: 90, paidBy: 'm1', splitMemberIds: ['m1', 'm2', 'm3'], resolvedShares: { m1: 30, m2: 30, m3: 30 } };
      // Bob settles the whole group's 60 with Alice.
      const groupPay: Expense = { ...pay, id: 'g-pay', title: 'Settlement: Bob & Charlie ➔ Alice', amount: 60, paidBy: 'm2', resolvedShares: { m1: 60 } };
      const per = calculateSettlements(trip, members, [dinner, groupPay], [couple], { simplifyDebts: false });
      const few = calculateSettlements(trip, members, [dinner, groupPay], [couple], { simplifyDebts: true });
      expect(few.transfers).toEqual([]);
      expect(per.transfers).toEqual([]);
    });

    it('Members list: a settled group shows square for its members', () => {
      const couple: Group = { id: 'g1', name: 'Bob & Charlie', memberIds: ['m2', 'm3'] };
      const dinner: Expense = { ...base, id: 'd1', title: 'Dinner', amount: 90, paidBy: 'm1', splitMemberIds: ['m1', 'm2', 'm3'], resolvedShares: { m1: 30, m2: 30, m3: 30 } };
      const groupPay: Expense = { ...pay, id: 'g-pay', title: 'Settlement: Bob & Charlie ➔ Alice', amount: 60, paidBy: 'm2', resolvedShares: { m1: 60 } };
      const { balances } = calculateSettlements(trip, members, [dinner, groupPay], [couple], { simplifyDebts: false });
      expect(balances.find((b) => b.memberId === 'm2')?.balance).toBe(30); // real, offsetting
      expect(memberBalancesForDisplay(balances, [couple]).every((b) => b.balance === 0)).toBe(true);
      // still owed: the group is not square, so nothing is hidden
      const open = calculateSettlements(trip, members, [dinner], [couple], { simplifyDebts: false }).balances;
      expect(memberBalancesForDisplay(open, [couple])).toEqual(open);
    });

    it('before the payment both views still show what is owed', () => {
      const perPerson = calculateSettlements(trip, members, [e1, e2], [], { simplifyDebts: false });
      expect(perPerson.transfers).toHaveLength(2);
    });
  });
});

