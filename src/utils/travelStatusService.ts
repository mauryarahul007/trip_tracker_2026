import type { TravelPass } from '../types';

export interface FlightStatusInfo {
  type: 'flight';
  carrierCode: string;
  flightNumber: string;
  airlineName: string;
  fullFlightCode: string;
  icaoCode?: string;
  googleStatusUrl: string;
  flightradar24Url: string;
  flightAwareUrl: string;
  flightStatsUrl?: string;
  formattedFlightDate?: string;
  flightTime?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
}

export interface TrainStatusInfo {
  type: 'train';
  pnr?: string;
  trainNumber?: string;
  trainName?: string;
  confirmTktUrl?: string;
  railYatriUrl?: string;
  googleLiveTrainUrl?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
}

export type TravelStatusInfo = FlightStatusInfo | TrainStatusInfo;

const KNOWN_AIRLINES: Record<string, string> = {
  '6E': 'IndiGo',
  AI: 'Air India',
  UK: 'Vistara',
  QP: 'Akasa Air',
  SG: 'SpiceJet',
  IX: 'Air India Express',
  G8: 'Go First',
  BA: 'British Airways',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  SQ: 'Singapore Airlines',
  LH: 'Lufthansa',
  UA: 'United Airlines',
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  AF: 'Air France',
  KL: 'KLM',
  EY: 'Etihad Airways',
  CX: 'Cathay Pacific',
  TK: 'Turkish Airlines',
  TG: 'Thai Airways',
  VN: 'Vietnam Airlines',
  MH: 'Malaysia Airlines',
  FZ: 'Flydubai',
  WY: 'Oman Air',
  GF: 'Gulf Air',
  KU: 'Kuwait Airways',
  SV: 'Saudia',
  JL: 'Japan Airlines',
  NH: 'All Nippon Airways',
  KE: 'Korean Air',
  OZ: 'Asiana Airlines',
  QF: 'Qantas',
  VA: 'Virgin Australia',
  AC: 'Air Canada',
};

const ICAO_TO_IATA: Record<string, string> = {
  IGO: '6E',
  AIC: 'AI',
  VTI: 'UK',
  AKJ: 'QP',
  SEJ: 'SG',
  AXB: 'IX',
  BAW: 'BA',
  UAE: 'EK',
  QTR: 'QR',
  SIA: 'SQ',
  DLH: 'LH',
  UAL: 'UA',
  AAL: 'AA',
  DAL: 'DL',
  AFR: 'AF',
  KLM: 'KL',
  ETD: 'EY',
  CPA: 'CX',
  THY: 'TK',
  THA: 'TG',
};

const IATA_TO_ICAO: Record<string, string> = {
  '6E': 'IGO',
  AI: 'AIC',
  UK: 'VTI',
  QP: 'AKJ',
  SG: 'SEJ',
  IX: 'AXB',
  BA: 'BAW',
  EK: 'UAE',
  QR: 'QTR',
  SQ: 'SIA',
  LH: 'DLH',
  UA: 'UAL',
  AA: 'AAL',
  DL: 'DAL',
  AF: 'AFR',
  KL: 'KLM',
  EY: 'ETD',
  CX: 'CPA',
  TK: 'THY',
  TG: 'THA',
  G8: 'GOW',
};

const AIRLINE_NAME_TO_IATA: Record<string, string> = {
  indigo: '6E',
  'air india': 'AI',
  airindia: 'AI',
  vistara: 'UK',
  akasa: 'QP',
  'akasa air': 'QP',
  spicejet: 'SG',
  'air india express': 'IX',
  'airindia express': 'IX',
  'go first': 'G8',
  gofirst: 'G8',
  'british airways': 'BA',
  emirates: 'EK',
  'qatar airways': 'QR',
  'singapore airlines': 'SQ',
  lufthansa: 'LH',
  united: 'UA',
  'united airlines': 'UA',
  american: 'AA',
  'american airlines': 'AA',
  delta: 'DL',
  'delta air lines': 'DL',
  'air france': 'AF',
  klm: 'KL',
  etihad: 'EY',
  'cathay pacific': 'CX',
};

