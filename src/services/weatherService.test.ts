import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWeatherConditionFromCode, getDestinationWeather } from './weatherService';

describe('weatherService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps weather codes to accurate emojis and condition labels', () => {
    expect(getWeatherConditionFromCode(0, true)).toEqual({ emoji: '☀️', text: 'Clear Sky' });
    expect(getWeatherConditionFromCode(0, false)).toEqual({ emoji: '🌙', text: 'Clear Sky' });
    expect(getWeatherConditionFromCode(61, true)).toEqual({ emoji: '🌧️', text: 'Rain' });
    expect(getWeatherConditionFromCode(95, true)).toEqual({ emoji: '⛈️', text: 'Thunderstorm' });
  });

  it('returns null for empty destination', async () => {
    const res = await getDestinationWeather('');
    expect(res).toBeNull();
  });
});
