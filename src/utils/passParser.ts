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

/**
 * Parses raw text from booking emails, SMS messages, or copy-pasted ticket itineraries
 * into structured travel pass fields.
 */
export function parseBookingText(rawText: string): ParsedTravelPass {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Determine pass type based on explicit indicators
  let type: TravelPassType = 'activity';
  if (
    lower.includes('train') ||
    lower.includes('irctc') ||
    lower.includes('coach') ||
    lower.includes('berth') ||
    lower.includes('railway') ||
    lower.includes('pnr') && lower.includes('class')
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
  } else if (
    lower.includes('flight') ||
    lower.includes('terminal') ||
    lower.includes('boarding') ||
    lower.includes('airline') ||
    lower.includes('airways') ||
    lower.includes('indigo') ||
    lower.includes('vistara') ||
    lower.includes('air india') ||
    lower.includes('spicejet') ||
    lower.includes('emirates') ||
    lower.includes('qatar') ||
    lower.includes('ryanair') ||
    lower.includes('easyjet') ||
    /\b(?:6e|ai|uk|sg|qp|ek|qr|ba|lh)[ -]?[0-9]{3,4}\b/i.test(text)
  ) {
    type = 'flight';
  }

  // 2. Extract Reference Code / PNR
  let referenceCode: string | undefined;
  const pnrMatch =
    text.match(/(?:pnr|booking\s*(?:id|ref|code|reference)|confirmation\s*(?:code|#|number)?|reservation\s*#?)[:\s\-#]*([A-Z0-9]{5,10})/i) ||
    text.match(/\b([A-Z0-9]{6})\b/);
  if (pnrMatch && pnrMatch[1]) {
    referenceCode = pnrMatch[1].toUpperCase();
  }

  // 3. Extract Carrier / Provider
  let provider: string | undefined;
  const providers = [
    'IndiGo',
    'Air India',
    'Vistara',
    'SpiceJet',
    'Akasa Air',
    'Emirates',
    'Qatar Airways',
    'Singapore Airlines',
    'Ryanair',
    'EasyJet',
    'British Airways',
    'IRCTC',
    'Indian Railways',
    'Booking.com',
    'Airbnb',
    'Agoda',
    'MakeMyTrip',
    'Goibibo',
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
  for (const p of providers) {
    if (new RegExp(`\\b${p}\\b`, 'i').test(text)) {
      provider = p;
      break;
    }
  }

  // 4. Extract Flight / Train Number or Title
  let title = '';
  const flightNumMatch = text.match(/\b([A-Z0-9]{2}[ -]?[0-9]{3,4})\b/i);
  if (type === 'flight') {
    if (flightNumMatch && provider) {
      title = `${provider} ${flightNumMatch[1].toUpperCase().replace(/\s+/, ' ')}`;
    } else if (flightNumMatch) {
      title = `Flight ${flightNumMatch[1].toUpperCase()}`;
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
    // Look for hotel name patterns e.g. "at <Hotel Name>" or before "Hotel"
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

  // 5. Extract Origin & Destination (e.g. DEL to GOI, New Delhi -> Goa)
  let origin: string | undefined;
  let destination: string | undefined;
  const iataMatch = text.match(/\b(?:from\s+)?([A-Z]{3})\s*(?:➔|->|to|—|-)\s*([A-Z]{3})\b/i);
  if (iataMatch) {
    origin = iataMatch[1].toUpperCase();
    destination = iataMatch[2].toUpperCase();
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

  // 6. Extract Seat or Room Number
  let seatOrRoom: string | undefined;
  const seatMatch = text.match(/(?:seat|berth|room|seat\s*#?|room\s*#?)[:\s\-]*([0-9]{1,3}[A-Z]?|[A-Z][0-9]{1,3})/i);
  if (seatMatch && seatMatch[1]) {
    seatOrRoom = (type === 'stay' ? 'Room ' : 'Seat ') + seatMatch[1].toUpperCase();
  }

  // 7. Extract Date & Time
  let startDateTime: string | undefined;
  // Match formats like 15 Oct, 15/10/2026, 2026-10-15, 08:30 AM
  const dateMatch = text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{2,4})?)\b/i);
  const timeMatch = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/);

  if (dateMatch && timeMatch) {
    startDateTime = `${dateMatch[1].trim()} at ${timeMatch[1].trim()}`.replace(/\s+/g, ' ');
  } else if (dateMatch) {
    startDateTime = dateMatch[1].trim();
  } else if (timeMatch) {
    startDateTime = timeMatch[1].trim();
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
    notes: text.length > 200 ? text.slice(0, 197) + '...' : undefined,
  };
}
