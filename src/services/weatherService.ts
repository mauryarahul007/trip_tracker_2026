/**
 * Ambient Weather Service
 * Lightweight, zero-dependency destination weather and daylight indicator using Open-Meteo REST API.
 * Features Real-Time Stale-While-Revalidate (SWR) caching (20 min fresh, 24h offline fallback).
 */

export interface WeatherData {
  tempC: number;
  tempF: number;
  apparentTempC?: number;
  weatherCode: number;
  weatherEmoji: string;
  condition: string;
  isDay: boolean;
  city: string;
  updatedAt: number;
}

const REALTIME_TTL_MS = 20 * 60 * 1000; // 20 minutes for live freshness
const MAX_OFFLINE_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours offline fallback

export function getWeatherConditionFromCode(code: number, isDay = true): { emoji: string; text: string } {
  switch (code) {
    case 0:
      return { emoji: isDay ? '☀️' : '🌙', text: 'Clear Sky' };
    case 1:
    case 2:
      return { emoji: isDay ? '⛅' : '☁️', text: 'Partly Cloudy' };
    case 3:
      return { emoji: '☁️', text: 'Overcast' };
    case 45:
    case 48:
      return { emoji: '🌫️', text: 'Misty Fog' };
    case 51:
    case 53:
    case 55:
      return { emoji: '🌦️', text: 'Light Drizzle' };
    case 61:
    case 63:
    case 65:
      return { emoji: '🌧️', text: 'Rain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { emoji: '❄️', text: 'Snow' };
    case 80:
    case 81:
    case 82:
      return { emoji: '🌧️', text: 'Rain Showers' };
    case 85:
    case 86:
      return { emoji: '🌨️', text: 'Snow Showers' };
    case 95:
    case 96:
    case 99:
      return { emoji: '⛈️', text: 'Thunderstorm' };
    default:
      return { emoji: isDay ? '☀️' : '🌙', text: 'Fair' };
  }
}

/**
 * Clean and extract place name candidates from composite route titles,
 * normalizing accents and stripping colloquial trip filler words.
 * (e.g. "Weekend in München -> Goa with Friends" => ["Goa", "Munchen"])
 */
export function extractPlaceCandidates(raw: string | string[]): string[] {
  const inputs = Array.isArray(raw) ? raw : [raw];
  const candidates: string[] = [];

  for (const input of inputs) {
    if (!input || typeof input !== 'string') continue;

    // Normalize accents (e.g. München -> Munchen, São Paulo -> Sao Paulo)
    const normalized = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Split by route delimiters: ->, →, to, comma, slash, dash, &
    const segments = normalized.split(/->|→|\bto\b|,|\/| - |&/i);
    const reversed = segments.slice().reverse();

    for (const segment of reversed) {
      const cleaned = segment
        .replace(/\b(trip|backpacking|tour|vacation|getaway|holiday|expedition|voyage|202[0-9]|roadtrip|road\s+trip|with\s+friends|with\s+family|friends|family|weekend|visit|exploring|explore|in|at|with)\b/gi, ' ')
        .replace(/[^a-zA-Z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned.length >= 2 && !candidates.includes(cleaned)) {
        candidates.push(cleaned);
      }

      // If prefixed by directional words (North/South/East/West), also add base name (e.g. "North Goa" -> "Goa")
      const directionalMatch = cleaned.match(/^(?:north|south|east|west|central)\s+([a-zA-Z\s]+)$/i);
      if (directionalMatch && directionalMatch[1]) {
        const baseName = directionalMatch[1].trim();
        if (baseName.length >= 2 && !candidates.includes(baseName)) {
          candidates.push(baseName);
        }
      }
    }
  }

  return candidates;
}

export function cleanPlaceQuery(raw: string): string {
  const candidates = extractPlaceCandidates(raw);
  return candidates[0] || raw.trim();
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    return null;
  }
  return null;
}

/**
 * Detect and discard bogus legacy weather entries that used hardcoded 22°C Clear Day
 */
function isBogusWeather(data: WeatherData | null): boolean {
  if (!data) return true;
  return data.weatherCode === 0 && data.tempC === 22 && data.condition === 'Clear Day' && data.tempF === 72;
}

export async function fetchSingleCoordinate(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
  if (!query) return null;

  // 1. Primary: Open-Meteo Geocoding API
  try {
    const openMeteoGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const res = await fetch(openMeteoGeoUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.results && data.results.length > 0) {
        const first = data.results[0];
        return { lat: first.latitude, lon: first.longitude, name: first.name || query };
      }
    }
  } catch {
    // Network / timeout
  }

  // 2. Secondary: Photon Komoot OSM API
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.length > 0) {
        const [lon, lat] = data.features[0].geometry.coordinates;
        const placeName = data.features[0].properties?.name || query;
        return { lat, lon, name: placeName };
      }
    }
  } catch {
    // Fallback failed
  }

  return null;
}

