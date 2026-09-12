import type { FeatureFlagKey, FeatureFlagMeta, ReleasePhaseDef, ReleasePhaseId } from '../types/admin';

export const RELEASE_PHASES: ReleasePhaseDef[] = [
  {
    id: 'phase1',
    phaseNumber: 1,
    code: 'PHASE 01',
    title: 'Zero-Friction Social Splitter',
    tagline: 'Instant, offline group bill splitting without setup hurdles',
    description: 'Core frictionless expense splitting, time-of-day predictive chips, 200+ keyword auto-tagging, and 24h soft-delete protection.',
    targetAudience: 'Casual outings, dinners, weekend getaways, roommates',
    flagKeys: ['enablePredictiveChips', 'enableRecycleBin'],
  },
  {
    id: 'phase2',
    phaseNumber: 2,
    code: 'PHASE 02',
    title: 'Active Group Collab & Natural Entry',
    tagline: 'Frictionless on-trip logging & shared trip organization',
    description: 'Hands-free voice quick-add with Hinglish NLP parsing, compressed receipt photos, collaborative packing & rich notes, and 4D duplicate expense warning.',
    targetAudience: 'Friends & families actively traveling together',
    flagKeys: ['enableVoiceInput', 'enableReceiptUpload', 'enableNotesAndChecklist', 'enableDuplicateDetector'],
  },
  {
    id: 'phase3',
    phaseNumber: 3,
    code: 'PHASE 03',
    title: 'Smart Travel Navigator & Pass Hub',
    tagline: 'Boarding passes, live flight radar, and airport turnstile tools',
    description: 'Universal Travel Pass Wallet, Dynamic Island Next-Up capsule, optical barcode gate scanner, live flight/PNR status radar, smart packing assistant, and route stops.',
    targetAudience: 'Air & rail travelers, road-trippers, multi-city itineraries',
    flagKeys: [
      'enableTravelPasses',
      'enableNextUpCapsule',
      'enableGateScanner',
      'enableFlightRadar',
      'enablePackingAssistant',
      'enableRouteStops',
      'enableGeotagging',
    ],
  },
  {
    id: 'phase4',
    phaseNumber: 4,
    code: 'PHASE 04',
    title: 'FinTech Pro & Global Jetsetter Suite',
    tagline: 'Advanced splits, multi-currency conversions & bank-grade security',
    description: 'Unequal exact/percent/weight splits, itemized restaurant receipt breakdowns, on-device OCR camera scanning, 160+ currency FX rates, and biometric screen lock.',
    targetAudience: 'Power users, digital nomads, international travelers',
    flagKeys: [
      'enableAdvancedSplits',
      'enableItemizedSplit',
      'enableReceiptOcr',
      'enableCurrencyFx',
      'enableMultiTripAnalytics',
      'enableBiometricAuth',
    ],
  },
  {
    id: 'deferred',
    phaseNumber: 0,
    code: 'EXTRAS',
    title: 'Platform Extras & Back-Office Ops',
    tagline: 'Delighters, backup utilities, and administrative engineering tools',
    description: 'Trip Wrapped highlights, Squad Achievements, offline JSON snapshot backup, place search, feature suggestions, and admin tools.',
    targetAudience: 'All users and ops administrators',
    flagKeys: [
      'enableTripWrapped',
      'enableAchievements',
      'enableOfflineSnapshot',
      'enableAdvancedLocationSearch',
      'enableFeatureSuggestions',
      'enableKeywordTagging',
      'enableDemoSeeding',
      'enableUpiPayments',
    ],
  },
];

