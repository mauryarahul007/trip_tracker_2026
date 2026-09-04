import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getWeatherConditionFromCode,
  getDestinationWeather,
  getDestinationWeatherRealtime,
  extractPlaceCandidates
} from './weatherService';

describe('weatherService', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    mockStore = {};
    const mockStorage = {
      getItem: (k: string) => mockStore[k] ?? null,
      setItem: (k: string, v: string) => { mockStore[k] = v; },
      removeItem: (k: string) => { delete mockStore[k]; },
      clear: () => { mockStore = {}; },
      length: 0,
      key: () => null,
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  it('maps weather codes to accurate emojis and condition labels', () => {
    expect(getWeatherConditionFromCode(0, true)).toEqual({ emoji: '☀️', text: 'Clear Sky' });
    expect(getWeatherConditionFromCode(0, false)).toEqual({ emoji: '🌙', text: 'Clear Sky' });
    expect(getWeatherConditionFromCode(61, true)).toEqual({ emoji: '🌧️', text: 'Rain' });
    expect(getWeatherConditionFromCode(95, true)).toEqual({ emoji: '⛈️', text: 'Thunderstorm' });
  });

  it('extracts place candidates from composite multi-stop strings', () => {
    expect(extractPlaceCandidates('Meghalaya -> Arunachal Pradesh')).toEqual(['Arunachal Pradesh', 'Meghalaya']);
    expect(extractPlaceCandidates('Delhi to Goa Trip 2026')).toEqual(['Goa', 'Delhi']);
    expect(extractPlaceCandidates(['Shillong', 'Tawang'])).toEqual(['Shillong', 'Tawang']);
  });

  it('normalizes accents and strips conversational filler phrases', () => {
    expect(extractPlaceCandidates('Weekend in München 2026')).toContain('Munchen');
    expect(extractPlaceCandidates('Vacation in São Paulo with Friends')).toContain('Sao Paulo');
    expect(extractPlaceCandidates('Exploring North Goa')).toContain('Goa');
  });

  it('returns null for empty destination', async () => {
    const res = await getDestinationWeather('');
    expect(res).toBeNull();
  });

  it('purges legacy bogus 22C cache entries', async () => {
    const cacheKey = 'tt_weather_tokyo';
    localStorage.setItem(cacheKey, JSON.stringify({
      tempC: 22,
      tempF: 72,
      weatherCode: 0,
      condition: 'Clear Day',
      weatherEmoji: '☀️',
      isDay: true,
      city: 'Tokyo',
      updatedAt: Date.now(),
    }));

    // Mock network failure so it cannot fetch fresh
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const res = await getDestinationWeatherRealtime('Tokyo');
    expect(localStorage.getItem(cacheKey)).toBeNull();
    expect(res).toBeNull();
  });
});
