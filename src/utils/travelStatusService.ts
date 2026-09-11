import type { TravelPass } from '../types';

export interface FlightStatusInfo {
  type: 'flight';
  carrierCode: string;
  flightNumber: string;
  airlineName: string;
  fullFlightCode: string;
  googleStatusUrl: string;
  flightradar24Url: string;
  flightAwareUrl: string;
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

export function buildFlightUrls(carrierCode: string, flightNumber: string) {
  const cleanCarrier = carrierCode.trim().toUpperCase();
  const cleanFlightNum = flightNumber.trim().replace(/^0+/, '') || flightNumber.trim();
  const fullFlightCode = `${cleanCarrier}-${cleanFlightNum}`;

  const googleStatusUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${cleanCarrier}-${cleanFlightNum} flight status`
  )}`;
  const flightradar24Url = `https://www.flightradar24.com/data/flights/${cleanCarrier.toLowerCase()}-${cleanFlightNum}`;
  const flightAwareUrl = `https://www.flightaware.com/live/flight/${cleanCarrier}-${cleanFlightNum}`;

  return {
    fullFlightCode,
    googleStatusUrl,
    flightradar24Url,
    flightAwareUrl,
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
  const urls = buildFlightUrls(carrierCode, flightNumber);

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
