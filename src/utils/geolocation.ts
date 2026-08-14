import type { ExpenseLocation } from '../types';

const geocodeCache = new Map<string, string>();

/**
 * Gets the device's current GPS position using browser navigator.geolocation.
 * Fails safely with null if unsupported, denied, or timed out.
 */
export async function getCurrentGPSPosition(timeoutMs = 5000): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          });
        }
      },
      () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000, // 1 minute cached position ok
      }
    );
  });
}

/**
 * Performs reverse geocoding via OpenStreetMap's free Nominatim endpoint.
 * Returns a friendly place name like "Baga, Goa" or "Lower Manhattan, New York".
 * Falls back to formatted coordinates when offline or on network failure.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
      const state = addr.state || addr.region;
      const country = addr.country;

      const parts = [neighborhood, city || state, country].filter(Boolean);
      const placeName = parts.slice(0, 2).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;

      geocodeCache.set(cacheKey, placeName);
      return placeName;
    }
  } catch {
    // Network failure / timeout / offline
  }

  const fallback = `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Forward geocoding via Nominatim's free /search endpoint — resolves a typed
 * place name into coordinates. Returns [] when offline, on network failure,
 * or when there are no matches; never throws.
 */
export async function searchPlaces(query: string): Promise<{ lat: number; lng: number; placeName: string }[]> {
  const trimmed = query.trim();
  if (!trimmed || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&addressdetails=1&limit=5`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          lat: Number(Number(item.lat).toFixed(6)),
          lng: Number(Number(item.lon).toFixed(6)),
          placeName: item.display_name?.split(',').slice(0, 3).join(',').trim() || trimmed,
        }));
      }
    }
  } catch {
    // Network failure / timeout / offline
  }

  return [];
}

/**
 * Convenience helper: captures GPS location and resolves its reverse geocoded place name.
 */
export async function captureCurrentExpenseLocation(): Promise<ExpenseLocation | null> {
  const coords = await getCurrentGPSPosition(4000);
  if (!coords) return null;

  const placeName = await reverseGeocode(coords.lat, coords.lng);
  return {
    lat: coords.lat,
    lng: coords.lng,
    placeName,
  };
}
