import { describe, it, expect } from 'vitest';
import { currencyForCountryCode } from './countryCurrencyMap';

describe('currencyForCountryCode', () => {
  it('maps a known country code', () => {
    expect(currencyForCountryCode('IN')).toBe('INR');
    expect(currencyForCountryCode('us')).toBe('USD');
    expect(currencyForCountryCode('DE')).toBe('EUR');
  });

  it('returns null for an unmapped or missing code', () => {
    expect(currencyForCountryCode('ZZ')).toBeNull();
    expect(currencyForCountryCode(undefined)).toBeNull();
    expect(currencyForCountryCode(null)).toBeNull();
    expect(currencyForCountryCode('')).toBeNull();
  });
});
