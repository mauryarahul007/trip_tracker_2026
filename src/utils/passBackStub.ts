/**
 * Copy and figures for the Summary pass back (seat-and-gate stub).
 *
 * In a group, the two cells are settlement positions with different
 * counterparties, and they add up to the traveler's personal net:
 *   inside = myNet − groupNet
 *   outside = groupNet
 * With no groups, the left cell is that personal net and the right cell
 * is unsigned cash laid out. Cash and share use the same expense set as
 * calculateSettlements, so paid − share equals the personal net.
 */

const EVEN = 0.01;

export type PassStubTone = 'receive' | 'pay' | 'even' | 'ink';

export interface PassStubCell {
  label: string;
  /** Raw figure. Signed cells use the sign; ink cells display the absolute value. */
  amount: number;
  signed: boolean;
  tone: PassStubTone;
  caption: string;
}

export interface PassStub {
  left: PassStubCell;
  right: PassStubCell;
  /** Personal-net sentence under the two cells. Present only for a group. */
  summary: string | null;
}

export interface PassStubGroup {
  name: string;
  balance: number;
  otherMemberNames: string[];
}

export interface WalletExpense {
  deletedAt?: number | null;
  approvalStatus?: 'confirmed' | 'pending_approval';
  paidBy: string;
  amount: number;
  paidByShares?: Record<string, number>;
  resolvedShares: Record<string, number>;
}

function toneFor(amount: number): PassStubTone {
  if (Math.abs(amount) < EVEN) return 'even';
  return amount > 0 ? 'receive' : 'pay';
}

function firstName(name: string): string {
  const token = name.trim().split(/\s+/)[0];
  return token || 'your partner';
}

function insideCaption(inside: number, groupName: string, others: string[]): string {
  if (Math.abs(inside) < EVEN) return `Square inside ${groupName}`;
  if (others.length === 1) {
    const who = firstName(others[0]);
    return inside > 0 ? `${who} owes you` : `You owe ${who}`;
  }
  if (others.length > 1) {
    return inside > 0
      ? `The rest of ${groupName} owes you`
      : `You owe the rest of ${groupName}`;
  }
  return inside > 0 ? 'Your group owes you' : 'You owe your group';
}

function outsideCaption(outside: number, groupName: string): string {
  if (Math.abs(outside) < EVEN) return 'Square with the trip';
  return outside > 0 ? `${groupName} receives` : `${groupName} pays`;
}

function summaryLine(myNet: number, format: (amount: number) => string): string {
  if (Math.abs(myNet) < EVEN) return 'You are square';
  const amount = format(Math.abs(myNet));
  return myNet > 0 ? `You are ahead ${amount}` : `You are short ${amount}`;
}

export function memberCashAndShare(expenses: WalletExpense[], memberId: string): { paid: number; share: number } {
  let paid = 0;
  let share = 0;
  for (const exp of expenses) {
    if (exp.deletedAt || exp.approvalStatus === 'pending_approval') continue;
    if (exp.paidByShares && Object.keys(exp.paidByShares).length > 0) {
      paid += exp.paidByShares[memberId] || 0;
    } else if (exp.paidBy === memberId) {
      paid += exp.amount;
    }
    share += exp.resolvedShares[memberId] || 0;
  }
  return {
    paid: Number(paid.toFixed(2)),
    share: Number(share.toFixed(2)),
  };
}

export function buildPassStub(
  input: {
    myNet: number;
    group?: PassStubGroup | null;
    paid: number;
    share: number;
  },
  format: (amount: number) => string,
): PassStub {
  const group = input.group;
  if (group) {
    const outside = Number(group.balance.toFixed(2));
    const inside = Number((input.myNet - outside).toFixed(2));
    return {
      left: {
        label: `Inside ${group.name}`,
        amount: inside,
        signed: true,
        tone: toneFor(inside),
        caption: insideCaption(inside, group.name, group.otherMemberNames),
      },
      right: {
        label: `Outside ${group.name}`,
        amount: outside,
        signed: true,
        tone: toneFor(outside),
        caption: outsideCaption(outside, group.name),
      },
      summary: summaryLine(input.myNet, format),
    };
  }

  const net = Number(input.myNet.toFixed(2));
  const netTone = toneFor(net);
  return {
    left: {
      label: netTone === 'pay' ? 'You owe' : netTone === 'receive' ? 'You get' : 'You',
      amount: net,
      signed: true,
      tone: netTone,
      caption: netTone === 'pay' ? 'To pay' : netTone === 'receive' ? 'To receive' : 'Square',
    },
    right: {
      label: 'You paid',
      amount: Number(Math.abs(input.paid).toFixed(2)),
      signed: false,
      tone: 'ink',
      caption: `Your share ${format(Math.abs(input.share))}`,
    },
    summary: null,
  };
}
