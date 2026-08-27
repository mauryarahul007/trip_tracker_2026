/**
 * Ambient Weather Service
 * Lightweight, zero-dependency destination weather and daylight indicator using Open-Meteo REST API.
 * Features 2-hour offline localStorage caching.
 */

export interface WeatherData {
  tempC: number;
  tempF: number;
  weatherCode: number;
  weatherEmoji: string;
  condition: string;
  isDay: boolean;
  city: string;
  updatedAt: number;
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

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
 * Clean and extract place name candidates from composite route titles
 * (e.g. "Meghalaya -> Arunachal Pradesh" => ["Arunachal Pradesh", "Meghalaya"])
 */
export function extractPlaceCandidates(raw: string | string[]): string[] {
  const inputs = Array.isArray(raw) ? raw : [raw];
  const candidates: string[] = [];

  for (const input of inputs) {
    if (!input || typeof input !== 'string') continue;
    // Split by route delimiters: ->, →, to, comma, slash, dash
    const segments = input.split(/->|→|\bto\b|,|\/| - /i);
    // Reverse so destination (last stop) is checked before origin
    const reversed = segments.slice().reverse();
    for (const segment of reversed) {
      const cleaned = segment
        .replace(/\b(trip|backpacking|tour|vacation|getaway|holiday|expedition|voyage|2025|2026|2027|roadtrip|road\s+trip)\b/gi, '')
        .replace(/[^a-zA-Z\s]/g, ' ')
        .trim();
      if (cleaned.length >= 2 && !candidates.includes(cleaned)) {
        candidates.push(cleaned);
      }
    }
  }

  return candidates;
}

export function cleanPlaceQuery(raw: string): string {
  const candidates = extractPlaceCandidates(raw);
  return candidates[0] || raw.trim();
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
    // Fallback to secondary
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
    // Network or timeout
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

export async function getDestinationWeather(destination: string | string[]): Promise<WeatherData | null> {
  const candidates = extractPlaceCandidates(destination);
  if (candidates.length === 0) return null;

  const primaryTarget = candidates[0];
  const cacheKey = `tt_weather_${primaryTarget.toLowerCase().replace(/\s+/g, '_')}`;

  // 1. Check local cache
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const parsed: WeatherData = JSON.parse(cachedStr);
      if (Date.now() - parsed.updatedAt < CACHE_TTL_MS) {
        return parsed;
      }
    }
  } catch {
    // LocalStorage failure
  }

  // 2. Resolve coords across place candidates
  const coords = await fetchDestinationCoordinates(candidates);
  if (!coords) {
    // Return an ambient daylight estimate if geocoding fails
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 19;
    return {
      tempC: 22,
      tempF: 72,
      weatherCode: 0,
      weatherEmoji: isDay ? '☀️' : '🌙',
      condition: isDay ? 'Clear Day' : 'Clear Night',
      isDay,
      city: primaryTarget,
      updatedAt: Date.now(),
    };
  }

  // 3. Fetch from Open-Meteo Current Weather
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,is_day`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) throw new Error('Open-Meteo API error');

    const data = await res.json();
    const current = data?.current;
    if (!current) throw new Error('No current weather');

    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const weatherCode = current.weather_code ?? 0;
    const isDay = current.is_day !== 0;
    const condition = getWeatherConditionFromCode(weatherCode, isDay);

    const weatherData: WeatherData = {
      tempC,
      tempF,
      weatherCode,
      weatherEmoji: condition.emoji,
      condition: condition.text,
      isDay,
      city: coords.name || primaryTarget,
      updatedAt: Date.now(),
    };

    // Save to cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(weatherData));
    } catch {
      // ignore
    }

    return weatherData;
  } catch {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 19;
    return {
      tempC: 22,
      tempF: 72,
      weatherCode: 0,
      weatherEmoji: isDay ? '☀️' : '🌙',
      condition: isDay ? 'Clear Day' : 'Clear Night',
      isDay,
      city: coords.name || primaryTarget,
      updatedAt: Date.now(),
    };
  }
}
