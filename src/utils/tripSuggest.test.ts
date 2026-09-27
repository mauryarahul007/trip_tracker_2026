import { describe, expect, it } from 'vitest';
import { guessTripCurrency, suggestTripName } from './tripSuggest';

describe('guessTripCurrency', () => {
  it('matches countries and well-known cities as whole words', () => {
    expect(guessTripCurrency('Bali, Indonesia')).toBe('IDR');
    expect(guessTripCurrency('Kyoto')).toBe('JPY');
    expect(guessTripCurrency('Paris & Nice')).toBe('EUR');
    expect(guessTripCurrency('New York City')).toBe('USD');
  });
  it('returns null for unknown or domestic places and avoids partial-word hits', () => {
    expect(guessTripCurrency('Manali, Himachal')).toBeNull();
    expect(guessTripCurrency('Goa')).toBeNull();
    expect(guessTripCurrency('Ukhrul')).toBeNull(); // contains "uk" but isn't the UK
  });
});

describe('suggestTripName', () => {
  it('uses the first place, title-cased', () => {
    expect(suggestTripName('goa, india')).toBe('Goa trip');
    expect(suggestTripName('bali & lombok')).toBe('Bali trip');
    expect(suggestTripName('  ')).toBe('');
  });
});
