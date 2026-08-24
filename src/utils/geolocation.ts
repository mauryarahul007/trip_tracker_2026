import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { ExpenseLocation, TripStop } from '../types';

const geocodeCache = new Map<string, string>();

/**
 * Gets the device's current GPS position. Uses the Capacitor Geolocation
 * plugin on native platforms, browser navigator.geolocation on web.
 * Fails safely with null if unsupported, denied, or timed out.
 */
export async function getCurrentGPSPosition(timeoutMs = 5000): Promise<{ lat: number; lng: number } | null> {
  if (Capacitor.isNativePlatform()) {
    return getCurrentGPSPositionNative(timeoutMs);
  }
  return getCurrentGPSPositionWeb(timeoutMs);
}

async function getCurrentGPSPositionNative(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      return null;
    }

    // Don't just trust the plugin to honor its own `timeout` option — race
    // it against our own timer too, same as the web path, so a hung
    // native call can't block the caller (awaited synchronously in the
    // expense form) indefinitely.
    const position = await new Promise<Awaited<ReturnType<typeof Geolocation.getCurrentPosition>> | null>((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, timeoutMs);

      Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: timeoutMs })
        .then((pos) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(pos);
          }
        })
        .catch(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        });
    });

    if (!position) return null;
    return {
      lat: Number(position.coords.latitude.toFixed(6)),
      lng: Number(position.coords.longitude.toFixed(6)),
    };
  } catch {
    return null;
  }
}

function getCurrentGPSPositionWeb(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    return Promise.resolve(null);
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

  // Strategy 1: Photon API by Komoot (sub-100ms, open CORS, 0 rate limit)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5`;
    const res = await fetch(photonUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map((feat: any) => {
          const [lng, lat] = feat.geometry.coordinates;
          const p = feat.properties || {};
          const label = [p.name, p.city || p.state, p.country].filter(Boolean).slice(0, 2).join(', ') || trimmed;
          return {
            lat: Number(Number(lat).toFixed(6)),
            lng: Number(Number(lng).toFixed(6)),
            placeName: label,
          };
        });
      }
    }
  } catch {
    // Fall back to Nominatim
  }

  // Strategy 2: Nominatim fallback
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

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function squaredDist(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
}

// A runner-up candidate within this fraction of the winner's distance to
// the reference point counts as a "near tie" -- close enough that device
// location gets to break it instead. Wide enough to catch genuine
// coin-flips, narrow enough that it never overrides a clear winner.
const TIE_BREAK_RATIO = 1.2;

/**
 * Geocodes a trip's stops, disambiguating ambiguous place names (e.g.
 * "Pelling" matches both the Sikkim tourist town and a village in Germany)
 * by preferring whichever candidate sits closest to a shared reference
 * point built from the trip's OTHER stops, instead of blindly trusting the
 * geocoder's own top result. Stops that already have coordinates pass
 * through unchanged and also anchor the reference point for their siblings.
 *
 * The reference point is the per-axis MEDIAN of every stop's naive
 * top-candidate, not the mean -- a mean lets a single bad pick (Pelling's
 * top hit is a German village) drag the reference point far enough that a
 * plausible-but-wrong candidate for a NEIGHBOR (e.g. a same-named town in
 * China) can end up closer to it than that neighbor's correct match. The
 * median mostly ignores an outlier instead of being pulled toward it.
 *
 * `useDeviceLocation` (only pass true when the caller already has Geotag
 * Expenses consent -- this reuses that permission, it doesn't prompt fresh)
 * pulls the device's current GPS fix and uses it two ways: as the
 * reference point itself for a single-stop trip (no other stops to build
 * one from), and as a tie-breaker when two candidates are near-equally
 * close to the stops-based reference. It deliberately does NOT override a
 * clear stops-based winner -- most trip planning happens before departure,
 * so "closest to the user right now" is often nowhere near the actual
 * destination and would make things worse as a primary signal.
 */
export async function resolveTripStopCoordinates(
  stops: TripStop[],
  opts?: { useDeviceLocation?: boolean }
): Promise<TripStop[]> {
  const [candidateLists, deviceLocation] = await Promise.all([
    Promise.all(
      stops.map(async (s) => {
        if (typeof s.lat === 'number' && typeof s.lng === 'number') return null;
        try {
          const results = await searchPlaces(s.name);
          return results.length > 0 ? results : null;
        } catch {
          return null;
        }
      })
    ),
    opts?.useDeviceLocation ? getCurrentGPSPosition(3000) : Promise.resolve(null),
  ]);

  const naivePicks: { lat: number; lng: number }[] = [];
  stops.forEach((s, idx) => {
    if (typeof s.lat === 'number' && typeof s.lng === 'number') {
      naivePicks.push({ lat: s.lat, lng: s.lng });
      return;
    }
    const candidates = candidateLists[idx];
    if (candidates) naivePicks.push({ lat: candidates[0].lat, lng: candidates[0].lng });
  });

  // Fewer than 2 reference points -- nothing stops-based to disambiguate
  // against. Fall back to device location as the reference if we have it,
  // else keep the geocoder's own top result.
  if (naivePicks.length < 2) {
    return stops.map((s, idx) => {
      if (typeof s.lat === 'number' && typeof s.lng === 'number') return s;
      const candidates = candidateLists[idx];
      if (!candidates) return s;
      if (deviceLocation) {
        const best = candidates.reduce((closest, c) =>
          squaredDist(c, deviceLocation) < squaredDist(closest, deviceLocation) ? c : closest
        );
        return { ...s, lat: best.lat, lng: best.lng };
      }
      return { ...s, lat: candidates[0].lat, lng: candidates[0].lng };
    });
  }

  const reference = {
    lat: median(naivePicks.map((p) => p.lat)),
    lng: median(naivePicks.map((p) => p.lng)),
  };

  return stops.map((s, idx) => {
    if (typeof s.lat === 'number' && typeof s.lng === 'number') return s;
    const candidates = candidateLists[idx];
    if (!candidates || candidates.length === 0) return s;

    const ranked = [...candidates].sort((a, b) => squaredDist(a, reference) - squaredDist(b, reference));
    const winner = ranked[0];
    const runnerUp = ranked[1];

    // Only let device location decide when the top two are a near-toss-up
    // by the stops-based reference -- never when there's a clear winner.
    if (deviceLocation && runnerUp) {
      const winnerDist = squaredDist(winner, reference);
      const runnerDist = squaredDist(runnerUp, reference);
      if (runnerDist <= winnerDist * TIE_BREAK_RATIO) {
        const byDevice = squaredDist(winner, deviceLocation) <= squaredDist(runnerUp, deviceLocation) ? winner : runnerUp;
        return { ...s, lat: byDevice.lat, lng: byDevice.lng };
      }
    }

    return { ...s, lat: winner.lat, lng: winner.lng };
  });
}
