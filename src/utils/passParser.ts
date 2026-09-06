import type { TravelPassType, Member } from '../types';

export interface ParsedTravelPass {
  type: TravelPassType;
  title: string;
  provider?: string;
  referenceCode?: string;
  bookingId?: string;
  passengerName?: string;
  legIdentifier?: string;
  startDateTime?: string;
  endDateTime?: string;
  origin?: string;
  destination?: string;
  seatOrRoom?: string;
  address?: string;
  phone?: string;
  notes?: string;
}

export interface ParsedFlightSegment {
  carrierCode: string;
  flightNumber: string;
  provider: string;
  origin: string;
  destination: string;
  depTime: string;
  arrTime?: string;
  dateStr: string;
  segmentPnr?: string;
  seatOrRoom?: string;
  terminal?: string;
}

/**
 * Standard mapping of popular airport cities to 3-letter IATA codes.
 */
export const CITY_TO_IATA: Record<string, string> = {
  bangalore: 'BLR',
  bengaluru: 'BLR',
  hyderabad: 'HYD',
  bagdogra: 'IXB',
  delhi: 'DEL',
  'new delhi': 'DEL',
  mumbai: 'BOM',
  bombay: 'BOM',
  kolkata: 'CCU',
  calcutta: 'CCU',
  chennai: 'MAA',
  madras: 'MAA',
  goa: 'GOI',
  dabolim: 'GOI',
  mopa: 'GOX',
  pune: 'PNQ',
  jaipur: 'JAI',
  ahmedabad: 'AMD',
  kochi: 'COK',
  cochin: 'COK',
  srinagar: 'SXR',
  chandigarh: 'IXC',
  lucknow: 'LKO',
  guwahati: 'GAU',
  amritsar: 'ATQ',
  varanasi: 'VNS',
  patna: 'PAT',
  bhubaneswar: 'BBI',
  indore: 'IDR',
  coimbatore: 'CJB',
  thiruvananthapuram: 'TRV',
  trivandrum: 'TRV',
  mangalore: 'IXE',
  mangaluru: 'IXE',
  nagpur: 'NAG',
  vishakhapatnam: 'VTZ',
  vizag: 'VTZ',
  madurai: 'IXM',
  vadodara: 'BDQ',
  dehradun: 'DED',
  ranchi: 'IXR',
  raipur: 'RPR',
  shillong: 'SHL',
  portblair: 'IXZ',
  'port blair': 'IXZ',
  dubai: 'DXB',
  singapore: 'SIN',
  london: 'LHR',
  bangkok: 'BKK',
  paris: 'CDG',
  frankfurt: 'FRA',
  doha: 'DOH',
  abu_dhabi: 'AUH',
  'abu dhabi': 'AUH',
  colombo: 'CMB',
  kathmandu: 'KTM',
  tokyo: 'HND',
  new_york: 'JFK',
  'new york': 'JFK',
  san_francisco: 'SFO',
  'san francisco': 'SFO',
};

/**
 * Resolves a city name or uppercase code to a standard 3-letter IATA code.
 */
export function resolveAirportCode(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }
  const clean = trimmed.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  if (CITY_TO_IATA[clean]) {
    return CITY_TO_IATA[clean];
  }
  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (clean.includes(city) || city.includes(clean)) {
      return code;
    }
  }
  return trimmed;
}

/**
 * Strips title prefixes (Mr, Ms, Mrs, Dr, Master), category suffixes (Adult, Child),
 * and converts ALL CAPS names to Title Case.
 */
