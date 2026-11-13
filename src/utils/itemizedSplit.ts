import type { ReceiptItem } from '../types';

export interface MemberItemizedBreakdown {
  memberId: string;
  itemsSubtotal: number;
  extrasShare: number;
  totalOwed: number;
  assignedItemCount: number;
}

export interface ItemizedCalculationResult {
  itemsSubtotal: number;
  tax: number;
  tip: number;
  discount: number;
  netExtras: number;
  calculatedTotal: number;
  memberBreakdowns: Record<string, MemberItemizedBreakdown>;
}

/**
 * Calculates member shares from itemized receipt items with proportional
 * allocation of taxes, tips, and discounts.
 */
export function calculateItemizedBreakdown(
  items: ReceiptItem[],
  taxInput: number | string = 0,
  tipInput: number | string = 0,
  discountInput: number | string = 0,
  participants: string[] = []
): ItemizedCalculationResult {
  const tax = Math.max(0, typeof taxInput === 'string' ? parseFloat(taxInput) || 0 : taxInput);
  const tip = Math.max(0, typeof tipInput === 'string' ? parseFloat(tipInput) || 0 : tipInput);
  const discount = Math.max(0, typeof discountInput === 'string' ? parseFloat(discountInput) || 0 : discountInput);
  const netExtras = tax + tip - discount;

  const memberItemSums: Record<string, number> = {};
  const memberItemCounts: Record<string, number> = {};

  participants.forEach((id) => {
    memberItemSums[id] = 0;
    memberItemCounts[id] = 0;
  });

  let itemsSubtotal = 0;

  items.forEach((item) => {
    const itemAmt = Number(item.amount) || 0;
    if (itemAmt <= 0) return;

    itemsSubtotal += itemAmt;

    const assigned = (item.assignedMemberIds || []).filter((id) => participants.includes(id));
    const targetMembers = assigned.length > 0 ? assigned : participants;

    if (targetMembers.length === 0) return;

    const share = itemAmt / targetMembers.length;
    targetMembers.forEach((id) => {
      memberItemSums[id] = (memberItemSums[id] || 0) + share;
      memberItemCounts[id] = (memberItemCounts[id] || 0) + 1;
    });
  });

  const calculatedTotal = Math.max(0, itemsSubtotal + netExtras);
  const memberBreakdowns: Record<string, MemberItemizedBreakdown> = {};

  participants.forEach((id) => {
    const sub = memberItemSums[id] || 0;
    let extrasShare = 0;

    if (itemsSubtotal > 0) {
      extrasShare = (sub / itemsSubtotal) * netExtras;
    } else if (participants.length > 0) {
      extrasShare = netExtras / participants.length;
    }

    const totalOwed = Math.max(0, Math.round((sub + extrasShare) * 100) / 100);

    memberBreakdowns[id] = {
      memberId: id,
      itemsSubtotal: Math.round(sub * 100) / 100,
      extrasShare: Math.round(extrasShare * 100) / 100,
      totalOwed,
      assignedItemCount: memberItemCounts[id] || 0,
    };
  });

  return {
    itemsSubtotal: Math.round(itemsSubtotal * 100) / 100,
    tax,
    tip,
    discount,
    netExtras,
    calculatedTotal: Math.round(calculatedTotal * 100) / 100,
    memberBreakdowns,
  };
}
