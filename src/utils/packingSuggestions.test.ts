import { describe, it, expect } from 'vitest';
import { generateSmartPackingSuggestions } from './packingSuggestions';

describe('packingSuggestions', () => {
  it('generates beach and sunny suggestions for Goa trip', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Goa, India',
      durationDays: 4,
      weatherCondition: 'Sunny / Clear',
      avgTemp: 31,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('beach-swim');
    expect(ids).toContain('beach-sunscreen');
    expect(ids).toContain('beach-sunglasses');
    expect(ids).not.toContain('cold-jacket');
  });

  it('generates cold weather gear for mountain winter destination', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Manali, Himachal',
      durationDays: 5,
      weatherCondition: 'Chilly',
      avgTemp: 6,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('cold-jacket');
    expect(ids).toContain('cold-thermal');
    expect(ids).toContain('cold-beanie');
  });

  it('includes umbrella and rainwear when rain in weather forecast', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Mumbai',
      durationDays: 3,
      weatherCondition: 'Heavy rain & thunderstorms',
      avgTemp: 26,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('rain-umbrella');
    expect(ids).toContain('rain-bagcover');
  });

  it('includes universal adapter and passport copy for international trip', () => {
    const list = generateSmartPackingSuggestions({
      destination: 'Tokyo, Japan',
      durationDays: 7,
      isInternational: true,
    });

    const ids = list.map((i) => i.id);
    expect(ids).toContain('elec-adapter');
    expect(ids).toContain('doc-passport-copy');
  });
});
