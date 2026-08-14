import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocode, getCurrentGPSPosition } from './geolocation';

describe('Geolocation Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('formats fallback coordinates gracefully when offline or fetch fails', async () => {
    const lat = 15.5494;
    const lng = 73.7535;
    
    // Simulate failed fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const placeName = await reverseGeocode(lat, lng);
    expect(placeName).toBe('15.549°, 73.754°');
  });

  it('safely handles missing navigator.geolocation', async () => {
    const originalGeo = globalThis.navigator.geolocation;
    // @ts-ignore
    delete (globalThis.navigator as any).geolocation;

    const pos = await getCurrentGPSPosition(100);
    expect(pos).toBeNull();

    // Restore
    (globalThis.navigator as any).geolocation = originalGeo;
  });
});