export const FEATURE_FLAGS_META: Record<FeatureFlagKey, FeatureFlagMeta> = {
  // Phase 1: Core Social Splitter
  enablePredictiveChips: {
    key: 'enablePredictiveChips',
    label: 'Predictive Quick-Expense Chips',
    description: 'Shows time-of-day suggestions (breakfast, cab, dinner) for 1-tap logging.',
    category: 'core',
    phase: 'phase1',
    defaultEnabledForUsers: true,
  },
  enableRecycleBin: {
    key: 'enableRecycleBin',
    label: 'Recycle Bin & 24h Soft-Delete',
    description: 'Safeguards deleted expenses in a 24-hour staging area with instant restore.',
    category: 'core',
    phase: 'phase1',
    defaultEnabledForUsers: true,
  },

  // Phase 2: Active Group Collab
  enableVoiceInput: {
    key: 'enableVoiceInput',
    label: 'Hands-Free Voice Quick-Add',
    description: 'Web Speech API listener with Hinglish number parser and acoustic feedback.',
    category: 'collab',
    phase: 'phase2',
    defaultEnabledForUsers: true,
  },
  enableReceiptUpload: {
    key: 'enableReceiptUpload',
    label: 'Receipt Photo Attachments',
    description: 'Allows capturing and attaching compressed receipt images to expenses.',
    category: 'collab',
    phase: 'phase2',
    defaultEnabledForUsers: true,
  },
  enableNotesAndChecklist: {
    key: 'enableNotesAndChecklist',
    label: 'Collaborative Notes & Checklist Hub',
    description: 'Enables the 5th tab for shared packing lists, Wi-Fi codes, and trip notes.',
    category: 'collab',
    phase: 'phase2',
    defaultEnabledForUsers: true,
  },
  enableDuplicateDetector: {
    key: 'enableDuplicateDetector',
    label: '4D Duplicate Expense Warning Guard',
    description: 'Heuristic check preventing duplicate check-ins or companion double-entries.',
    category: 'collab',
    phase: 'phase2',
    defaultEnabledForUsers: true,
  },

  // Phase 3: Smart Travel Navigator & Pass Hub
  enableTravelPasses: {
    key: 'enableTravelPasses',
    label: 'Universal Travel Pass Wallet',
    description: 'Central wallet for airline boarding passes, train tickets, and hotel vouchers.',
    category: 'transit',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },
  enableNextUpCapsule: {
    key: 'enableNextUpCapsule',
    label: '"Next Up" Travel Island Capsule',
    description: 'Pinned transit countdown capsule tracking imminent flights and trains within 36h.',
    category: 'transit',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },
  enableGateScanner: {
    key: 'enableGateScanner',
    label: 'High-Contrast Optical Gate Scanner',
    description: 'Inverted retina barcode viewer with Screen Wake Lock API for turnstiles.',
    category: 'transit',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },
  enableFlightRadar: {
    key: 'enableFlightRadar',
    label: 'Live Flight & Railways PNR Radar',
    description: 'Deep links to Flightradar24, FlightAware, ConfirmTkt, and RailYatri.',
    category: 'transit',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },
  enablePackingAssistant: {
    key: 'enablePackingAssistant',
    label: 'Smart Weather & Packing Assistant',
    description: 'Open-Meteo destination weather analysis & airline luggage rule checklist.',
    category: 'transit',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },
  enableRouteStops: {
    key: 'enableRouteStops',
    label: 'Interactive Route Stops Itinerary',
    description: 'Multi-city itinerary manager with arrival/departure dates and map pins.',
    category: 'transit',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },
  enableGeotagging: {
    key: 'enableGeotagging',
    label: 'GPS Geotagging & Journey Map',
    description: 'Auto GPS coordinates and MapLibre GL interactive spending trail.',
    category: 'geotagging',
    phase: 'phase3',
    defaultEnabledForUsers: true,
  },

  // Phase 4: FinTech Pro & Global Jetsetter Suite
  enableAdvancedSplits: {
    key: 'enableAdvancedSplits',
    label: 'Advanced Split Modes',
    description: 'Unlocks Exact amounts, Percentage, and Custom Weight split modes.',
    category: 'splits',
    phase: 'phase4',
    defaultEnabledForUsers: true,
  },
  enableItemizedSplit: {
    key: 'enableItemizedSplit',
    label: 'Itemized Receipt Splitting',
    description: 'Line-item dish assignment with automated tax and tip proration.',
    category: 'splits',
    phase: 'phase4',
    defaultEnabledForUsers: true,
  },
  enableReceiptOcr: {
    key: 'enableReceiptOcr',
    label: 'On-Device Tesseract Receipt OCR',
    description: 'Camera bill scanning and text/total extraction directly on device.',
    category: 'fintech',
    phase: 'phase4',
    defaultEnabledForUsers: true,
  },
  enableCurrencyFx: {
    key: 'enableCurrencyFx',
    label: 'Live Multi-Currency FX Converter',
    description: 'Real-time conversion across 160+ fiat currencies with offline lock.',
    category: 'fintech',
    phase: 'phase4',
    defaultEnabledForUsers: true,
  },
  enableMultiTripAnalytics: {
    key: 'enableMultiTripAnalytics',
    label: 'Master Multi-Trip Analytics',
    description: 'Cross-trip net balance, category breakdown, and spending charts.',
    category: 'fintech',
    phase: 'phase4',
    defaultEnabledForUsers: true,
  },
  enableBiometricAuth: {
    key: 'enableBiometricAuth',
    label: 'Biometric Screen Lock (WebAuthn)',
    description: 'Touch ID, Face ID, or Windows Hello passkey protection for trips.',
    category: 'security',
    phase: 'phase4',
    defaultEnabledForUsers: true,
  },

  // Extras & Unphased Platform Tools
  enableTripWrapped: {
    key: 'enableTripWrapped',
    label: 'Trip Wrapped Story Card & Highlights',
    description: 'Interactive year-end/trip-end highlights and spend personality cards.',
    category: 'core',
    phase: 'deferred',
    defaultEnabledForUsers: true,
  },
  enableAchievements: {
    key: 'enableAchievements',
    label: 'Trip Squad Achievements & Milestones',
    description: 'Gamified milestone badges (First Expense, Settle-Up Master, Global Roamer).',
    category: 'core',
    phase: 'deferred',
    defaultEnabledForUsers: true,
  },
  enableOfflineSnapshot: {
    key: 'enableOfflineSnapshot',
    label: 'Offline Snapshot JSON Data Backup',
    description: 'Complete offline JSON database export and backup migration tools.',
    category: 'admin',
    phase: 'deferred',
    defaultEnabledForUsers: true,
  },
  enableAdvancedLocationSearch: {
    key: 'enableAdvancedLocationSearch',
    label: 'Advanced Place Name Search & Map Picker',
    description: 'Nominatim geocoding place search and manual map pin picker.',
    category: 'geotagging',
    phase: 'deferred',
    defaultEnabledForUsers: true,
  },
  enableFeatureSuggestions: {
    key: 'enableFeatureSuggestions',
    label: 'Suggest a Feature Feedback Box',
    description: 'Allows travelers to submit feature feedback directly to the Ops Deck.',
    category: 'admin',
    phase: 'deferred',
    defaultEnabledForUsers: true,
  },
  enableKeywordTagging: {
    key: 'enableKeywordTagging',
    label: 'Custom Keyword & Brand Tag Editor',
    description: 'Exposes dictionary editor in Categories settings.',
    category: 'admin',
    phase: 'deferred',
    defaultEnabledForUsers: false,
  },
  enableDemoSeeding: {
    key: 'enableDemoSeeding',
    label: 'Demo Trip Data Seeding',
    description: 'Shows "Seed Demo Data" button in Settings.',
    category: 'admin',
    phase: 'deferred',
    defaultEnabledForUsers: false,
  },
  enableUpiPayments: {
    key: 'enableUpiPayments',
    label: '1-Tap UPI / Payment App Links (Deferred)',
    description: 'Out of scope for initial consumer rollout. Kept disabled.',
    category: 'splits',
    phase: 'deferred',
    defaultEnabledForUsers: false,
  },
};

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  // Phase 1 (Armed by default)
  enablePredictiveChips: true,
  enableRecycleBin: true,

  // Phase 2 (Armed by default)
  enableVoiceInput: true,
  enableReceiptUpload: true,
  enableNotesAndChecklist: true,
  enableDuplicateDetector: true,

  // Phase 3 (Armed by default)
  enableTravelPasses: true,
  enableNextUpCapsule: true,
  enableGateScanner: true,
  enableFlightRadar: true,
  enablePackingAssistant: true,
  enableRouteStops: true,
  enableGeotagging: true,

  // Phase 4 (Armed by default)
  enableAdvancedSplits: true,
  enableItemizedSplit: true,
  enableReceiptOcr: true,
  enableCurrencyFx: true,
  enableMultiTripAnalytics: true,
  enableBiometricAuth: true,

  // Platform Extras & Deferred
  enableTripWrapped: true,
  enableAchievements: true,
  enableOfflineSnapshot: true,
  enableAdvancedLocationSearch: true,
  enableFeatureSuggestions: true,
  enableKeywordTagging: false,
  enableDemoSeeding: false,
  enableUpiPayments: false,
};

