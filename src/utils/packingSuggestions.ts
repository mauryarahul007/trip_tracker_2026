export interface PackingSuggestionItem {
  id: string;
  text: string;
  category: 'packing' | 'prep' | 'documents' | 'medical' | 'general';
  reason?: string; // e.g. "Monsoon / Rain in forecast" or "Beach destination"
  icon?: string;
  defaultChecked?: boolean;
}

export interface PackingContext {
  destination?: string;
  durationDays?: number;
  weatherCondition?: string; // e.g. "rain", "sunny", "clouds", "snow"
  avgTemp?: number;
  isInternational?: boolean;
}

export function generateSmartPackingSuggestions(context: PackingContext): PackingSuggestionItem[] {
  const days = Math.max(1, context.durationDays || 3);
  const destLower = (context.destination || '').toLowerCase();
  const weatherLower = (context.weatherCondition || '').toLowerCase();
  const temp = context.avgTemp ?? 25;

  const isBeach =
    destLower.includes('beach') ||
    destLower.includes('goa') ||
    destLower.includes('bali') ||
    destLower.includes('phuket') ||
    destLower.includes('maldives') ||
    destLower.includes('coast') ||
    destLower.includes('island') ||
    destLower.includes('krabi') ||
    destLower.includes('pattaya');

  const isMountainOrCold =
    temp < 15 ||
    destLower.includes('mountain') ||
    destLower.includes('trek') ||
    destLower.includes('manali') ||
    destLower.includes('ladakh') ||
    destLower.includes('shimla') ||
    destLower.includes('alps') ||
    destLower.includes('himalaya') ||
    destLower.includes('kashmir') ||
    destLower.includes('switzerland');

  const isRainy = weatherLower.includes('rain') || weatherLower.includes('drizzle') || weatherLower.includes('thunderstorm') || weatherLower.includes('shower');

  const suggestions: PackingSuggestionItem[] = [];

  // 1. Documents & Essentials
  suggestions.push(
    { id: 'doc-id', text: 'Government Photo ID / Passport', category: 'documents', defaultChecked: true, icon: '🪪' },
    { id: 'doc-tickets', text: 'Flight / Train Boarding Passes & Tickets', category: 'documents', defaultChecked: true, icon: '🎫' },
    { id: 'doc-hotel', text: 'Hotel / Airbnb Confirmation Vouchers', category: 'documents', defaultChecked: true, icon: '🏨' },
    { id: 'doc-cash', text: 'Cash & Forex / Debit Cards', category: 'documents', defaultChecked: true, icon: '💵' }
  );

  if (context.isInternational) {
    suggestions.push(
      { id: 'doc-passport-copy', text: 'Printed Passport Copies & Visa', category: 'documents', reason: 'International travel', defaultChecked: true, icon: '🛂' },
      { id: 'doc-insurance', text: 'Travel Medical Insurance Card', category: 'documents', reason: 'International travel', defaultChecked: true, icon: '📋' }
    );
  }

  // 2. Clothing Essentials (computed by duration)
  const topsCount = Math.min(days + 2, 10);
  const bottomsCount = Math.min(Math.ceil(days / 2) + 1, 5);
  suggestions.push(
    { id: 'cloth-tops', text: `${topsCount}x T-shirts / Shirts`, category: 'packing', reason: `Calculated for ${days} days`, defaultChecked: true, icon: '👕' },
    { id: 'cloth-bottoms', text: `${bottomsCount}x Pants / Shorts / Jeans`, category: 'packing', reason: `Calculated for ${days} days`, defaultChecked: true, icon: '👖' },
    { id: 'cloth-inner', text: `${topsCount}x Undergarments & Socks`, category: 'packing', defaultChecked: true, icon: '🧦' },
    { id: 'cloth-sleep', text: '2x Nightwear / Loungewear', category: 'packing', defaultChecked: true, icon: '🩳' },
    { id: 'cloth-shoes', text: 'Comfortable Walking Shoes', category: 'packing', defaultChecked: true, icon: '👟' }
  );

  // 3. Beach & Tropical additions
  if (isBeach) {
    suggestions.push(
      { id: 'beach-swim', text: 'Swimwear / Swim Trunks', category: 'packing', reason: 'Beach / Coastal spot', defaultChecked: true, icon: '🩲' },
      { id: 'beach-sunscreen', text: 'Water-resistant Sunscreen (SPF 50+)', category: 'packing', reason: 'High UV exposure', defaultChecked: true, icon: '🧴' },
      { id: 'beach-sunglasses', text: 'Polarized Sunglasses & Sun Hat', category: 'packing', reason: 'Sunny weather', defaultChecked: true, icon: '🕶️' },
      { id: 'beach-pouch', text: 'Waterproof Phone Pouch', category: 'packing', reason: 'Water sports & pool', defaultChecked: true, icon: '📱' },
      { id: 'beach-sandals', text: 'Flip Flops / Beach Slippers', category: 'packing', defaultChecked: true, icon: '🩴' }
    );
  }

  // 4. Cold & Mountain additions
  if (isMountainOrCold) {
    suggestions.push(
      { id: 'cold-jacket', text: 'Heavy Down Jacket / Windcheater', category: 'packing', reason: `Cold weather (${temp}°C)`, defaultChecked: true, icon: '🧥' },
      { id: 'cold-thermal', text: 'Thermal Innerwear (Top & Bottom)', category: 'packing', reason: `Low temperature (${temp}°C)`, defaultChecked: true, icon: '🧣' },
      { id: 'cold-beanie', text: 'Woolen Beanie & Warm Gloves', category: 'packing', reason: 'Cold temperatures', defaultChecked: true, icon: '🧤' },
      { id: 'cold-lipbalm', text: 'Moisturizer & Lip Balm', category: 'packing', reason: 'Dry mountain air', defaultChecked: true, icon: '💄' }
    );
  }

  // 5. Rainy / Weather additions
  if (isRainy) {
    suggestions.push(
      { id: 'rain-umbrella', text: 'Compact Umbrella / Rain Poncho', category: 'packing', reason: 'Rain in weather forecast', defaultChecked: true, icon: '☂️' },
      { id: 'rain-bagcover', text: 'Waterproof Backpack Cover', category: 'packing', reason: 'Precipitation protection', defaultChecked: true, icon: '🎒' },
      { id: 'rain-quickdry', text: 'Quick-dry Towel & Clothes', category: 'packing', reason: 'Humid / Wet weather', defaultChecked: true, icon: '🧺' }
    );
  }

  // 6. Electronics & Gadgets
  suggestions.push(
    { id: 'elec-charger', text: 'Phone Charger & Fast-charging Cable', category: 'packing', defaultChecked: true, icon: '🔌' },
    { id: 'elec-powerbank', text: 'Power Bank (10,000+ mAh)', category: 'packing', defaultChecked: true, icon: '🔋' },
    { id: 'elec-headphones', text: 'Earphones / Noise Cancelling Headphones', category: 'packing', defaultChecked: true, icon: '🎧' }
  );

  if (context.isInternational) {
    suggestions.push({
      id: 'elec-adapter',
      text: 'Universal Travel Plug Adapter',
      category: 'packing',
      reason: 'International plug sockets',
      defaultChecked: true,
      icon: '🔌',
    });
  }

  // 7. Medical & Toiletries
  suggestions.push(
    { id: 'med-kit', text: 'First-aid Kit (Band-aids, Antiseptic, Cotton)', category: 'medical', defaultChecked: true, icon: '🩹' },
    { id: 'med-pills', text: 'Painkillers (Paracetamol), Antacids, Motion Sickness pills', category: 'medical', defaultChecked: true, icon: '💊' },
    { id: 'toil-brush', text: 'Toothbrush, Paste & Mini Toiletries', category: 'packing', defaultChecked: true, icon: '🪥' },
    { id: 'toil-wipes', text: 'Sanitizer & Disinfectant Wet Wipes', category: 'packing', defaultChecked: true, icon: '🧼' }
  );

  return suggestions;
}
