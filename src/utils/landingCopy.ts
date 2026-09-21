export const DEFAULT_LANDING_HEADLINE = 'Trip Tracker';
export const DEFAULT_LANDING_TAGLINE = 'Split costs effortlessly with travel companions anywhere on earth.';
export const DEFAULT_LANDING_INVITE_BLURB = 'or join with trip code';
export const DEFAULT_EMPTY_TRIP_BLURB = 'Nothing here yet. Start a trip and add who\'s coming.';

export function asCopyString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}
