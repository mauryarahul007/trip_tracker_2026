import { describe, expect, it, vi } from 'vitest';
import {
  applyPlaceFixes,
  findPlaceFixes,
  currencyForCountry,
  didYouMean,
  editDistance,
  localSuggestions,
  mergeSuggestions,
  onlineSuggestions,
  replacePlace,
  type PlaceSuggestion,
} from './placeSuggest';

const online = (name: string, countryCode = 'XX'): PlaceSuggestion => ({ name, detail: '', countryCode, source: 'online' });

describe('editDistance', () => {
  it('counts a swapped pair as one edit', () => {
    expect(editDistance('swtizerland', 'switzerland')).toBe(1);
    expect(editDistance('goa', 'goa')).toBe(0);
  });
});

describe('localSuggestions', () => {
  it('fixes the typos the online geocoder missed or ranked low', () => {
    expect(localSuggestions('Munar')[0].name).toBe('Munnar');
    expect(localSuggestions('Udaipr')[0].name).toBe('Udaipur');
    expect(localSuggestions('Darjeling')[0].name).toBe('Darjeeling');
    expect(localSuggestions('Baali')[0].name).toBe('Bali');
    expect(localSuggestions('Swtizerland')[0].name).toBe('Switzerland');
  });
  it('autocompletes by prefix while typing', () => {
    expect(localSuggestions('Rish').map((s) => s.name)).toContain('Rishikesh');
  });
  it('includes past destinations', () => {
    expect(localSuggestions('Tirthan', ['Tirthan Valley'])[0].name).toBe('Tirthan Valley');
  });
});

describe('didYouMean', () => {
  it('suggests a fix for a misspelled place and leaves correct ones alone', () => {
    expect(didYouMean('Swtizerland', [])?.suggestion.name).toBe('Switzerland');
    expect(didYouMean('Goa, Gokrana', [])).toMatchObject({ typed: 'Gokrana', suggestion: { name: 'Gokarna' } });
    expect(didYouMean('Manali', [])).toBeNull();
  });
  it('never "corrects" a real place that is merely longer', () => {
    expect(didYouMean('Goa Beach', [online('Goa Beach', 'GR')])).toBeNull();
  });
  it('uses online candidates for places not in the gazetteer', () => {
    expect(didYouMean('Tirthn', [online('Tirthan', 'IN')])?.suggestion.name).toBe('Tirthan');
  });
});

describe('helpers', () => {
  it('replaces only the misspelled place', () => {
    expect(replacePlace('Goa, Gokrana', 'Gokrana', 'Gokarna')).toBe('Goa, Gokarna');
  });
  it('merges local first without duplicates', () => {
    const local = localSuggestions('Kyoto');
    expect(mergeSuggestions(local, [online('Kyoto', 'JP'), online('Kyōto Station', 'JP')]).map((s) => s.name)).toEqual([
      'Kyoto',
      'Kyōto Station',
    ]);
  });
  it('maps countries to currencies', () => {
    expect(currencyForCountry('id')).toBe('IDR');
    expect(currencyForCountry('ZZ')).toBeNull();
  });
});

describe('onlineSuggestions', () => {
  it('maps Photon places, and returns [] (never throws) on network failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [{ properties: { name: 'Gangtok', state: 'Sikkim', country: 'India', countrycode: 'in' } }] }),
    } as Response);
    expect(await onlineSuggestions('Gangtk')).toEqual([
      { name: 'Gangtok', detail: 'Sikkim, India', countryCode: 'IN', source: 'online' },
    ]);
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('offline'));
    expect(await onlineSuggestions('Somewhereq')).toEqual([]);
  });
});

describe('multiple misspelled places', () => {
  it('finds every typo in order and fixes them all without touching correct ones', () => {
    const text = 'Gangtk, Darjeling & Goa';
    const fixes = findPlaceFixes(text, []);
    expect(fixes.map((f) => [f.typed, f.suggestion.name])).toEqual([
      ['Gangtk', 'Gangtok'],
      ['Darjeling', 'Darjeeling'],
    ]);
    expect(applyPlaceFixes(text, fixes)).toBe('Gangtok, Darjeeling & Goa');
  });
  it('uses online candidates for every place, not just the last one typed', () => {
    const fixes = findPlaceFixes('Tirthn, Jibhii', [online('Tirthan', 'IN'), online('Jibhi', 'IN')]);
    expect(fixes.map((f) => f.suggestion.name)).toEqual(['Tirthan', 'Jibhi']);
  });
});
