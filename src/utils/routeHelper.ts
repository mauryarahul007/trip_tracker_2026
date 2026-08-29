export interface ParsedRoute {
  origin: string;
  destination: string;
  fullRoute: string;
  allStops: string[];
  isMultiStop: boolean;
}

/**
 * Intelligently parse trip origin, destination, and full itinerary route
 * from stops list, trip destination string, or trip composite title.
 * Examples:
 *  - stops: [{ name: "Guwahati" }, { name: "Shillong" }, { name: "Tawang" }]
 *    => origin: "Guwahati", destination: "Tawang", fullRoute: "Guwahati ➔ Shillong ➔ Tawang"
 *  - destination: "Meghalaya -> Arunachal Pradesh"
 *    => origin: "Meghalaya", destination: "Arunachal Pradesh", fullRoute: "Meghalaya ➔ Arunachal Pradesh"
 *  - destination: "Manali"
 *    => origin: "Origin", destination: "Manali", fullRoute: "Manali"
 */
export function parseTripRoute(trip: {
  name?: string;
  destination?: string;
  stops?: { name: string }[];
}): ParsedRoute {
  const stops = trip.stops?.map((s) => s.name.trim()).filter(Boolean) || [];

  if (stops.length >= 2) {
    return {
      origin: stops[0],
      destination: stops[stops.length - 1],
      fullRoute: stops.join(' ➔ '),
      allStops: stops,
      isMultiStop: true,
    };
  }

  if (stops.length === 1) {
    const rawDest = (trip.destination || trip.name || '').trim();
    const parts = rawDest.split(/->|→|➔|\bto\b|\/| - /i).map((s) => s.trim()).filter(Boolean);
    const dest = parts.length > 1 ? parts[parts.length - 1] : rawDest && rawDest !== stops[0] ? rawDest : stops[0];
    return {
      origin: stops[0],
      destination: dest,
      fullRoute: stops[0] === dest ? stops[0] : `${stops[0]} ➔ ${dest}`,
      allStops: [stops[0], dest].filter((v, i, a) => a.indexOf(v) === i),
      isMultiStop: stops[0] !== dest,
    };
  }

  // Parse composite destination or name (e.g. "Meghalaya -> Arunachal Pradesh", "Delhi to Goa")
  const raw = (trip.destination || trip.name || 'Trip').trim();
  const parts = raw.split(/->|→|➔|\bto\b|\/| - /i).map((s) => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      origin: parts[0],
      destination: parts[parts.length - 1],
      fullRoute: parts.join(' ➔ '),
      allStops: parts,
      isMultiStop: true,
    };
  }

  return {
    origin: raw || 'Departure',
    destination: raw || 'Destination',
    fullRoute: raw,
    allStops: [raw],
    isMultiStop: false,
  };
}