export async function fetchDestinationCoordinates(destination: string | string[]): Promise<{ lat: number; lon: number; name: string } | null> {
  const candidates = extractPlaceCandidates(destination);
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const coords = await fetchSingleCoordinate(candidate);
    if (coords) return coords;
  }

  return null;
}

async function fetchLiveWeatherFromCoords(coords: { lat: number; lon: number; name: string }, targetName: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) throw new Error('Open-Meteo API error');

    const data = await res.json();
    const current = data?.current;
    if (!current) throw new Error('No current weather payload');

    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const apparentTempC = current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : undefined;
    const weatherCode = current.weather_code ?? 0;
    const isDay = current.is_day !== 0;
    const condition = getWeatherConditionFromCode(weatherCode, isDay);

    return {
      tempC,
      tempF,
      apparentTempC,
      weatherCode,
      weatherEmoji: condition.emoji,
      condition: condition.text,
      isDay,
      city: coords.name || targetName,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Real-Time Weather Check with SWR (Stale-While-Revalidate).
 * - Immediately returns cached data if available (0ms layout lag).
 * - Silently triggers a background refresh if cache is older than 20 minutes (or forced).
 * - Calls `onLiveUpdate` with fresh data when network returns.
 */
export async function getDestinationWeatherRealtime(
  destination: string | string[],
  onLiveUpdate?: (data: WeatherData) => void,
  forceRefresh = false
): Promise<WeatherData | null> {
  const candidates = extractPlaceCandidates(destination);
  if (candidates.length === 0) return null;

  const primaryTarget = candidates[0];
  const cacheKey = `tt_weather_${primaryTarget.toLowerCase().replace(/\s+/g, '_')}`;

  const storage = getStorage();
  let cachedData: WeatherData | null = null;
  try {
    const cachedStr = storage?.getItem(cacheKey);
    if (cachedStr) {
      const parsed: WeatherData = JSON.parse(cachedStr);
      if (isBogusWeather(parsed)) {
        storage?.removeItem(cacheKey);
      } else if (Date.now() - parsed.updatedAt < MAX_OFFLINE_CACHE_MS) {
        cachedData = parsed;
      }
    }
  } catch {
    // Storage access error
  }

  const isCacheFresh = cachedData && (Date.now() - cachedData.updatedAt < REALTIME_TTL_MS);

  // Background fetcher function
  const executeLiveFetch = async (): Promise<WeatherData | null> => {
    const coords = await fetchDestinationCoordinates(candidates);
    if (!coords) return null;

    const fresh = await fetchLiveWeatherFromCoords(coords, primaryTarget);
    if (fresh) {
      try {
        storage?.setItem(cacheKey, JSON.stringify(fresh));
      } catch {
        // ignore storage error
      }
      onLiveUpdate?.(fresh);
      return fresh;
    }
    return null;
  };

  if (!forceRefresh && isCacheFresh) {
    return cachedData;
  }

  if (cachedData && !forceRefresh) {
    // SWR: Return cached immediately, revalidate live in background
    executeLiveFetch().catch(() => {});
    return cachedData;
  }

  // No cache or forced refresh: await live fetch
  const fresh = await executeLiveFetch();
  return fresh || cachedData || null;
}

/**
 * Convenience backward-compatible wrapper
 */
export async function getDestinationWeather(
  destination: string | string[],
  forceRefresh = false
): Promise<WeatherData | null> {
  return getDestinationWeatherRealtime(destination, undefined, forceRefresh);
}
