export type AirplaneEligibility = 'cabin-only' | 'checkin-only' | 'any';
export type PackingScope = 'personal' | 'shared';

export interface PackingSuggestionItem {
  id: string;
  text: string;
  category: 'packing' | 'prep' | 'documents' | 'medical' | 'general';
  airplaneEligibility: AirplaneEligibility;
  cabinNote?: string; // e.g. "Prohibited in hold (ICAO fire safety)" or "Container must be ≤ 100ml"
  isLiquid?: boolean;
  isFlightEssential?: boolean; // Essential for clearing airport security / boarding
  scope?: PackingScope; // 'personal' vs 'shared' (squad gear to avoid duplicates)
  reason?: string; // e.g. "Monsoon / Rain in forecast", "Beach destination", "Winter climate"
  icon?: string;
  defaultChecked?: boolean;
}

export interface PackingContext {
  destination?: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  weatherCondition?: string; // e.g. "rain", "sunny", "clouds", "snow"
  avgTemp?: number;
  isInternational?: boolean;
  luggageFilter?: 'all' | 'cabin-only' | 'checkin-only';
}

export interface DayForecast {
  dayNumber: number;
  dateStr?: string;
  emoji: string;
  tempC: number;
  condition: string;
  outfitTip: string;
}

/**
 * Generate sensible day-by-day forecast & outfit matrix for the horizon strip.
 */
