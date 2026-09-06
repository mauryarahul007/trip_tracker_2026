import type { TravelPassType } from '../types';

export interface ParsedTravelPass {
  type: TravelPassType;
  title: string;
  provider?: string;
  referenceCode?: string;
  startDateTime?: string;
  endDateTime?: string;
  origin?: string;
  destination?: string;
  seatOrRoom?: string;
  address?: string;
  notes?: string;
}

const AIRLINE_PROVIDERS = [
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

const OTHER_PROVIDERS = [
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
 * Extracts passenger names from ticket text (e.g. "Ms Upama Maurya", "Mr RAHUL MAURYA").
 */
export function extractPassengers(text: string): string[] {
  // Use [^\r\n,;|] so each passenger is captured up to end of line or delimiter
  const matches = text.match(/\b(?:Mr|Ms|Mrs|Dr|Master)\.?\s+[A-Za-z. ]{2,30}(?=[\r\n,;|]|$)/g);
  if (!matches) return [];
  const cleaned = matches
    .map((m) => m.replace(/\s+/g, ' ').trim())
    .filter((m) => m.length > 3 && !/^(Mr|Ms|Mrs|Dr|Master)\.?\s*$/i.test(m));
  return Array.from(new Set(cleaned));
}

/**
 * Extracts all unique PNR / reference codes from ticket text.
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
  const directMatches = text.matchAll(
    /(?:pnr|booking\s*(?:ref|reference|code|id)|airline\s*pnr|confirmation\s*(?:code|#|number)?|reservation\s*(?:code|#|number)?)[:\s\-#]+([A-Z0-9]{5,10})/gi
  );
  for (const m of directMatches) {
    if (m[1]) {
      const code = m[1].toUpperCase();
      if (!pnrList.includes(code)) pnrList.push(code);
    }
  }

  // 3. Online portal Trip ID (e.g. Cleartrip "Trip ID : 260807634788" or MMT Booking ID)
  let tripId: string | undefined;
  const tripIdMatch = text.match(/(?:trip\s*id|booking\s*id|reservation\s*id)[:\s\-#]*([0-9A-Z]{6,16})/i);
  if (tripIdMatch && tripIdMatch[1]) {
    tripId = tripIdMatch[1].trim();
  }

  // 4. Standalone 6-character PNR fallback if none found yet
  if (pnrList.length === 0) {
    const standaloneMatch = text.match(/\b([A-Z][A-Z0-9]{4}[A-Z0-9])\b/);
    if (standaloneMatch && standaloneMatch[1]) {
      const c = standaloneMatch[1].toUpperCase();
      if (!['FLIGHT', 'TICKET', 'CANCEL', 'REPORT', 'NOTICE'].includes(c)) {
        pnrList.push(c);
      }
    }
  }

  return { pnrList, tripId };
}

/**
 * Parses all flight segments from multi-leg or round-trip ticket itineraries (e.g., IndiGo, Cleartrip, MakeMyTrip).
 * Returns an array of ParsedTravelPass, one per flight segment.
 */
export function parseAllBookingPasses(rawText: string): ParsedTravelPass[] {
  const text = rawText.trim();
  if (!text) return [];

  const passengers = extractPassengers(text);
  const { pnrList, tripId } = extractReferenceCodes(text);

  // Multi-leg flight segment regex:
  // Matches:
  //   [Airline?] \n 6E - 537 ... BLR 10:15 11:30 HYD ... Sat, 10 Oct 2026
  // Or:
  //   6E-537 ... BLR -> HYD ... 10 Oct 2026 10:15
  const segmentRegex =
    /(?:([A-Za-z\s]+)\s*\n\s*)?(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL|[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*([0-9]{3,4})[\s\S]*?([A-Z]{3})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+([A-Z]{3})[\s\S]*?([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}(?:\s*\d{4})?|\d{1,2}\s+[A-Za-z]{3}\s*\d{4})/g;

  const passes: ParsedTravelPass[] = [];
  let match: RegExpExecArray | null;

  while ((match = segmentRegex.exec(text)) !== null) {
    const rawAirline = (match[1] || '').trim();
    const carrierCode = match[2].toUpperCase();
    const flightNumber = match[3];
    const fullFlightCode = `${carrierCode}-${flightNumber}`;
    const origin = match[4].toUpperCase();
    const depTime = match[5];
    const arrTime = match[6];
    const destination = match[7].toUpperCase();
    const dateStr = match[8].replace(/\s+/g, ' ').trim();

    // Identify provider
    let provider = 'Flight';
    if (carrierCode === '6E' || /indigo/i.test(rawAirline) || /indigo/i.test(text)) {
      provider = 'IndiGo';
    } else if (carrierCode === 'AI' || /air india/i.test(rawAirline)) {
      provider = 'Air India';
    } else if (carrierCode === 'UK' || /vistara/i.test(rawAirline)) {
      provider = 'Vistara';
    } else if (carrierCode === 'SG' || /spicejet/i.test(rawAirline)) {
      provider = 'SpiceJet';
    } else if (carrierCode === 'QP' || /akasa/i.test(rawAirline)) {
      provider = 'Akasa Air';
    } else if (carrierCode === 'IX' || /air india express/i.test(rawAirline)) {
      provider = 'Air India Express';
    } else if (rawAirline && rawAirline.length < 30) {
      provider = rawAirline;
    } else {
      const known = AIRLINE_PROVIDERS.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(text));
      if (known) provider = known;
    }

    // PNR mapping: If multiple PNRs exist, map index or fallback to first
    const segmentPnr = pnrList[passes.length] || pnrList[0] || tripId;

    const noteParts: string[] = [];
    if (passengers.length > 0) {
      noteParts.push(`Passengers: ${passengers.join(', ')}`);
    }
    if (tripId) {
      noteParts.push(`Booking ID: ${tripId}`);
    }
    if (pnrList.length > 1) {
      noteParts.push(`All PNRs: ${pnrList.join(', ')}`);
    }

    passes.push({
      type: 'flight',
      title: `${provider} ${fullFlightCode} (${origin} ➔ ${destination})`,
      provider,
      referenceCode: segmentPnr,
      origin,
      destination,
      startDateTime: `${dateStr} at ${depTime}`,
      endDateTime: `${dateStr} at ${arrTime}`,
      notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
    });
  }

  if (passes.length > 0) {
    return passes;
  }

  // Fallback to single-pass parser if segment regex did not match multi-segments
  return [parseBookingText(text)];
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
  // Note: Check flight & airline indicators FIRST so layovers/styes in flight tickets aren't miscategorized as stay!
  let type: TravelPassType = 'activity';
  const hasAirline = AIRLINE_PROVIDERS.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(text));
  const hasFlightPattern =
    /\b(6E|AI|UK|SG|QP|IX|I5|G8|EK|QR|BA|LH|AF|KL|SQ|TG|MH|CX|UA|AA|DL|[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*[-–]?\s*[0-9]{3,4}\b/i.test(text);

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

  // IATA code route match: e.g. BLR 10:15 11:30 HYD or BLR to HYD or BLR -> HYD
  const iataTimedMatch = text.match(/\b([A-Z]{3})\s+\d{1,2}:\d{2}\s+\d{1,2}:\d{2}\s+([A-Z]{3})\b/);
  const iataArrowMatch = text.match(/\b(?:from\s+)?([A-Z]{3})\s*(?:➔|->|to|—|-)\s*([A-Z]{3})\b/i);

  if (iataTimedMatch) {
    origin = iataTimedMatch[1].toUpperCase();
    destination = iataTimedMatch[2].toUpperCase();
  } else if (iataArrowMatch) {
    origin = iataArrowMatch[1].toUpperCase();
    destination = iataArrowMatch[2].toUpperCase();
  } else {
    const routeMatch = text.match(/(?:from\s+)?([A-Za-z\s]{3,20}?)\s*(?:➔|->|to|—|-)\s*([A-Za-z\s]{3,20}?)(?:,|\.|\n|on|\sat|$)/i);
    if (routeMatch) {
      const rawO = routeMatch[1].replace(/^from\s+/i, '').trim();
      const rawD = routeMatch[2].trim();
      if (rawO.length >= 3 && rawD.length >= 3 && !['flight', 'hotel', 'booking', 'train'].includes(rawO.toLowerCase())) {
        origin = rawO;
        destination = rawD;
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
