/**
 * Extracts the primary single destination city for compact card badges
 * when a trip has multi-city stops or routes (e.g. "Manali → Shimla → Chandigarh" => "Manali").
 */
export function extractPrimaryCity(destination?: string, stops?: { name: string }[]): { primary: string; full: string } {
  const full = (destination || (stops && stops.length > 0 ? stops.map((s) => s.name).join(' → ') : '')).trim();
  if (!full) return { primary: '', full: '' };
  const segments = full
    .split(/\s*(?:→|->|=>|—|–|\||\/|,|;)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const primary = segments.length > 0 ? segments[0] : full;
  return { primary, full };
}

export type ItineraryRouteInfo = {
  primary: string;
  full: string;
  segments: string[];
  stopsCount: number;
  routeSummary: string;
  badgeSummary: string;
};

/**
 * Parses and formats multi-city routes and stops for clean card layout.
 * Prevents long multi-city strings from overflowing capsules while providing
 * rich itinerary summaries on the card body (e.g. "Manali ➔ Shimla ➔ Chandigarh").
 */
export function getItineraryRouteInfo(destination?: string, stops?: { name: string }[]): ItineraryRouteInfo {
  const { primary, full } = extractPrimaryCity(destination, stops);
  if (!full) {
    return {
      primary: '',
      full: '',
      segments: [],
      stopsCount: 0,
      routeSummary: '',
      badgeSummary: '',
    };
  }

  const segments = full
    .split(/\s*(?:→|->|=>|—|–|\||\/|,|;)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const stopsCount = segments.length;
  let routeSummary = full;
  let badgeSummary = primary;

  if (stopsCount > 1) {
    badgeSummary = `${primary} (+${stopsCount - 1})`;
    if (stopsCount <= 3) {
      routeSummary = segments.join(' ➔ ');
    } else {
      routeSummary = `${segments[0]} ➔ ${segments[segments.length - 1]} · ${stopsCount} stops`;
    }
  }

  return {
    primary,
    full,
    segments,
    stopsCount,
    routeSummary,
    badgeSummary,
  };
}
