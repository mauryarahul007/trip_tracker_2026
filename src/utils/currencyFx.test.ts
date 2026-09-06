import { describe, it, expect } from 'vitest';
import { convertCurrency, fetchExchangeRates } from './currencyFx';

describe('currencyFx', () => {
  it('returns same amount for identical currencies', () => {
    const res = convertCurrency(100, 'INR', 'INR', { INR: 1.0 });
    expect(res.convertedAmount).toBe(100);
    expect(res.rate).toBe(1.0);
  });

  it('converts with custom trip rate override when locked', () => {
    const fxConfig = {
      customRates: {
        USD: 85.0, // Fixed 1 USD = 85 INR
      },
    };

    const res = convertCurrency(10, 'USD', 'INR', { USD: 0.0115 }, fxConfig);
    expect(res.convertedAmount).toBe(850);
    expect(res.isCustomRate).toBe(true);
  });

  it('applies optional forex markup percentage', () => {
    const fxConfig = {
      customRates: {
        EUR: 90.0,
      },
      markupPercent: 2.0, // +2% bank charge
    };

    const res = convertCurrency(100, 'EUR', 'INR', {}, fxConfig);
    // 100 * 90 = 9000 * 1.02 = 9180
    expect(res.convertedAmount).toBe(9180);
  });

  it('synthesizes fallback rates correctly when offline', async () => {
    const ratesData = await fetchExchangeRates('INR');
    expect(ratesData.base).toBe('INR');
    expect(ratesData.rates.USD).toBeDefined();
    expect(ratesData.rates.EUR).toBeDefined();
  });
});
