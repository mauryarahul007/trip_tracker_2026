/**
 * Places whose cover photos can rotate on the home stack and list cards.
 * Order is the destination text first (what the card already shows), then
 * any route stops that were not already named there.
 */
const PLACE_SPLIT = /\s*(?:→|->|=>|—|–|\||\/|,|;|&|\band\b)\s*/i;

export function collectTripPhotoPlaces(destination?: string, stops?: string[]): string[] {
  const seen = new Set<string>();
  const places: string[] = [];

  const add = (raw?: string) => {
    const name = raw?.trim() ?? '';
    if (name.length < 2 || /^\d+$/.test(name)) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    places.push(name);
  };

  for (const part of (destination || '').split(PLACE_SPLIT)) add(part);
  for (const stop of stops || []) add(stop);
  return places;
}
