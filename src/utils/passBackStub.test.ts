import { describe, expect, it } from 'vitest';
import { buildPassStub, memberCashAndShare, type WalletExpense } from './passBackStub';

const rupee = (amount: number) => `₹${amount.toFixed(2)}`;

describe('buildPassStub', () => {
  it('splits a couple into inside and outside cells that add up to the personal net', () => {
    const stub = buildPassStub({
      myNet: 48732,
      paid: 62000,
      share: 13268,
      group: { name: '2B', balance: 14500, otherMemberNames: ['Ananya Sharma'] },
    }, rupee);

    expect(stub.left).toMatchObject({
      label: 'Inside 2B',
      amount: 34232,
      signed: true,
      tone: 'receive',
      caption: 'Ananya owes you',
    });
    expect(stub.right).toMatchObject({
      label: 'Outside 2B',
      amount: 14500,
      signed: true,
      tone: 'receive',
      caption: '2B receives',
    });
    expect(stub.left.amount + stub.right.amount).toBe(48732);
    expect(stub.summary).toBe('You are ahead ₹48732.00');
  });

  it('names the partner when you owe them, and the group when the group pays the trip', () => {
    const stub = buildPassStub({
      myNet: -100,
      paid: 0,
      share: 100,
      group: { name: '2B', balance: 50, otherMemberNames: ['Sam'] },
    }, rupee);

    expect(stub.left.amount).toBe(-150);
    expect(stub.left.tone).toBe('pay');
    expect(stub.left.caption).toBe('You owe Sam');
    expect(stub.right.caption).toBe('2B receives');
    expect(stub.summary).toBe('You are short ₹100.00');
  });

  it('talks about the rest of the group when more than one other member shares it', () => {
    const stub = buildPassStub({
      myNet: 80,
      paid: 80,
      share: 0,
      group: { name: 'Family', balance: 20, otherMemberNames: ['Asha', 'Dev'] },
    }, rupee);

    expect(stub.left.caption).toBe('The rest of Family owes you');
    expect(stub.right.tone).toBe('receive');
  });

  it('marks both cells square when the couple and the trip are even', () => {
    const stub = buildPassStub({
      myNet: 0,
      paid: 10,
      share: 10,
      group: { name: '2B', balance: 0, otherMemberNames: ['Ananya'] },
    }, rupee);

    expect(stub.left.tone).toBe('even');
    expect(stub.left.caption).toBe('Square inside 2B');
    expect(stub.right.caption).toBe('Square with the trip');
    expect(stub.summary).toBe('You are square');
  });

  it('shows cash laid out unsigned when the trip has no groups', () => {
    const stub = buildPassStub({
      myNet: 4200,
      paid: 18000,
      share: 13800,
      group: null,
    }, rupee);

    expect(stub.left).toMatchObject({
      label: 'You get',
      amount: 4200,
      signed: true,
      tone: 'receive',
      caption: 'To receive',
    });
    expect(stub.right).toMatchObject({
      label: 'You paid',
      amount: 18000,
      signed: false,
      tone: 'ink',
      caption: 'Your share ₹13800.00',
    });
    expect(stub.summary).toBeNull();
  });

  it('labels a personal shortfall as you owe', () => {
    const stub = buildPassStub({
      myNet: -500,
      paid: 100,
      share: 600,
    }, rupee);

    expect(stub.left.label).toBe('You owe');
    expect(stub.left.tone).toBe('pay');
    expect(stub.left.caption).toBe('To pay');
  });
});

describe('memberCashAndShare', () => {
  const expenses: WalletExpense[] = [
    { paidBy: 'me', amount: 100, resolvedShares: { me: 40, them: 60 } },
    { paidBy: 'them', amount: 50, resolvedShares: { me: 25, them: 25 }, isSettlement: true } as WalletExpense,
    {
      paidBy: 'me',
      amount: 30,
      paidByShares: { me: 10, them: 20 },
      resolvedShares: { me: 15, them: 15 },
    },
    { paidBy: 'me', amount: 999, resolvedShares: { me: 999 }, approvalStatus: 'pending_approval' },
    { paidBy: 'me', amount: 888, resolvedShares: { me: 888 }, deletedAt: 1 },
  ];

  it('counts payments and shares the way the balance engine does', () => {
    const wallet = memberCashAndShare(expenses, 'me');
    expect(wallet.paid).toBe(110);
    expect(wallet.share).toBe(80);
  });
});