export function cleanPassengerName(raw: string): string {
  const stripped = raw
    .replace(/\s*\([A-Za-z\s]+\)/g, '')
    .replace(/^(?:Mr|Ms|Mrs|Dr|Master)\.?\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If the name is ALL CAPS, convert to Title Case (e.g. "RAHUL MAURYA" -> "Rahul Maurya")
  if (stripped && stripped === stripped.toUpperCase() && /[A-Z]/.test(stripped)) {
    return stripped
      .toLowerCase()
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  return stripped;
}

/**
 * Fuzzy-matches an extracted passenger name to a trip member.
 */
export function matchPassengerToMember(
  passengerName: string,
  members: Record<string, Member> | Member[]
): string | undefined {
  const list = Array.isArray(members) ? members : Object.values(members || {});
  if (!passengerName || list.length === 0) return undefined;
  const cleanPass = cleanPassengerName(passengerName).toLowerCase();
  const passParts = cleanPass.split(' ').filter(Boolean);

  for (const m of list) {
    const memName = (m.name || '').toLowerCase().trim();
    if (!memName) continue;
    // 1. Exact match
    if (memName === cleanPass) return m.id;
    // 2. Member first name equals passenger first name (e.g. "Rahul" in "Rahul Maurya")
    const memParts = memName.split(' ').filter(Boolean);
    if (memParts[0] && passParts[0] && memParts[0] === passParts[0]) {
      return m.id;
    }
    // 3. Passenger includes member name or vice versa
    if (cleanPass.includes(memName) || memName.includes(cleanPass)) {
      return m.id;
    }
  }
  return undefined;
}

export const AIRLINE_PROVIDERS = [
  'IndiGo',
  'Air India',
  'Air India Express',
  'Vistara',
  'SpiceJet',
  'Akasa Air',
  'Emirates',
  'Qatar Airways',
  'Singapore Airlines',
  'Etihad Airways',
  'Ryanair',
  'EasyJet',
  'British Airways',
  'Lufthansa',
  'Air France',
  'KLM',
  'United Airlines',
  'Delta Air Lines',
  'American Airlines',
];

export const OTHER_PROVIDERS = [
  'IRCTC',
  'Indian Railways',
  'Booking.com',
  'Airbnb',
  'Agoda',
  'MakeMyTrip',
  'Goibibo',
  'Cleartrip',
  'Expedia',
  'Marriott',
  'Hilton',
  'Taj Hotels',
  'Hyatt',
  'Uber',
  'Ola',
  'GetYourGuide',
  'Klook',
];

/**
 * Identifies airline provider from carrier code or text snippets.
 */
export function identifyAirlineProvider(text: string, carrierCode: string): string {
  const code = carrierCode.toUpperCase();
  if (code === '6E' || /indigo/i.test(text)) return 'IndiGo';
  if (code === 'AI' || /air\s*india(?!\s*express)/i.test(text)) return 'Air India';
  if (code === 'IX' || /air\s*india\s*express/i.test(text)) return 'Air India Express';
  if (code === 'UK' || /vistara/i.test(text)) return 'Vistara';
  if (code === 'SG' || /spicejet/i.test(text)) return 'SpiceJet';
  if (code === 'QP' || /akasa/i.test(text)) return 'Akasa Air';
  if (code === 'EK' || /emirates/i.test(text)) return 'Emirates';
  if (code === 'QR' || /qatar/i.test(text)) return 'Qatar Airways';
  if (code === 'SQ' || /singapore\s*airlines/i.test(text)) return 'Singapore Airlines';
  if (code === 'BA' || /british\s*airways/i.test(text)) return 'British Airways';
  if (code === 'LH' || /lufthansa/i.test(text)) return 'Lufthansa';
  if (code === 'AF' || /air\s*france/i.test(text)) return 'Air France';
  if (code === 'KL' || /klm/i.test(text)) return 'KLM';
  if (code === 'TG' || /thai\s*airways/i.test(text)) return 'Thai Airways';
  if (code === 'MH' || /malaysia\s*airlines/i.test(text)) return 'Malaysia Airlines';
  if (code === 'CX' || /cathay/i.test(text)) return 'Cathay Pacific';
  if (code === 'UA' || /united/i.test(text)) return 'United Airlines';
  if (code === 'AA' || /american\s*airlines/i.test(text)) return 'American Airlines';
  if (code === 'DL' || /delta/i.test(text)) return 'Delta Air Lines';
  if (code === 'I5') return 'Air India Express';
  if (code === 'G8') return 'Go First';

  const known = AIRLINE_PROVIDERS.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(text));
  if (known) return known;
  return 'Flight';
}

/**
 * Extracts passenger names from ticket text.
 * Resilient to single-line names, multi-line table layouts (e.g. "Ms. Asmita\nBhosale (Adult)"),
 * and deduplicates partial name matches.
 */
export function extractPassengers(text: string): string[] {
  const matches: string[] = [];

  // 1. Multi-line split: Title + FirstName on line 1, LastName on line 2
  // e.g. "Ms. Asmita\nBhosale (Adult)"
  const multiLineRegex = /\b(Mr|Ms|Mrs|Dr|Master)\.?\s+([A-Za-z]{2,25})\r?\n\s*([A-Za-z]{2,25})(?:\s*\([A-Za-z\s]+\))?/gi;
  let mlMatch: RegExpExecArray | null;
  while ((mlMatch = multiLineRegex.exec(text)) !== null) {
    const title = mlMatch[1];
    const first = mlMatch[2];
    const last = mlMatch[3];
    const invalidLast = ['flight', 'bengaluru', 'bangalore', 'delhi', 'mumbai', 'sector', 'status', 'confirmed', 'economy', 'meal'];
    if (!invalidLast.includes(last.toLowerCase())) {
      matches.push(`${title} ${first} ${last}`);
    }
  }

  // 2. Single-line names: Title + Full Name on the same line
  // e.g. "Ms Upama Maurya", "Mr RAHUL MAURYA", "Ms. Asmita Bhosale (Adult)"
  const singleLineMatches = text.match(
    /\b(?:Mr|Ms|Mrs|Dr|Master)\.?\s+[A-Za-z. ]{2,35}(?=[,\r\n;(]|$)/gi
  );
  if (singleLineMatches) {
    singleLineMatches.forEach((m) => matches.push(m));
  }

  const rawCleaned = matches
    .map((m) =>
      m
        .replace(/\s*\([A-Za-z\s]+\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((m) => {
      const stripped = m.replace(/^(?:Mr|Ms|Mrs|Dr|Master)\.?\s+/i, '').trim();
      return (
        stripped.length >= 3 &&
        !/^(?:Mr|Ms|Mrs|Dr|Master)\.?$/i.test(m) &&
        !/^(?:Adult|Child|Infant|Confirmed|Sector|Economy|Meal|Flight|Ticket|Traveller|Passenger)$/i.test(stripped)
      );
    });

  // Deduplicate by clean passenger name to normalize title variations (e.g. "Ms." vs "Ms")
  const byCleanName = new Map<string, string>();
  for (const name of rawCleaned) {
    const key = cleanPassengerName(name).toLowerCase();
    if (!byCleanName.has(key)) {
      byCleanName.set(key, name);
    }
  }

  const unique = Array.from(byCleanName.values());
  // Filter out partial substrings if full name exists (e.g. keep "Ms Asmita Bhosale" over "Ms Asmita")
  const filtered = unique.filter((name, idx) => {
    const cleanCurrent = cleanPassengerName(name).toLowerCase();
    return !unique.some((other, otherIdx) => {
      if (idx === otherIdx) return false;
      const cleanOther = cleanPassengerName(other).toLowerCase();
      return cleanOther.length > cleanCurrent.length && cleanOther.includes(cleanCurrent);
    });
  });

  return filtered;
}

/**
 * Extracts all unique PNR / reference codes and portal booking IDs from ticket text.
 */
export function extractReferenceCodes(text: string): { pnrList: string[]; tripId?: string } {
  const pnrList: string[] = [];

  // 1. Cleartrip / Airline PNR table blocks:
  // e.g. AIRLINE PNR \n YI77GE \n X89JTF
  const pnrBlockMatch = text.match(/AIRLINE\s*PNR[\s\S]*?(?=(?:TIP:|ABOUT THIS TRIP|FARE BREAKUP|IMPORTANT|NOTE:|$))/i);
  if (pnrBlockMatch) {
    const codes = pnrBlockMatch[0].match(/\b([A-Z0-9]{6})\b/g);
    if (codes) {
      codes.forEach((c) => {
        const upper = c.toUpperCase();
        if (!['AIRLIN', 'TICKET', 'TRAVELL', 'STATUS'].includes(upper) && !pnrList.includes(upper)) {
          pnrList.push(upper);
        }
      });
    }
  }

  // 2. Standard explicit PNR / Confirmation / Booking references:
  // Supports "PNR: ABC123", "Booking Reference (PNR): 6EBOOK1", "Confirmation #: XYZ789"
  // Forbids newlines before the colon to prevent matching "Confirmation \n Flight"
  const directMatches = text.matchAll(
    /(?:pnr(?:\s*(?:no|num|number|#))?|booking\s*(?:ref|reference|code|id)|airline\s*pnr|confirmation\s*(?:code|#|number)?|reservation\s*(?:code|#|number)?)(?:\s*\([A-Za-z\s#]+\))?[^\S\r\n]*[:\-#]+[^\S\r\n]*([A-Z0-9]{5,10})/gi
  );
  for (const m of directMatches) {
    if (m[1]) {
      const code = m[1].toUpperCase();
      if (!['NUMBER', 'REFERENCE', 'STATUS', 'CONFIRMED', 'FLIGHT', 'TICKET', 'AIRLINE'].includes(code) && !pnrList.includes(code)) {
        pnrList.push(code);
      }
    }
  }

  // 3. Online portal Trip ID (e.g. Cleartrip "Trip ID : 260807634788", "Booking ID : 44117860941262337908", "CLEARTRIP Ref ID : 260807625554")
  let tripId: string | undefined;
  const tripIdMatch = text.match(
    /(?:trip\s*id|booking\s*id|reservation\s*id|(?:cleartrip\s*)?ref\s*id)[:\s\-#]*([0-9A-Z]{6,25})/i
  );
  if (tripIdMatch && tripIdMatch[1]) {
    tripId = tripIdMatch[1].trim();
  }

  // 4. Standalone 6-character PNR fallback if none found yet
  if (pnrList.length === 0) {
    const standaloneMatch = text.match(/\b([A-Z][A-Z0-9]{4}[A-Z0-9])\b/);
    if (standaloneMatch && standaloneMatch[1]) {
      const c = standaloneMatch[1].toUpperCase();
      if (!['FLIGHT', 'TICKET', 'CANCEL', 'REPORT', 'NOTICE', 'NUMBER', 'STATUS'].includes(c)) {
        pnrList.push(c);
      }
    }
  }

  return { pnrList, tripId };
}

/**
 * Extracts departure and arrival times, and airport codes from a flight segment text chunk.
 * Handles both "10:15 BLR ... HYD 11:30" and "BLR 10:15 11:30 HYD" layouts.
 */
export function extractChunkFlightTimesAndCodes(
  chunk: string,
  fallbackOrigin?: string,
  fallbackDestination?: string
): { depTime: string; arrTime: string; origin: string; destination: string } {
  let depTime = '';
  let arrTime = '';
  let origin = fallbackOrigin ? resolveAirportCode(fallbackOrigin) : '';
  let destination = fallbackDestination ? resolveAirportCode(fallbackDestination) : '';

  // 1. Single line compact: BLR 10:15 11:30 HYD
  const singleLine = chunk.match(/\b([A-Z]{3})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+([A-Z]{3})\b/);
  if (singleLine) {
    return {
      origin: singleLine[1].toUpperCase(),
      depTime: singleLine[2],
      arrTime: singleLine[3],
      destination: singleLine[4].toUpperCase(),
    };
  }

  // 2. Labeled departure and arrival:
  const depMatch = chunk.match(/(?:depart(?:ure)?|from)[:\s]+(?:([A-Z]{3})\s+)?(\d{1,2}:\d{2})(?:\s+([A-Z]{3}))?/i);
  const arrMatch = chunk.match(/(?:arriv(?:al|e)?|to)[:\s]+(?:([A-Z]{3})\s+)?(\d{1,2}:\d{2})(?:\s+([A-Z]{3}))?/i);
  if (depMatch && arrMatch) {
    depTime = depMatch[2];
    if (depMatch[1] || depMatch[3]) origin = (depMatch[1] || depMatch[3])!.toUpperCase();
    arrTime = arrMatch[2];
    if (arrMatch[1] || arrMatch[3]) destination = (arrMatch[1] || arrMatch[3])!.toUpperCase();
    return { depTime, arrTime, origin, destination };
  }

  // 3. Paired time + code patterns (e.g. "10:15 BLR" and "HYD 11:30")
  const timeCodeMatches: { time: string; code: string; index: number }[] = [];
  const tcRegex = /\b(\d{1,2}:\d{2})\s+([A-Z]{3})\b|\b([A-Z]{3})\s+(\d{1,2}:\d{2})\b/g;
  let tcMatch: RegExpExecArray | null;
  while ((tcMatch = tcRegex.exec(chunk)) !== null) {
    const rawTime = tcMatch[1] || tcMatch[4];
    const rawCode = (tcMatch[2] || tcMatch[3]).toUpperCase();
    if (!['HRS', 'MIN', 'SEC', 'EST', 'GMT', 'IST', 'UTC', 'SAV', 'DEP', 'ARR'].includes(rawCode)) {
      timeCodeMatches.push({ time: rawTime, code: rawCode, index: tcMatch.index });
    }
  }

  if (timeCodeMatches.length >= 2) {
    depTime = timeCodeMatches[0].time;
    if (!origin || /^[A-Z]{3}$/.test(timeCodeMatches[0].code)) {
      origin = timeCodeMatches[0].code;
    }
    arrTime = timeCodeMatches[1].time;
    if (!destination || /^[A-Z]{3}$/.test(timeCodeMatches[1].code)) {
      destination = timeCodeMatches[1].code;
    }
    return { depTime, arrTime, origin, destination };
  } else if (timeCodeMatches.length === 1) {
    depTime = timeCodeMatches[0].time;
    if (!origin) origin = timeCodeMatches[0].code;
  }

  // 4. Fallback times extraction
  if (!depTime || !arrTime) {
    const allTimes = Array.from(chunk.matchAll(/\b(\d{1,2}:\d{2})\b/g)).map((m) => m[1]);
    if (allTimes.length >= 2) {
      if (!depTime) depTime = allTimes[0];
      if (!arrTime) arrTime = allTimes[1];
    } else if (allTimes.length === 1 && !depTime) {
      depTime = allTimes[0];
    }
  }

  return { depTime, arrTime, origin, destination };
}

/**
 * Strategy 1: Explicit Section-Header segments (SmartBuy, Cleartrip E-Tickets, MMT, MakeMyTrip).
 * Matches blocks starting with:
 * "Departure Flight\nBangalore to Hyderabad | Sat, 10 Oct 2026 PNR Number : K6BP5V"
 */
export function parseSectionHeaderSegments(text: string, defaultPnrList: string[]): ParsedFlightSegment[] {
  const headerRegex =
    /(?:(?:Departure|Return|Onward|Connecting)\s+Flight\s+)?([A-Za-z\s]{3,30}?)\s+to\s+([A-Za-z\s]{3,30}?)\s*\|\s*([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}(?:\s*\d{4})?|\d{1,2}\s+[A-Za-z]{3}\s*\d{4})(?:\s*PNR\s*(?:Number|#|no)?\s*[:\-]?\s*([A-Z0-9]{5,10}))?/gi;

  const headerMatches: {
    originCity: string;
    destinationCity: string;
    dateStr: string;
    headerPnr?: string;
    index: number;
    headerLength: number;
  }[] = [];

  let hMatch: RegExpExecArray | null;
  while ((hMatch = headerRegex.exec(text)) !== null) {
    const originCity = hMatch[1].trim();
    const destinationCity = hMatch[2].trim();
    const dateStr = hMatch[3].replace(/\s+/g, ' ').trim();
    const headerPnr = hMatch[4]?.trim().toUpperCase();

    // Guard against non-flight text falsely matching "something to something | date"
    if (
      originCity.length >= 3 &&
      destinationCity.length >= 3 &&
      !['flight', 'hotel', 'booking', 'train'].includes(originCity.toLowerCase())
    ) {
      headerMatches.push({
        originCity,
        destinationCity,
        dateStr,
        headerPnr,
        index: hMatch.index,
        headerLength: hMatch[0].length,
      });
    }
  }

  if (headerMatches.length === 0) return [];

  const segments: ParsedFlightSegment[] = [];

  for (let i = 0; i < headerMatches.length; i++) {
    const cur = headerMatches[i];
    const next = headerMatches[i + 1];
    const rawChunk = text.slice(cur.index, next ? next.index : undefined);

    // Stop at bottom sections like "Traveller Details" or "Fare Summary" if this is the last chunk
    const endBoundary = rawChunk.search(/\b(?:Traveller Details|Passenger Details|Fare Summary|Baggage Policy|Important Information)\b/i);
    const chunk = endBoundary > 0 ? rawChunk.slice(0, endBoundary) : rawChunk;

    // Extract Flight Code
    const flightMatch = chunk.match(
      /\b(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL|[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*([0-9]{3,4})\b/i
    );
    const carrierCode = flightMatch ? flightMatch[1].toUpperCase() : 'FLIGHT';
    const flightNumber = flightMatch ? flightMatch[2] : '';
    const provider = identifyAirlineProvider(chunk, carrierCode);

    // Segment-specific PNR:
    // 1. From header PNR
    // 2. From inside chunk
    // 3. From default list at index
    let segmentPnr = cur.headerPnr;
    if (!segmentPnr) {
      const chunkPnrMatch = chunk.match(
        /(?:pnr(?:\s*(?:no|num|number|#))?|airline\s*pnr|booking\s*ref(?:erence)?)[:\s\-#]+([A-Z0-9]{5,10})/i
      );
      if (chunkPnrMatch && chunkPnrMatch[1]) {
        segmentPnr = chunkPnrMatch[1].toUpperCase();
      } else {
        segmentPnr = defaultPnrList[i] || defaultPnrList[0];
      }
    }

    const { depTime, arrTime, origin, destination } = extractChunkFlightTimesAndCodes(
      chunk,
      cur.originCity,
      cur.destinationCity
    );

    // Extract Terminal if present
    const terminalMatch = chunk.match(/(?:terminal|t)[:\s]*([0-9A-Z]{1,4})/i);
    const terminal = terminalMatch ? `Terminal ${terminalMatch[1]}` : undefined;

    // Extract Seat if present
    const seatMatch = chunk.match(/(?:seat)[:\s]*([0-9]{1,3}[A-Z]?|[A-Z][0-9]{1,3})/i);
    const seatOrRoom = seatMatch ? `Seat ${seatMatch[1].toUpperCase()}` : undefined;

    segments.push({
      carrierCode,
      flightNumber,
      provider,
      origin: origin || resolveAirportCode(cur.originCity),
      destination: destination || resolveAirportCode(cur.destinationCity),
      depTime: depTime || '00:00',
      arrTime: arrTime || undefined,
      dateStr: cur.dateStr,
      segmentPnr,
      seatOrRoom,
      terminal,
    });
  }

  return segments;
}

/**
 * Strategy 2: Classic Compact Table multi-leg flight segments (Cleartrip Compact format, etc.).
 * Matches:
 * "IndiGo \n 6E - 537 \n BLR 10:15 11:30 HYD \n Sat, 10 Oct 2026"
 */
export function parseCompactTableSegments(text: string, defaultPnrList: string[]): ParsedFlightSegment[] {
  const segmentRegex =
    /(?:([A-Za-z\s]+)\s*\n\s*)?(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL|[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*([0-9]{3,4})[\s\S]*?([A-Z]{3})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+([A-Z]{3})[\s\S]*?([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}(?:\s*\d{4})?|\d{1,2}\s+[A-Za-z]{3}\s*\d{4})/g;

  const segments: ParsedFlightSegment[] = [];
  let match: RegExpExecArray | null;

  while ((match = segmentRegex.exec(text)) !== null) {
    const rawAirline = (match[1] || '').trim();
    const carrierCode = match[2].toUpperCase();
    const flightNumber = match[3];
    const origin = match[4].toUpperCase();
    const depTime = match[5];
    const arrTime = match[6];
    const destination = match[7].toUpperCase();
    const dateStr = match[8].replace(/\s+/g, ' ').trim();

    const provider = identifyAirlineProvider(rawAirline || text, carrierCode);
    const segmentPnr = defaultPnrList[segments.length] || defaultPnrList[0];

    segments.push({
      carrierCode,
      flightNumber,
      provider,
      origin,
      destination,
      depTime,
      arrTime,
      dateStr,
      segmentPnr,
    });
  }

  return segments;
}

/**
 * Strategy 3: Flight Anchor Chunking.
 * Used for direct airline itineraries (IndiGo, Air India, SpiceJet, Akasa)
 * where segments are delineated by flight numbers without section headers.
 */
export function parseFlightAnchorSegments(text: string, defaultPnrList: string[]): ParsedFlightSegment[] {
  const endBoundary = text.search(/\b(?:Fare Summary|Baggage Policy|Important Information|Terms & Conditions)\b/i);
  const bodyText = endBoundary > 0 ? text.slice(0, endBoundary) : text;

  const flightRegex =
    /\b(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL)\s*[-–]?\s*([0-9]{3,4})\b/gi;

  const flightMatches: {
    carrierCode: string;
    flightNumber: string;
    index: number;
  }[] = [];

  let fMatch: RegExpExecArray | null;
  while ((fMatch = flightRegex.exec(bodyText)) !== null) {
    flightMatches.push({
      carrierCode: fMatch[1].toUpperCase(),
      flightNumber: fMatch[2],
      index: fMatch.index,
    });
  }

  if (flightMatches.length < 2) return [];

  const segments: ParsedFlightSegment[] = [];

  for (let i = 0; i < flightMatches.length; i++) {
    const cur = flightMatches[i];
    const next = flightMatches[i + 1];
    const startIdx = i === 0 ? 0 : cur.index;
    const endIdx = next ? next.index : bodyText.length;
    const chunk = bodyText.slice(startIdx, endIdx);

    const provider = identifyAirlineProvider(chunk, cur.carrierCode);

    const dateMatch = chunk.match(
      /\b([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}(?:\s*\d{4})?|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{2,4})?)\b/i
    );
    const dateStr = dateMatch ? dateMatch[1].replace(/\s+/g, ' ').trim() : '';

    const { depTime, arrTime, origin, destination } = extractChunkFlightTimesAndCodes(chunk);

    const pnrMatch = chunk.match(
      /(?:pnr(?:\s*(?:no|num|number|#))?|airline\s*pnr|booking\s*ref(?:erence)?)[:\s\-#]+([A-Z0-9]{5,10})/i
    );
    const segmentPnr = pnrMatch ? pnrMatch[1].toUpperCase() : defaultPnrList[i] || defaultPnrList[0];

    const seatMatch = chunk.match(/(?:seat)[:\s]*([0-9]{1,3}[A-Z]?|[A-Z][0-9]{1,3})/i);
    const seatOrRoom = seatMatch ? `Seat ${seatMatch[1].toUpperCase()}` : undefined;

    if (origin && destination) {
      segments.push({
        carrierCode: cur.carrierCode,
        flightNumber: cur.flightNumber,
        provider,
        origin,
        destination,
        depTime: depTime || '00:00',
        arrTime: arrTime || undefined,
        dateStr: dateStr || 'Travel Date',
        segmentPnr,
        seatOrRoom,
      });
    }
  }

  return segments;
}

/**
 * Parses all flight segments from multi-leg or round-trip ticket itineraries (e.g., IndiGo, Cleartrip, SmartBuy, MakeMyTrip).
 * Generates an array of ParsedTravelPass, one per flight segment per passenger.
 */
export function parseAllBookingPasses(rawText: string): ParsedTravelPass[] {
  const text = rawText.trim();
  if (!text) return [];

  const passengers = extractPassengers(text);
  const { pnrList, tripId } = extractReferenceCodes(text);

  // Strategy 1: Section Header Based (SmartBuy / Modern Cleartrip / Round-trip blocks)
  let flightSegments = parseSectionHeaderSegments(text, pnrList);

  // Strategy 2: Compact Single-Line Table (Classic Cleartrip)
  if (flightSegments.length === 0) {
    flightSegments = parseCompactTableSegments(text, pnrList);
  }

  // Strategy 3: Flight Anchor Chunking (Direct Airline itineraries)
  if (flightSegments.length === 0) {
    flightSegments = parseFlightAnchorSegments(text, pnrList);
  }

  if (flightSegments.length > 0) {
    const passes: ParsedTravelPass[] = [];

    flightSegments.forEach((segment) => {
      const fullFlightCode = segment.flightNumber ? `${segment.carrierCode}-${segment.flightNumber}` : segment.carrierCode;
      const legIdentifier = `${segment.carrierCode}${segment.flightNumber}_${segment.origin}_${segment.destination}`;
      const legPnr = segment.segmentPnr || pnrList[0] || tripId;

      const noteParts: string[] = [];
      if (passengers.length > 0) {
        noteParts.push(`Passengers: ${passengers.join(', ')}`);
      }
      if (tripId) {
        noteParts.push(`Booking ID: ${tripId}`);
      }
      if (legPnr) {
        noteParts.push(`PNR: ${legPnr}`);
      }
      if (segment.terminal) {
        noteParts.push(segment.terminal);
      }

      const startDateTime = segment.depTime ? `${segment.dateStr} at ${segment.depTime}` : segment.dateStr;
      const endDateTime = segment.arrTime ? `${segment.dateStr} at ${segment.arrTime}` : undefined;

      if (passengers.length > 1) {
        passengers.forEach((pName) => {
          const cleanName = cleanPassengerName(pName);
          passes.push({
            type: 'flight',
            title: `${cleanName} · ${segment.provider} ${fullFlightCode} (${segment.origin} ➔ ${segment.destination})`,
            provider: segment.provider,
            referenceCode: legPnr,
            bookingId: tripId,
            passengerName: cleanName,
            legIdentifier,
            origin: segment.origin,
            destination: segment.destination,
            startDateTime,
            endDateTime,
            seatOrRoom: segment.seatOrRoom,
            notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
          });
        });
      } else {
        const singlePassName = passengers[0] ? cleanPassengerName(passengers[0]) : undefined;
        passes.push({
          type: 'flight',
          title: singlePassName
            ? `${singlePassName} · ${segment.provider} ${fullFlightCode} (${segment.origin} ➔ ${segment.destination})`
            : `${segment.provider} ${fullFlightCode} (${segment.origin} ➔ ${segment.destination})`,
          provider: segment.provider,
          referenceCode: legPnr,
          bookingId: tripId,
          passengerName: singlePassName,
          legIdentifier,
          origin: segment.origin,
          destination: segment.destination,
          startDateTime,
          endDateTime,
          seatOrRoom: segment.seatOrRoom,
          notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
        });
      }
    });

    return passes;
  }

  // Fallback to single-pass parser if multi-segment parsers did not match
  const single = parseBookingText(text);
  if (passengers.length > 1) {
    return passengers.map((p) => {
      const cleanName = cleanPassengerName(p);
      return {
        ...single,
        passengerName: cleanName,
        title: `${cleanName} · ${single.title}`,
      };
    });
  }
  return [single];
}

/**
 * Parses raw text from booking emails, SMS messages, or copy-pasted ticket itineraries
 * into structured travel pass fields.
 */
export function parseBookingText(rawText: string): ParsedTravelPass {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  const passengers = extractPassengers(text);
  const { pnrList, tripId } = extractReferenceCodes(text);
  const referenceCode = pnrList[0] || tripId;

  // 1. Determine pass type based on explicit indicators
  let type: TravelPassType = 'activity';
  const hasAirline = AIRLINE_PROVIDERS.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(text));
  const hasFlightPattern =
    /\b(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL|[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*[0-9]{3,4}\b/i.test(
      text
    );

  if (
    hasAirline ||
    hasFlightPattern ||
    lower.includes('flight') ||
    lower.includes('boarding pass') ||
    lower.includes('airline') ||
    lower.includes('airways') ||
    lower.includes('terminal') ||
    lower.includes('layover')
  ) {
    type = 'flight';
  } else if (
    lower.includes('train') ||
    lower.includes('irctc') ||
    lower.includes('coach') ||
    lower.includes('berth') ||
    lower.includes('railway') ||
    (lower.includes('pnr') && lower.includes('class'))
  ) {
    type = 'train';
  } else if (
    lower.includes('hotel') ||
    lower.includes('resort') ||
    lower.includes('airbnb') ||
    lower.includes('stay') ||
    lower.includes('villa') ||
    lower.includes('check-in') ||
    lower.includes('check in') ||
    lower.includes('booking.com') ||
    lower.includes('agoda') ||
    lower.includes('hostel') ||
    lower.includes('room')
  ) {
    type = 'stay';
  } else if (
    lower.includes('cab') ||
    lower.includes('uber') ||
    lower.includes('ola') ||
    lower.includes('rental') ||
    lower.includes('car rental') ||
    lower.includes('driver')
  ) {
    type = 'transit';
  }

  // 2. Extract Carrier / Provider
  let provider: string | undefined;
  const allProviders = [...AIRLINE_PROVIDERS, ...OTHER_PROVIDERS];
  for (const p of allProviders) {
    if (new RegExp(`\\b${p}\\b`, 'i').test(text)) {
      provider = p;
      break;
    }
  }

  // 3. Extract Flight / Train Number or Title
  let title = '';
  const flightNumMatch = text.match(
    /\b(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL|[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*([0-9]{3,4})\b/i
  );

  if (type === 'flight') {
    if (flightNumMatch) {
      const code = `${flightNumMatch[1].toUpperCase()}-${flightNumMatch[2]}`;
      title = provider ? `${provider} ${code}` : `Flight ${code}`;
    } else if (provider) {
      title = `${provider} Flight`;
    } else {
      title = 'Flight Booking';
    }
  } else if (type === 'train') {
    const trainNumMatch = text.match(/\b([0-9]{5})\b/);
    if (trainNumMatch && provider) {
      title = `${provider} Train ${trainNumMatch[1]}`;
    } else if (trainNumMatch) {
      title = `Train #${trainNumMatch[1]}`;
    } else {
      title = provider ? `${provider} Journey` : 'Train Ticket';
    }
  } else if (type === 'stay') {
    const hotelMatch = text.match(/(?:at|hotel|staying at)\s+([A-Z][a-zA-Z0-9\s&'-]{3,30})(?:,|\.|\n|is confirmed)/i);
    if (hotelMatch && hotelMatch[1]) {
      title = hotelMatch[1].trim();
    } else if (provider) {
      title = `${provider} Stay`;
    } else {
      title = 'Hotel / Stay Reservation';
    }
  } else if (type === 'transit') {
    title = provider ? `${provider} Ride / Rental` : 'Transit Booking';
  } else {
    title = provider ? `${provider} Activity` : 'Event / Tour Pass';
  }

  // 4. Extract Origin & Destination
  let origin: string | undefined;
  let destination: string | undefined;

  const iataTimedMatch = text.match(/\b([A-Z]{3})\s+\d{1,2}:\d{2}\s+\d{1,2}:\d{2}\s+([A-Z]{3})\b/);
  const iataArrowMatch = text.match(/\b(?:from\s+)?([A-Z]{3})\s*(?:➔|->|to|—|-)\s*([A-Z]{3})\b/i);

  if (iataTimedMatch) {
    origin = iataTimedMatch[1].toUpperCase();
    destination = iataTimedMatch[2].toUpperCase();
  } else if (iataArrowMatch) {
    origin = iataArrowMatch[1].toUpperCase();
    destination = iataArrowMatch[2].toUpperCase();
  } else {
    const routeMatch = text.match(
      /(?:from\s+)?([A-Za-z\s]{3,20}?)\s*(?:➔|->|to|—|-)\s*([A-Za-z\s]{3,20}?)(?:,|\.|\n|on|\sat|$)/i
    );
    if (routeMatch) {
      const rawO = routeMatch[1].replace(/^from\s+/i, '').trim();
      const rawD = routeMatch[2].trim();
      if (rawO.length >= 3 && rawD.length >= 3 && !['flight', 'hotel', 'booking', 'train'].includes(rawO.toLowerCase())) {
        origin = resolveAirportCode(rawO);
        destination = resolveAirportCode(rawD);
      }
    }
  }

  // Enhance title with route if available
  if (origin && destination && !title.includes('(')) {
    title = `${title} (${origin} ➔ ${destination})`;
  }

  // 5. Extract Seat or Room Number
  let seatOrRoom: string | undefined;
  const seatMatch = text.match(/(?:seat|berth|room|seat\s*#?|room\s*#?)[:\s\-]*([0-9]{1,3}[A-Z]?|[A-Z][0-9]{1,3})/i);
  if (seatMatch && seatMatch[1]) {
    seatOrRoom = (type === 'stay' ? 'Room ' : 'Seat ') + seatMatch[1].toUpperCase();
  }

  // 6. Extract Date & Time
  let startDateTime: string | undefined;
  const dateMatch = text.match(
    /\b([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}(?:\s*\d{4})?|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{2,4})?)\b/i
  );
  const timeMatch = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/);

  if (dateMatch && timeMatch) {
    startDateTime = `${dateMatch[1].trim()} at ${timeMatch[1].trim()}`.replace(/\s+/g, ' ');
  } else if (dateMatch) {
    startDateTime = dateMatch[1].trim();
  } else if (timeMatch) {
    startDateTime = timeMatch[1].trim();
  }

  // 7. Compose notes with passengers & trip ID
  const noteParts: string[] = [];
  if (passengers.length > 0) {
    noteParts.push(`Passengers: ${passengers.join(', ')}`);
  }
  if (tripId) {
    noteParts.push(`Booking ID: ${tripId}`);
  }
  if (pnrList.length > 1) {
    noteParts.push(`PNRs: ${pnrList.join(', ')}`);
  }

  return {
    type,
    title,
    provider,
    referenceCode,
    origin,
    destination,
    seatOrRoom,
    startDateTime,
    notes: noteParts.length > 0 ? noteParts.join(' | ') : text.length > 200 ? text.slice(0, 197) + '...' : undefined,
  };
}
