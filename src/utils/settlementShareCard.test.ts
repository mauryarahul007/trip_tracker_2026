import { describe, expect, it } from 'vitest';
import {
  buildSettlementShareCaption,
  formatSettlementAmount,
  getSettlementShareCardLayout,
} from './settlementShareCard';

const input = {
  tripName: 'Goa 2026',
  fromLabel: 'Rahul',
  toLabel: 'Priya',
  amount: 1250.5,
  currencySymbol: '₹',
  upiId: 'priya@okaxis',
};

describe('settlementShareCard', () => {
  it('formats amount and reminder caption', () => {
    expect(formatSettlementAmount(1250.5, '₹')).toContain('250.50');
    expect(formatSettlementAmount(1250.5, '₹').startsWith('₹')).toBe(true);
    expect(buildSettlementShareCaption(input)).toContain('to Priya');
    expect(buildSettlementShareCaption(input)).toContain('Goa 2026');
  });

  it('includes UPI and filename in the card layout', () => {
    const layout = getSettlementShareCardLayout(input);
    expect(layout.height).toBe(720);
    expect(layout.lines).toContain('Rahul → Priya');
    expect(layout.lines).toContain('UPI priya@okaxis');
    expect(layout.fileName).toBe('Goa_2026_settle.png');
    expect(layout.caption).toBe(buildSettlementShareCaption(input));
  });

  it('shrinks the card when there is no UPI id', () => {
    const layout = getSettlementShareCardLayout({ ...input, upiId: null });
    expect(layout.height).toBe(640);
    expect(layout.lines.some((l) => l.startsWith('UPI '))).toBe(false);
  });
});
