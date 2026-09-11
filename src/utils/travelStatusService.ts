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

/**
 * Extract flight status tracking details from a TravelPass or text
 */
export function extractFlightStatus(pass: Partial<TravelPass>): FlightStatusInfo | null {
  const combinedText = [
    pass.legIdentifier,
    pass.referenceCode,
    pass.title,
    pass.notes,
    pass.bookingId,
  ]
    .filter(Boolean)
    .join(' ');

  // Match 2-character IATA airline code followed by 1 to 4 digits (e.g. 6E 2132, AI 101, QP 1302, BA142)
  const flightRegex = /\b([A-Z0-9]{2})\s*([0-9]{1,4})\b/i;
  const match = combinedText.match(flightRegex);

  if (!match) return null;

  const carrierCode = match[1].toUpperCase();
  const flightNumber = match[2];
  const fullFlightCode = `${carrierCode} ${flightNumber}`;
  const airlineName =
    KNOWN_AIRLINES[carrierCode] || pass.provider || `Airline (${carrierCode})`;

  const googleStatusUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${carrierCode} ${flightNumber} flight status`
  )}`;
  const flightradar24Url = `https://www.flightradar24.com/data/flights/${carrierCode.toLowerCase()}${flightNumber}`;
  const flightAwareUrl = `https://www.flightaware.com/live/flight/${carrierCode}${flightNumber}`;

  return {
    type: 'flight',
    carrierCode,
    flightNumber,
    airlineName,
    fullFlightCode,
    googleStatusUrl,
    flightradar24Url,
    flightAwareUrl,
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
