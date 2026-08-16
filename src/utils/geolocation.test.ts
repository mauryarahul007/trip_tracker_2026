import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocode, getCurrentGPSPosition } from './geolocation';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

const requestPermissionsMock = vi.fn();
const getCurrentPositionMock = vi.fn();
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    requestPermissions: (...args: unknown[]) => requestPermissionsMock(...args),
    getCurrentPosition: (...args: unknown[]) => getCurrentPositionMock(...args),
  },
}));

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

describe('Geolocation Utility - native platform', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    requestPermissionsMock.mockReset();
    getCurrentPositionMock.mockReset();
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  it('uses the Capacitor Geolocation plugin when running natively', async () => {
    requestPermissionsMock.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    getCurrentPositionMock.mockResolvedValue({
      coords: { latitude: 15.5493879, longitude: 73.7535181 },
    });

    const pos = await getCurrentGPSPosition(4000);

    expect(requestPermissionsMock).toHaveBeenCalled();
    expect(getCurrentPositionMock).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: true, timeout: 4000 })
    );
    expect(pos).toEqual({ lat: 15.549388, lng: 73.753518 });
  });

  it('returns null when native permission is denied', async () => {
    requestPermissionsMock.mockResolvedValue({ location: 'denied', coarseLocation: 'denied' });

    const pos = await getCurrentGPSPosition(4000);

    expect(pos).toBeNull();
    expect(getCurrentPositionMock).not.toHaveBeenCalled();
  });

  it('returns null when the native plugin throws', async () => {
    requestPermissionsMock.mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    getCurrentPositionMock.mockRejectedValue(new Error('native GPS error'));

    const pos = await getCurrentGPSPosition(4000);

    expect(pos).toBeNull();
  });
});
