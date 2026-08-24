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

export async function fetchDestinationCoordinates(destination: string): Promise<{ lat: number; lon: number } | null> {
  if (!destination || destination.trim().length === 0) return null;
  const cleanQuery = encodeURIComponent(destination.trim());
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${cleanQuery}&limit=1`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.features?.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
  } catch {
    // Network or timeout
  }
  return null;
}

export async function getDestinationWeather(destination: string): Promise<WeatherData | null> {
  if (!destination || destination.trim().length === 0) return null;
  const cacheKey = `tt_weather_${destination.trim().toLowerCase()}`;

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

  // 2. Resolve coords
  const coords = await fetchDestinationCoordinates(destination);
  if (!coords) return null;

  // 3. Fetch from Open-Meteo
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,is_day`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const data = await res.json();
    const current = data?.current;
    if (!current) return null;

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
      city: destination,
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
    // Silent fallback
    return null;
  }
}
