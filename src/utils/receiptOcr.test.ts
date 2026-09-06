import { describe, it, expect } from 'vitest';
import { parseReceiptText } from './receiptOcr';

describe('receiptOcr', () => {
  it('parses typical restaurant receipt with line items, tax, and total', () => {
    const raw = `
      THE SEASIDE BISTRO
      Date: 2026-10-15  Table: 4

      Butter Garlic Prawns    450.00
      Paneer Tikka            280.00
      2x Garlic Naan          120.00
      Fresh Lime Soda          90.00

      Subtotal               940.00
      GST 5%                  47.00
      Service Charge 10%      94.00
      TOTAL AMOUNT          1081.00
    `;

    const parsed = parseReceiptText(raw, ['member-1', 'member-2']);

    expect(parsed.items.length).toBe(4);
    expect(parsed.items[0].name).toBe('Butter Garlic Prawns');
    expect(parsed.items[0].amount).toBe(450);
    expect(parsed.items[0].assignedMemberIds).toEqual(['member-1', 'member-2']);
    expect(parsed.items[1].name).toBe('Paneer Tikka');
    expect(parsed.items[1].amount).toBe(280);

    expect(parsed.subtotal).toBe(940);
    expect(parsed.tax).toBe(47);
    expect(parsed.tip).toBe(94);
    expect(parsed.total).toBe(1081);
  });

  it('computes total correctly when total is missing', () => {
    const raw = `
      Espresso Coffee    150.00
      Croissant          180.00
      Tax                 16.50
    `;

    const parsed = parseReceiptText(raw);

    expect(parsed.items.length).toBe(2);
    expect(parsed.items[0].amount).toBe(150);
    expect(parsed.items[1].amount).toBe(180);
    expect(parsed.tax).toBe(16.5);
    expect(parsed.total).toBe(346.5);
  });
});
