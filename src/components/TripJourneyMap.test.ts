import { describe, it, expect } from 'vitest';
import { escapeHtml, calculateBearing, interpolatePath } from './TripJourneyMap';

describe('TripJourneyMap Security - escapeHtml', () => {
  it('escapes standard HTML injection tags', () => {
    const raw = '<script>alert("xss")</script>';
    expect(escapeHtml(raw)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes image onerror payloads', () => {
    const payload = '<img src=x onerror="fetch(\'https://evil.com\')">';
    expect(escapeHtml(payload)).toBe('&lt;img src=x onerror=&quot;fetch(&#39;https://evil.com&#39;)&quot;&gt;');
  });

  it('preserves clean alphanumeric titles and unicode emojis', () => {
    const clean = 'Dinner at Thalassa Greek Restaurant 🏖️ 🍽️';
    expect(escapeHtml(clean)).toBe('Dinner at Thalassa Greek Restaurant 🏖️ 🍽️');
  });

  it('escapes ampersands and quotes in store/merchant names', () => {
    const title = 'Marks & Spencer "Summer" Sale';
    expect(escapeHtml(title)).toBe('Marks &amp; Spencer &quot;Summer&quot; Sale');
  });
});

describe('TripJourneyMap Physics & Math - calculateBearing & interpolatePath', () => {
  it('calculates 0 degree bearing for due North', () => {
    const start: [number, number] = [73.83, 15.38];
    const end: [number, number] = [73.83, 15.58]; // moved North
    const bearing = calculateBearing(start, end);
    expect(Math.round(bearing)).toBe(0);
  });

  it('calculates 90 degree bearing for due East', () => {
    const start: [number, number] = [73.83, 15.38];
    const end: [number, number] = [74.03, 15.38]; // moved East
    const bearing = calculateBearing(start, end);
    expect(Math.round(bearing)).toBe(90);
  });

  it('interpolates intermediate micro-coordinates smoothly', () => {
    const points: [number, number][] = [
      [73.8314, 15.3808],
      [73.7667, 15.5165],
    ];
    const interpolated = interpolatePath(points, 4);
    expect(interpolated.length).toBe(5); // 1 start + 3 intermediates + 1 end
    expect(interpolated[0]).toEqual(points[0]);
    expect(interpolated[interpolated.length - 1]).toEqual(points[1]);
  });
});
