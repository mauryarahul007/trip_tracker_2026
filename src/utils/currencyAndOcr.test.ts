import { describe, it, expect } from 'vitest';
import { convertCurrency } from './currencyConverter';
import { parseReceiptText } from './receiptOcr';

describe('currencyConverter', () => {
  it('returns exact amount when source and target currencies match', () => {
    const res = convertCurrency(100, 'INR', 'INR');
    expect(res.convertedAmount).toBe(100);
    expect(res.rate).toBe(1);
  });

  it('converts USD to INR accurately using exchange rates', () => {
    const res = convertCurrency(10, 'USD', 'INR');
    expect(res.convertedAmount).toBe(872.5);
    expect(res.rate).toBe(87.25);
  });

  it('converts EUR to USD', () => {
    const res = convertCurrency(100, 'EUR', 'USD');
    expect(res.convertedAmount).toBeCloseTo(108.7, 1);
  });
});

describe('receiptOcr parseReceiptText', () => {
  it('detects total and merchant from Starbucks receipt text', () => {
    const text = `
      Starbucks Coffee #124
      Date: 2026-08-22
      1x Caramel Macchiato  ₹350.00
      1x Croissant          ₹220.00
      Total: ₹570.00
      Thank you!
    `;
    const res = parseReceiptText(text);
    expect(res.amount).toBe(570);
    expect(res.merchant).toBe('Starbucks');
    expect(res.date).toBe('2026-08-22');
    expect(res.confidence).toBeGreaterThan(0.5);
  });

  it('handles Uber receipt text', () => {
    const text = `
      Uber Trip Receipt
      Date: 2026-08-21
      Subtotal: INR 450.00
      Grand Total: 450.00
    `;
    const res = parseReceiptText(text);
    expect(res.amount).toBe(450);
    expect(res.merchant).toBe('Uber');
  });
});