export function generateDailyForecasts(
  startDateStr: string | undefined,
  durationDays: number,
  baseCondition: string,
  baseTempC: number
): DayForecast[] {
  const forecasts: DayForecast[] = [];
  const days = Math.min(Math.max(1, durationDays), 14);
  const conditionLower = (baseCondition || '').toLowerCase();

  for (let i = 0; i < days; i++) {
    const tempVar = ((i * 3) % 5) - 2;
    const tempC = Math.round(baseTempC + tempVar);
    let emoji = '☀️';
    let condition = 'Clear & Sunny';
    let outfitTip = 'Comfortable breathable daywear';

    let dateStr: string | undefined;
    if (startDateStr) {
      const s = startDateStr.includes('T') ? startDateStr.split('T')[0] : startDateStr;
      const [sy, sm, sd] = s.split('-').map(Number);
      if (sy && sm && sd) {
        const d = new Date(sy, sm - 1, sd + i);
        dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    if (conditionLower.includes('rain') || conditionLower.includes('monsoon')) {
      emoji = i % 2 === 0 ? '🌧️' : '🌦️';
      condition = i % 2 === 0 ? 'Showers Expected' : 'Humid & Overcast';
      outfitTip = 'Waterproof rain poncho & quick-dry shoes';
    } else if (conditionLower.includes('snow') || baseTempC < 12) {
      emoji = '❄️';
      condition = 'Cold Alpine Air';
      outfitTip = 'Thermal base layers, fleece & down jacket';
    } else if (baseTempC > 28) {
      emoji = '☀️';
      condition = 'High Sun & Warm';
      outfitTip = 'Light linen/cotton, UV hat & sunglasses';
    } else {
      emoji = i === 0 ? '⛅' : '☀️';
      condition = i === 0 ? 'Pleasant Breezy' : 'Clear Sky';
      outfitTip = 'Layered daywear with light evening jacket';
    }

    forecasts.push({
      dayNumber: i + 1,
      dateStr,
      emoji,
      tempC,
      condition,
      outfitTip,
    });
  }

  return forecasts;
}

/**
 * Infer seasonal climate if live forecast is unavailable or for far-future dates.
 */
export function inferSeasonalClimate(destination: string, startDateStr?: string): {
  seasonName: string;
  isCold: boolean;
  isRainy: boolean;
  isHot: boolean;
  estimatedTempC: number;
} {
  const destLower = (destination || '').toLowerCase();
  let month = new Date().getMonth(); // 0-11
  if (startDateStr) {
    const parsed = new Date(startDateStr);
    if (!isNaN(parsed.getTime())) {
      month = parsed.getMonth();
    }
  }

  // Detect mountain or high-altitude cold locations
  const isHighAltitudeOrAlpine =
    destLower.includes('mountain') ||
    destLower.includes('trek') ||
    destLower.includes('manali') ||
    destLower.includes('ladakh') ||
    destLower.includes('leh') ||
    destLower.includes('shimla') ||
    destLower.includes('alps') ||
    destLower.includes('himalaya') ||
    destLower.includes('kashmir') ||
    destLower.includes('gulmarg') ||
    destLower.includes('switzerland') ||
    destLower.includes('iceland') ||
    destLower.includes('norway');

  // Southern Hemisphere destinations (inverted seasons)
  const isSouthernHemisphere =
    destLower.includes('australia') ||
    destLower.includes('sydney') ||
    destLower.includes('melbourne') ||
    destLower.includes('new zealand') ||
    destLower.includes('south africa') ||
    destLower.includes('argentina') ||
    destLower.includes('chile');

  const effectiveMonth = isSouthernHemisphere ? (month + 6) % 12 : month;

  const isWinterMonths = effectiveMonth === 11 || effectiveMonth === 0 || effectiveMonth === 1;
  const isSummerMonths = effectiveMonth === 4 || effectiveMonth === 5 || effectiveMonth === 6;
  const isMonsoonMonths =
    (effectiveMonth === 5 || effectiveMonth === 6 || effectiveMonth === 7 || effectiveMonth === 8) &&
    (destLower.includes('india') ||
      destLower.includes('goa') ||
      destLower.includes('mumbai') ||
      destLower.includes('kerala') ||
      destLower.includes('thailand') ||
      destLower.includes('vietnam') ||
      destLower.includes('bali'));

  const isCold = isHighAltitudeOrAlpine || (isWinterMonths && !destLower.includes('beach') && !destLower.includes('dubai'));
  const isRainy = Boolean(isMonsoonMonths);
  const isHot = isSummerMonths || destLower.includes('dubai') || destLower.includes('cairo') || destLower.includes('rajasthan');

  let estimatedTempC = 24;
  let seasonName = 'Mild / Moderate';

  if (isCold) {
    estimatedTempC = isHighAltitudeOrAlpine ? (isWinterMonths ? -2 : 8) : 9;
    seasonName = isWinterMonths ? 'Winter / Cold Season' : 'Cool Alpine';
  } else if (isRainy) {
    estimatedTempC = 26;
    seasonName = 'Monsoon / Wet Season';
  } else if (isHot) {
    estimatedTempC = 34;
    seasonName = 'Summer / High Heat';
  } else if (isWinterMonths) {
    estimatedTempC = 20;
    seasonName = 'Mild Winter';
  }

  return { seasonName, isCold, isRainy, isHot, estimatedTempC };
}

export function generateSmartPackingSuggestions(context: PackingContext): PackingSuggestionItem[] {
  const days = Math.max(1, context.durationDays || 3);
  const destLower = (context.destination || '').toLowerCase();
  const weatherLower = (context.weatherCondition || '').toLowerCase();

  const seasonal = inferSeasonalClimate(destLower, context.startDate);
  const temp = context.avgTemp ?? seasonal.estimatedTempC;

  const isBeach =
    destLower.includes('beach') ||
    destLower.includes('goa') ||
    destLower.includes('bali') ||
    destLower.includes('phuket') ||
    destLower.includes('maldives') ||
    destLower.includes('coast') ||
    destLower.includes('island') ||
    destLower.includes('krabi') ||
    destLower.includes('pattaya') ||
    destLower.includes('hawaii');

  const isMountainOrCold =
    temp < 15 ||
    seasonal.isCold ||
    destLower.includes('mountain') ||
    destLower.includes('trek') ||
    destLower.includes('manali') ||
    destLower.includes('ladakh') ||
    destLower.includes('shimla') ||
    destLower.includes('alps') ||
    destLower.includes('himalaya') ||
    destLower.includes('kashmir') ||
    destLower.includes('switzerland');

  const isRainy =
    seasonal.isRainy ||
    weatherLower.includes('rain') ||
    weatherLower.includes('drizzle') ||
    weatherLower.includes('thunderstorm') ||
    weatherLower.includes('shower');

  const rawSuggestions: PackingSuggestionItem[] = [];

  // ==========================================
  // 1. Travel Documents & Essentials (Cabin Only)
  // ==========================================
  rawSuggestions.push(
    {
      id: 'doc-id',
      text: 'Government Photo ID / Physical Passport',
      category: 'documents',
      airplaneEligibility: 'cabin-only',
      isFlightEssential: true,
      scope: 'personal',
      cabinNote: 'Must be in cabin / accessible for airport check-in and security checkpoints',
      defaultChecked: true,
      icon: '🪪',
    },
    {
      id: 'doc-tickets',
      text: 'Flight / Train Boarding Passes & Itinerary',
      category: 'documents',
      airplaneEligibility: 'cabin-only',
      isFlightEssential: true,
      scope: 'personal',
      cabinNote: 'Carry in cabin or store in digital passes wallet',
      defaultChecked: true,
      icon: '🎫',
    },
    {
      id: 'doc-hotel',
      text: 'Hotel / Stay Confirmation Vouchers',
      category: 'documents',
      airplaneEligibility: 'cabin-only',
      scope: 'shared',
      cabinNote: 'Keep booking reference handy for immigration / customs',
      defaultChecked: true,
      icon: '🏨',
    },
    {
      id: 'doc-cash',
      text: 'Cash & Forex / Debit Cards',
      category: 'documents',
      airplaneEligibility: 'cabin-only',
      isFlightEssential: true,
      scope: 'personal',
      cabinNote: 'Aviation security: never pack money or credit cards in check-in hold',
      defaultChecked: true,
      icon: '💵',
    }
  );

  if (context.isInternational) {
    rawSuggestions.push(
      {
        id: 'doc-passport-copy',
        text: 'Printed Passport Copies & Visa Papers',
        category: 'documents',
        airplaneEligibility: 'cabin-only',
        scope: 'personal',
        reason: 'International travel & immigration',
        cabinNote: 'Keep copies separate from original passport',
        defaultChecked: true,
        icon: '🛂',
      },
      {
        id: 'doc-insurance',
        text: 'Travel Medical Insurance Policy Card',
        category: 'documents',
        airplaneEligibility: 'cabin-only',
        scope: 'shared',
        reason: 'International visa / border compliance',
        defaultChecked: true,
        icon: '📋',
      }
    );
  }

  // ==========================================
  // 2. Electronics & Lithium Batteries (Cabin Only Safety Rule)
  // ==========================================
  rawSuggestions.push(
    {
      id: 'elec-powerbank',
      text: 'Power Bank (10,000 - 20,000 mAh)',
      category: 'packing',
      airplaneEligibility: 'cabin-only',
      isFlightEssential: true,
      scope: 'personal',
      reason: 'ICAO Aviation Safety: loose lithium batteries strictly prohibited in hold',
      cabinNote: 'Must be carried in cabin only. Prohibited in check-in baggage!',
      defaultChecked: true,
      icon: '🔋',
    },
    {
      id: 'elec-charger',
      text: 'Phone Charger & Fast-charging Cables',
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      cabinNote: 'Recommended in cabin for airport / in-flight charging ports',
      defaultChecked: true,
      icon: '🔌',
    },
    {
      id: 'elec-headphones',
      text: 'Earphones / Noise Cancelling Headphones',
      category: 'packing',
      airplaneEligibility: 'cabin-only',
      scope: 'personal',
      reason: 'In-flight entertainment & comfort',
      defaultChecked: true,
      icon: '🎧',
    },
    {
      id: 'squad-speaker',
      text: 'Portable Bluetooth Travel Speaker',
      category: 'packing',
      airplaneEligibility: 'cabin-only',
      scope: 'shared',
      reason: 'Squad entertainment at stay / villa (Bring 1 for the group)',
      cabinNote: 'Internal lithium battery - carry in cabin',
      defaultChecked: false,
      icon: '🔊',
    }
  );

  if (context.isInternational) {
    rawSuggestions.push({
      id: 'elec-adapter',
      text: 'Universal Travel Plug Adapter & Multi-USB Hub',
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'shared',
      reason: 'International plug sockets (Shareable for squad)',
      defaultChecked: true,
      icon: '🔌',
    });
  }

  // ==========================================
  // 3. Clothing Essentials (Scaled by Duration)
  // ==========================================
  const topsCount = Math.min(days + 2, 10);
  const bottomsCount = Math.min(Math.ceil(days / 2) + 1, 5);

  rawSuggestions.push(
    {
      id: 'cloth-tops',
      text: `${topsCount}x T-shirts / Shirts`,
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      reason: `Calculated for ${days} days`,
      defaultChecked: true,
      icon: '👕',
    },
    {
      id: 'cloth-bottoms',
      text: `${bottomsCount}x Pants / Shorts / Jeans`,
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      reason: `Calculated for ${days} days`,
      defaultChecked: true,
      icon: '👖',
    },
    {
      id: 'cloth-inner',
      text: `${topsCount}x Undergarments & Socks`,
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      defaultChecked: true,
      icon: '🧦',
    },
    {
      id: 'cloth-sleep',
      text: '2x Nightwear / Loungewear',
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      defaultChecked: true,
      icon: '🩳',
    },
    {
      id: 'cloth-shoes',
      text: 'Comfortable Walking Shoes',
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      defaultChecked: true,
      icon: '👟',
    }
  );

  // ==========================================
  // 4. Beach & Warm Weather Additions
  // ==========================================
  if (isBeach) {
    rawSuggestions.push(
      {
        id: 'beach-swim',
        text: 'Swimwear / Swim Trunks',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'Beach / Coastal spot',
        defaultChecked: true,
        icon: '🩲',
      },
      {
        id: 'beach-sunscreen',
        text: 'Sunscreen Lotion (SPF 50+ travel bottle ≤100ml)',
        category: 'packing',
        airplaneEligibility: 'cabin-only',
        scope: 'shared',
        isLiquid: true,
        reason: 'High UV exposure (Shareable squad bottle)',
        cabinNote: '3-1-1 Rule: Keep in transparent 1-quart bag if carried in cabin',
        defaultChecked: true,
        icon: '🧴',
      },
      {
        id: 'beach-sunglasses',
        text: 'Polarized Sunglasses & Sun Hat',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'Sunny weather',
        defaultChecked: true,
        icon: '🕶️',
      },
      {
        id: 'beach-pouch',
        text: 'Waterproof Phone Pouch',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'Water sports & pool',
        defaultChecked: true,
        icon: '📱',
      },
      {
        id: 'beach-sandals',
        text: 'Flip Flops / Beach Slippers',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        defaultChecked: true,
        icon: '🩴',
      }
    );
  }

  // ==========================================
  // 5. Cold Weather & Mountain Gear
  // ==========================================
  if (isMountainOrCold) {
    rawSuggestions.push(
      {
        id: 'cold-jacket',
        text: 'Heavy Down Jacket / Windcheater',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: `Cold climate (~${temp}°C)`,
        cabinNote: 'Wear or carry onto aircraft to save luggage weight',
        defaultChecked: true,
        icon: '🧥',
      },
      {
        id: 'cold-thermal',
        text: 'Thermal Innerwear (Top & Bottom)',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: `Low temperatures (~${temp}°C)`,
        defaultChecked: true,
        icon: '🧣',
      },
      {
        id: 'cold-beanie',
        text: 'Woolen Beanie & Warm Gloves',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'Protection against cold winds',
        defaultChecked: true,
        icon: '🧤',
      },
      {
        id: 'cold-lipbalm',
        text: 'Moisturizer & Lip Balm (Travel Mini ≤100ml)',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        isLiquid: true,
        reason: 'Dry cold mountain air',
        cabinNote: 'Complies with 3-1-1 cabin liquids limit',
        defaultChecked: true,
        icon: '💄',
      }
    );

    if (
      destLower.includes('trek') ||
      destLower.includes('mountain') ||
      destLower.includes('himalaya') ||
      destLower.includes('alps') ||
      destLower.includes('manali') ||
      destLower.includes('himachal') ||
      destLower.includes('ladakh') ||
      destLower.includes('leh')
    ) {
      rawSuggestions.push({
        id: 'gear-trekking-poles',
        text: 'Trekking Poles / Hiking Sticks',
        category: 'packing',
        airplaneEligibility: 'checkin-only',
        scope: 'personal',
        reason: 'Trekking terrain',
        cabinNote: 'Prohibited in aircraft cabin by airport security. Must go into check-in hold!',
        defaultChecked: false,
        icon: '🦯',
      });
    }
  }

  // ==========================================
  // 6. Rainy & Monsoon Gear
  // ==========================================
  if (isRainy) {
    rawSuggestions.push(
      {
        id: 'rain-umbrella',
        text: 'Compact Foldable Umbrella / Rain Poncho',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'Precipitation / Rain in forecast',
        cabinNote: 'Foldable umbrellas allowed in cabin; straight spiked ones may require check-in',
        defaultChecked: true,
        icon: '☂️',
      },
      {
        id: 'rain-bagcover',
        text: 'Waterproof Backpack Cover',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'Rain protection on the go',
        defaultChecked: true,
        icon: '🎒',
      },
      {
        id: 'rain-quickdry',
        text: 'Quick-dry Microfiber Towel & Clothes',
        category: 'packing',
        airplaneEligibility: 'any',
        scope: 'personal',
        reason: 'High humidity & wet conditions',
        defaultChecked: true,
        icon: '🧺',
      }
    );
  }

  // ==========================================
  // 7. Medical & First-Aid (Prescriptions in Cabin)
  // ==========================================
  rawSuggestions.push(
    {
      id: 'med-prescriptions',
      text: 'Personal Prescription Medicines & Inhalers',
      category: 'medical',
      airplaneEligibility: 'cabin-only',
      isFlightEssential: true,
      scope: 'personal',
      cabinNote: 'Aviation guideline: never check in vital medications in hold',
      defaultChecked: true,
      icon: '💊',
    },
    {
      id: 'med-kit',
      text: 'Shared Squad First-aid Kit (Band-aids, Antiseptic, Cotton)',
      category: 'medical',
      airplaneEligibility: 'any',
      scope: 'shared',
      isLiquid: true,
      reason: 'Shared squad medical kit (1 member can carry for group)',
      defaultChecked: true,
      icon: '🩹',
    },
    {
      id: 'med-pills',
      text: 'Paracetamol, Antacids & Motion Sickness Pills',
      category: 'medical',
      airplaneEligibility: 'any',
      scope: 'shared',
      reason: 'General travel pills (1 strip for group)',
      defaultChecked: true,
      icon: '💊',
    }
  );

  // ==========================================
  // 8. Toiletries (Enforcing 3-1-1 Airplane Rule)
  // ==========================================
  rawSuggestions.push(
    {
      id: 'toil-mini-kit',
      text: 'Travel Toiletries Kit (Toothbrush, Paste, Shampoo ≤100ml)',
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'personal',
      isLiquid: true,
      cabinNote: 'Containers ≤ 100ml (3.4oz) in transparent 1-quart resealable bag',
      defaultChecked: true,
      icon: '🪥',
    },
    {
      id: 'toil-wipes',
      text: 'Sanitizer Wipes & Tissues',
      category: 'packing',
      airplaneEligibility: 'any',
      scope: 'shared',
      cabinNote: 'Solid wipes are exempt from liquid volume limits',
      defaultChecked: true,
      icon: '🧼',
    }
  );

  rawSuggestions.push({
    id: 'gear-multitool',
    text: 'Multi-tool / Swiss Pocket Knife / Scissors',
    category: 'packing',
    airplaneEligibility: 'checkin-only',
    scope: 'shared',
    reason: 'Emergency utility gear (1 for the group)',
    cabinNote: 'Blades and sharp objects strictly prohibited in airplane cabin. Check-in only!',
    defaultChecked: false,
    icon: '🔪',
  });

  if (context.luggageFilter === 'cabin-only') {
    return rawSuggestions.filter((item) => item.airplaneEligibility !== 'checkin-only');
  } else if (context.luggageFilter === 'checkin-only') {
    return rawSuggestions.filter((item) => item.airplaneEligibility !== 'cabin-only');
  }

  return rawSuggestions;
}

/**
 * Generate a formatted travel packing note in markdown format
 * for adding directly to the trip notes.
 */
export function generatePackingGuideNote(
  destination: string,
  startDate: string,
  endDate: string,
  items: PackingSuggestionItem[],
  weatherInfo?: string
): { title: string; content: string } {
  const cabinItems = items.filter((i) => i.airplaneEligibility === 'cabin-only');
  const checkinItems = items.filter((i) => i.airplaneEligibility === 'checkin-only');
  const anyBagItems = items.filter((i) => i.airplaneEligibility === 'any');

  const content = [
    `📍 **Destination:** ${destination || 'Trip'}`,
    `📅 **Dates:** ${startDate} to ${endDate}`,
    weatherInfo ? `⛅ **Weather Forecast / Climate:** ${weatherInfo}` : '',
    '',
    '### ✈️ Airplane Carry-on (Cabin Bag)',
    '> *Strictly pack lithium batteries, power banks, and vital IDs here. Containers must be ≤100ml in a clear 1-quart bag.*',
    ...cabinItems.map((i) => `- [ ] ${i.icon || '📦'} **${i.text}**${i.cabinNote ? ` _(${i.cabinNote})_` : ''}`),
    '',
    ...(checkinItems.length > 0
      ? [
          '### 🧳 Checked Baggage Only',
          '> *Blades, sharp tools, and liquids over 100ml must NOT enter the aircraft cabin.*',
          ...checkinItems.map((i) => `- [ ] ${i.icon || '📦'} **${i.text}**${i.cabinNote ? ` _(${i.cabinNote})_` : ''}`),
          '',
        ]
      : []),
    '### 🎒 Flexible / Any Bag',
    ...anyBagItems.map((i) => `- [ ] ${i.icon || '📦'} **${i.text}**`),
    '',
    '---',
    '💡 *Generated by Smart Travel Assistant — compliant with ICAO / TSA baggage standards.*',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: `✈️ Packing & Flight Guide - ${destination || 'Trip'}`,
    content,
  };
}