export interface ParsedFlightDate {
  year?: number;
  month?: number;
  day?: number;
  formattedDateString?: string;
  timeString?: string;
}

export function parseFlightDate(dateStr?: string): ParsedFlightDate | null {
  if (!dateStr || !dateStr.trim()) return null;
  const raw = dateStr.trim();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 1. Try standard ISO or YYYY-MM-DD format (e.g. 2026-09-15T10:30, 2026-09-15 10:30, 2026-09-15)
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const hours = isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : undefined;
    const minutes = isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : undefined;
    const formattedDateString = `${day} ${monthNames[month - 1]} ${year}`;
    let timeString: string | undefined;
    if (hours !== undefined && minutes !== undefined) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
      timeString = `${h12}:${mStr} ${period}`;
    }
    return { year, month, day, formattedDateString, timeString };
  }

  // 2. Try natural text formats: e.g. "15 Sep 2026", "15 Oct at 08:30 AM", "15 Sep"
  const monthMap: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12,
  };
  const textMatch = raw.match(
    /(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?(?:\s+(?:at\s+)?(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?))?/i
  );
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const mStr = textMatch[2].toLowerCase();
    const month = monthMap[mStr];
    if (month) {
      const year = textMatch[3] ? parseInt(textMatch[3], 10) : new Date().getFullYear();
      const formattedDateString = `${day} ${monthNames[month - 1]} ${year}`;
      const timeString = textMatch[4] ? textMatch[4].trim() : undefined;
      return { year, month, day, formattedDateString, timeString };
    }
  }

  // 3. Fallback: JavaScript Date.parse
  const parsedTs = Date.parse(raw);
  if (!isNaN(parsedTs)) {
    const d = new Date(parsedTs);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const formattedDateString = `${day} ${monthNames[month - 1]} ${year}`;
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const timeString = `${h12}:${mStr} ${period}`;
    return { year, month, day, formattedDateString, timeString };
  }

  return null;
}

export function buildFlightUrls(
  carrierCode: string,
  flightNumber: string,
  dateString?: string
) {
  const cleanCarrier = carrierCode.trim().toUpperCase();
  const cleanFlightNum = flightNumber.trim().replace(/^0+/, '') || flightNumber.trim();
  const fullFlightCode = `${cleanCarrier}-${cleanFlightNum}`;
  const icaoCode = IATA_TO_ICAO[cleanCarrier] || cleanCarrier;

  const parsedDate = parseFlightDate(dateString);

  // Google Live Flight Status: append departure date if present to query specific day directly
  const googleQuery = parsedDate?.formattedDateString
    ? `${cleanCarrier}-${cleanFlightNum} flight status ${parsedDate.formattedDateString}`
    : `${cleanCarrier}-${cleanFlightNum} flight status`;
  const googleStatusUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;

  // Flightradar24 requires standard slug format: e.g. 6e537 (canonical lowercase without hyphens)
  const flightradar24Url = `https://www.flightradar24.com/data/flights/${cleanCarrier.toLowerCase()}${cleanFlightNum}`;

  // FlightAware indexes flights by ICAO designator (e.g. IGO537)
  const flightAwareUrl = `https://www.flightaware.com/live/flight/${icaoCode}${cleanFlightNum}`;

  // FlightStats direct flight status page with date query parameters if available
  const dateParams =
    parsedDate?.year && parsedDate?.month && parsedDate?.day
      ? `?year=${parsedDate.year}&month=${parsedDate.month}&date=${parsedDate.day}`
      : '';
  const flightStatsUrl = `https://www.flightstats.com/v2/flight-tracker/${cleanCarrier}/${cleanFlightNum}${dateParams}`;

  return {
    fullFlightCode,
    icaoCode,
    googleStatusUrl,
    flightradar24Url,
    flightAwareUrl,
    flightStatsUrl,
    formattedFlightDate: parsedDate?.formattedDateString,
    flightTime: parsedDate?.timeString,
  };
}