export function getPhaseFlagKeys(phaseId: ReleasePhaseId): FeatureFlagKey[] {
  const phase = RELEASE_PHASES.find((p) => p.id === phaseId);
  return phase ? phase.flagKeys : [];
}

export function getPhaseStatus(
  phaseId: ReleasePhaseId,
  flags: Record<FeatureFlagKey, boolean>
): { activeCount: number; totalCount: number; status: 'armed' | 'partial' | 'safed' } {
  const keys = getPhaseFlagKeys(phaseId);
  if (keys.length === 0) return { activeCount: 0, totalCount: 0, status: 'safed' };
  let active = 0;
  for (const k of keys) {
    const isEnabled = flags[k] ?? FEATURE_FLAGS_META[k]?.defaultEnabledForUsers ?? false;
    if (isEnabled) active++;
  }
  return {
    activeCount: active,
    totalCount: keys.length,
    status: active === keys.length ? 'armed' : active > 0 ? 'partial' : 'safed',
  };
}

export function isFeatureActive(
  key: FeatureFlagKey,
  flags: Record<FeatureFlagKey, boolean>,
  context?: {
    isSuperadmin?: boolean;
    isTravelerPreview?: boolean;
    tripId?: string;
    userId?: string;
    tripOverrides?: Record<string, Record<string, boolean>>;
    userOverrides?: Record<string, Record<string, boolean>>;
  }
): boolean {
  // 1. User-specific override takes top precedence
  if (context?.userId && context.userOverrides?.[context.userId]?.[key] !== undefined) {
    return context.userOverrides[context.userId][key];
  }

  // 2. Trip-specific override takes second precedence
  if (context?.tripId && context.tripOverrides?.[context.tripId]?.[key] !== undefined) {
    return context.tripOverrides[context.tripId][key];
  }

  // 3. Global feature flag configured in switchboard (armed = true, safed = false)
  // Explicitly configured state ALWAYS governs so Arm/Safe actions immediately take effect
  if (flags && flags[key] !== undefined) {
    return flags[key];
  }

  // 4. Default fallback
  return FEATURE_FLAGS_META[key]?.defaultEnabledForUsers ?? false;
}
