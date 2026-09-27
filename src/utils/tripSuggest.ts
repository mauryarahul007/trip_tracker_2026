// enableQuickTripCreate: suggestions derived from what the traveler typed as
// the destination. Pure string matching -- no network -- so it works offline
// and never blocks typing. Unknown places simply suggest nothing.

// Keyword (country or well-known city, lowercase) -> ISO currency. Only
// places where the local currency is unambiguous; India is omitted because
// INR is already the default.
const PLACE_CURRENCY: [string[], string][] = [
  [['thailand', 'bangkok', 'phuket', 'krabi', 'chiang mai', 'pattaya', 'koh samui'], 'THB'],
  [['indonesia', 'bali', 'jakarta', 'lombok', 'ubud', 'gili'], 'IDR'],
  [['vietnam', 'hanoi', 'ho chi minh', 'saigon', 'da nang', 'hoi an', 'ha long'], 'VND'],
  [['malaysia', 'kuala lumpur', 'langkawi', 'penang'], 'MYR'],
  [['singapore'], 'SGD'],
  [['japan', 'tokyo', 'kyoto', 'osaka', 'hokkaido', 'nara', 'okinawa'], 'JPY'],
  [['korea', 'seoul', 'busan', 'jeju'], 'KRW'],
  [['sri lanka', 'colombo', 'kandy', 'galle', 'ella'], 'LKR'],
  [['nepal', 'kathmandu', 'pokhara'], 'NPR'],
  [['bhutan', 'thimphu', 'paro'], 'BTN'],
  [['maldives', 'male'], 'MVR'],
  [['dubai', 'abu dhabi', 'uae', 'emirates', 'sharjah'], 'AED'],
  [['qatar', 'doha'], 'QAR'],
  [['oman', 'muscat'], 'OMR'],
  [['saudi', 'riyadh', 'jeddah'], 'SAR'],
  [['turkey', 'turkiye', 'istanbul', 'cappadocia', 'antalya'], 'TRY'],
  [['egypt', 'cairo', 'luxor'], 'EGP'],
  [['kenya', 'nairobi', 'masai mara'], 'KES'],
  [['south africa', 'cape town', 'johannesburg'], 'ZAR'],
  [['united kingdom', 'uk', 'england', 'london', 'scotland', 'edinburgh', 'manchester'], 'GBP'],
  [['switzerland', 'zurich', 'geneva', 'interlaken', 'lucerne', 'zermatt'], 'CHF'],
  [['france', 'paris', 'nice', 'germany', 'berlin', 'munich', 'italy', 'rome', 'venice', 'florence', 'milan',
    'spain', 'barcelona', 'madrid', 'portugal', 'lisbon', 'porto', 'netherlands', 'amsterdam', 'greece',
    'athens', 'santorini', 'mykonos', 'austria', 'vienna', 'belgium', 'brussels', 'ireland', 'dublin',
    'finland', 'helsinki', 'croatia', 'dubrovnik', 'europe'], 'EUR'],
  [['czech', 'prague'], 'CZK'],
  [['hungary', 'budapest'], 'HUF'],
  [['iceland', 'reykjavik'], 'ISK'],
  [['norway', 'oslo'], 'NOK'],
  [['sweden', 'stockholm'], 'SEK'],
  [['denmark', 'copenhagen'], 'DKK'],
  [['usa', 'united states', 'america', 'new york', 'las vegas', 'san francisco', 'los angeles', 'miami', 'hawaii', 'chicago'], 'USD'],
  [['canada', 'toronto', 'vancouver', 'banff', 'montreal'], 'CAD'],
  [['mexico', 'cancun', 'tulum'], 'MXN'],
  [['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'gold coast'], 'AUD'],
  [['new zealand', 'auckland', 'queenstown'], 'NZD'],
  [['hong kong'], 'HKD'],
  [['china', 'beijing', 'shanghai'], 'CNY'],
  [['philippines', 'manila', 'boracay', 'palawan', 'cebu'], 'PHP'],
  [['cambodia', 'siem reap', 'phnom penh'], 'USD'],
  [['mauritius'], 'MUR'],
];

/** Currency for a typed destination, or null when the place isn't known. */
export function guessTripCurrency(destination: string): string | null {
  const text = ` ${destination.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ')} `;
  for (const [keywords, code] of PLACE_CURRENCY) {
    if (keywords.some((k) => text.includes(` ${k} `))) return code;
  }
  return null;
}

/** "goa, india" -> "Goa trip"; "bali & lombok" -> "Bali trip". */
export function suggestTripName(destination: string): string {
  const first = destination.split(/,|&|\/|\band\b|→|->/i)[0].trim();
  if (!first) return '';
  const titled = first.replace(/\s+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return `${titled} trip`;
}