/**
 * Parses flight carrier code and flight number from any raw text snippet
 */
export function parseFlightCode(
  text: string,
  providerHint?: string
): { carrierCode: string; flightNumber: string; airlineName: string } | null {
  if (!text && !providerHint) return null;

  // 1. Check for standard legIdentifier format: e.g. 6E537_BLR_HYD or 6E-537_BLR_HYD
  const legMatch = text.match(
    /^([A-Za-z][A-Za-z0-9]|[A-Za-z0-9][A-Za-z])[\s\-_]*([0-9]{1,4})(?:_([A-Za-z]{3})_([A-Za-z]{3}))?/i
  );
  if (legMatch) {
    const carrierCode = legMatch[1].toUpperCase();
    const flightNumber = legMatch[2].replace(/^0+/, '') || legMatch[2];
    const airlineName = KNOWN_AIRLINES[carrierCode] || providerHint || `Airline (${carrierCode})`;
    return { carrierCode, flightNumber, airlineName };
  }

  // 2. Known 2-letter airline codes followed by optional separator and 1-4 digits:
  // e.g. 6E-537, 6E 537, 6E537, AI-101, QP 1302
  const knownKeys = Object.keys(KNOWN_AIRLINES);
  const knownRegex = new RegExp(
    `(?:^|[^A-Za-z0-9])(${knownKeys.join('|')})[\\s\\-_]*([0-9]{1,4})(?=[^A-Za-z0-9]|$)`,
    'i'
  );
  const knownMatch = text.match(knownRegex);
  if (knownMatch) {
    const carrierCode = knownMatch[1].toUpperCase();
    const flightNumber = knownMatch[2].replace(/^0+/, '') || knownMatch[2];
    const airlineName = KNOWN_AIRLINES[carrierCode] || providerHint || `Airline (${carrierCode})`;
    return { carrierCode, flightNumber, airlineName };
  }

  // 3. Known 3-letter ICAO codes (e.g. IGO537 -> 6E 537)
  const icaoKeys = Object.keys(ICAO_TO_IATA);
  const icaoRegex = new RegExp(
    `(?:^|[^A-Za-z0-9])(${icaoKeys.join('|')})[\\s\\-_]*([0-9]{1,4})(?=[^A-Za-z0-9]|$)`,
    'i'
  );
  const icaoMatch = text.match(icaoRegex);
  if (icaoMatch) {
    const icaoCode = icaoMatch[1].toUpperCase();
    const carrierCode = ICAO_TO_IATA[icaoCode] || icaoCode;
    const flightNumber = icaoMatch[2].replace(/^0+/, '') || icaoMatch[2];
    const airlineName = KNOWN_AIRLINES[carrierCode] || providerHint || `Airline (${carrierCode})`;
    return { carrierCode, flightNumber, airlineName };
  }

  // 4. General IATA code: 2 characters WITH AT LEAST ONE LETTER
  // (Prevents purely numeric strings like '537' from matching as carrier '53'!)
  const generalIataRegex =
    /(?:^|[^A-Za-z0-9])([A-Za-z][A-Za-z0-9]|[A-Za-z0-9][A-Za-z])[\s\-_]*([0-9]{1,4})(?=[^A-Za-z0-9]|$)/i;
  const generalMatch = text.match(generalIataRegex);
  if (generalMatch) {
    const carrierCode = generalMatch[1].toUpperCase();
    const flightNumber = generalMatch[2].replace(/^0+/, '') || generalMatch[2];
    const airlineName = KNOWN_AIRLINES[carrierCode] || providerHint || `Airline (${carrierCode})`;
    return { carrierCode, flightNumber, airlineName };
  }

  // 5. Provider name fallback (e.g. Provider: 'IndiGo', text contains '537' or 'Flight 537')
  const combinedContext = `${providerHint || ''} ${text}`.toLowerCase();
  for (const [name, code] of Object.entries(AIRLINE_NAME_TO_IATA)) {
    if (combinedContext.includes(name)) {
      const flightNumMatch = text.match(/(?:flight|flt|no\.?|#)?\s*([0-9]{1,4})(?=[^A-Za-z0-9]|$)/i);
      if (flightNumMatch && flightNumMatch[1]) {
        const flightNumber = flightNumMatch[1].replace(/^0+/, '') || flightNumMatch[1];
        const airlineName = KNOWN_AIRLINES[code] || providerHint || name;
        return { carrierCode: code, flightNumber, airlineName };
      }
    }
  }

  return null;
}

/**
 * Extract flight status tracking details from a TravelPass or text
 */
export function extractFlightStatus(pass: Partial<TravelPass>): FlightStatusInfo | null {
  const combinedText = [
    pass.legIdentifier,
    pass.title,
    pass.referenceCode,
    pass.notes,
    pass.bookingId,
  ]
    .filter(Boolean)
    .join(' ');

  const parsed = parseFlightCode(combinedText, pass.provider);
  if (!parsed) return null;

  const { carrierCode, flightNumber, airlineName } = parsed;
  const urls = buildFlightUrls(carrierCode, flightNumber, pass.startDateTime);

  return {
    type: 'flight',
    carrierCode,
    flightNumber,
    airlineName,
    ...urls,
    origin: pass.origin,
    destination: pass.destination,
    departureTime: pass.startDateTime,
  };
}

/**
 * Extract train / Indian Railways PNR status details from a TravelPass or text
 */
export function extractTrainStatus(pass: Partial<TravelPass>): TrainStatusInfo | null {
  const combinedText = [
    pass.bookingId,
    pass.referenceCode,
    pass.legIdentifier,
    pass.title,
    pass.notes,
  ]
    .filter(Boolean)
    .join(' ');

  // Match 10-digit PNR (standard Indian Railways PNR format: 3-3-4 or 10 consecutive digits)
  const pnrRegex = /\b([0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{4}|[0-9]{10})\b/;
  const pnrMatch = combinedText.match(pnrRegex);
  const pnr = pnrMatch ? pnrMatch[0].replace(/[-\s]/g, '') : undefined;

  // Match 5-digit Indian Railways train number (e.g. 12002, 20608, 12951)
  const trainNumRegex = /\b([0-9]{5})\b/;
  const trainNumMatch = combinedText.match(trainNumRegex);
  const trainNumber = trainNumMatch ? trainNumMatch[1] : undefined;

  if (!pnr && !trainNumber) return null;

  const confirmTktUrl = pnr
    ? `https://www.confirmtkt.com/pnr-status/${pnr}`
    : undefined;
  const railYatriUrl = pnr
    ? `https://www.railyatri.in/pnr-status/${pnr}`
    : undefined;
  const googleLiveTrainUrl = trainNumber
    ? `https://www.google.com/search?q=${encodeURIComponent(
        `${trainNumber} live train status`
      )}`
    : undefined;

  return {
    type: 'train',
    pnr,
    trainNumber,
    trainName: pass.title || pass.provider || 'Express Train',
    confirmTktUrl,
    railYatriUrl,
    googleLiveTrainUrl,
    origin: pass.origin,
    destination: pass.destination,
    departureTime: pass.startDateTime,
  };
}

/**
 * Inspect a travel pass and return live status tracking info if supported
 */
export function getTravelStatusInfo(pass: TravelPass): TravelStatusInfo | null {
  if (pass.type === 'flight') {
    return extractFlightStatus(pass);
  }
  if (pass.type === 'train') {
    return extractTrainStatus(pass);
  }
  return null;
}
