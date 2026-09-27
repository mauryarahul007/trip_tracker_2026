import { describe, expect, it } from 'vitest';
import { formatAmount, formatMoneyNumber } from './currency';

const two = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const zero = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

describe('formatMoneyNumber', () => {
  it('uses two decimals and grouping for normal currencies', () => {
    expect(formatMoneyNumber(12500, 'INR')).toBe(two(12500));
    expect(formatMoneyNumber(12500, '₹')).toBe(two(12500));
  });
  it('drops decimals for zero-decimal currencies, by code or by the JPY symbol', () => {
    expect(formatMoneyNumber(1500.4, 'JPY')).toBe(zero(1500));
    expect(formatMoneyNumber(1500.4, '¥')).toBe(zero(1500));
    expect(formatMoneyNumber(98000, 'KRW')).toBe(zero(98000));
  });
  it('never renders NaN', () => {
    expect(formatMoneyNumber(Number.NaN, 'USD')).toBe(two(0));
  });
  it('formatAmount prefixes the symbol and follows the same decimals', () => {
    expect(formatAmount(1500, '¥')).toBe(`¥${zero(1500)}`);
    expect(formatAmount(6850, '₹')).toBe(`₹${two(6850)}`);
  });
});
