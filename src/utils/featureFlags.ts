import type { FeatureFlagKey, FeatureFlagMeta } from '../types/admin';

export const FEATURE_FLAGS_META: Record<FeatureFlagKey, FeatureFlagMeta> = {
  enableGeotagging: {
    key: 'enableGeotagging',
    label: 'Basic GPS Geotagging',
    description: 'Allows 1-tap auto GPS tagging on expenses & trip journey map stops.',
    category: 'geotagging',
    defaultEnabledForUsers: true,
  },
  enableAdvancedLocationSearch: {
    key: 'enableAdvancedLocationSearch',
    label: 'Advanced Location Search & Map Picker',
    description: 'Allows searching places by name with autocomplete suggestions & picking pins on map.',
    category: 'geotagging',
    defaultEnabledForUsers: false,
  },
  enableAdvancedSplits: {
    key: 'enableAdvancedSplits',
    label: 'Advanced Split Modes',
    description: 'Unlocks Exact, Percentage, and Custom Weight split modes (Normal users see Equal only).',
    category: 'splits',
    defaultEnabledForUsers: false,
  },
  enableP2PSync: {
    key: 'enableP2PSync',
    label: 'P2P Offline WebRTC Sync',
    description: 'Shows P2P direct device pairing and QR code scanner in Settings.',
    category: 'sync',
    defaultEnabledForUsers: false,
  },
  enableReceiptUpload: {
    key: 'enableReceiptUpload',
    label: 'Receipt Photo Attachments',
    description: 'Allows capturing & uploading receipt photos with compression.',
    category: 'core',
    defaultEnabledForUsers: true,
  },
  enableRecycleBin: {
    key: 'enableRecycleBin',
    label: 'Recycle Bin & Permanent Purge',
    description: 'Exposes the Recycle Bin viewer, immediate permanent deletion, and empty bin tools.',
    category: 'admin',
    defaultEnabledForUsers: false,
  },
  enableKeywordTagging: {
    key: 'enableKeywordTagging',
    label: 'Custom Keyword & Brand Tag Editor',
    description: 'Exposes the full 200+ keyword tag list editor in Categories settings.',
    category: 'core',
    defaultEnabledForUsers: false,
  },
  enableDemoSeeding: {
    key: 'enableDemoSeeding',
    label: 'Demo Trip Data Seeding',
    description: 'Shows the "Seed Demo Data" button in Settings.',
    category: 'admin',
    defaultEnabledForUsers: false,
  },
  enableMultiTripAnalytics: {
    key: 'enableMultiTripAnalytics',
    label: 'Master Multi-Trip Analytics',
    description: 'Aggregates spending KPIs, categories, and currencies across all trips.',
    category: 'admin',
    defaultEnabledForUsers: false,
  },
  enableFeatureSuggestions: {
    key: 'enableFeatureSuggestions',
    label: 'Suggest a Feature',
    description: 'Shows "Suggest a Feature" in Settings, letting the traveler submit requests to the Ops Deck. Off by default -- enable per-person via a User Override, or globally once ready for everyone.',
    category: 'admin',
    defaultEnabledForUsers: false,
  },
};

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  enableGeotagging: true,
  enableAdvancedLocationSearch: false,
  enableAdvancedSplits: false,
  enableP2PSync: false,
  enableReceiptUpload: true,
  enableRecycleBin: false,
  enableKeywordTagging: false,
  enableDemoSeeding: false,
  enableMultiTripAnalytics: false,
  enableFeatureSuggestions: false,
};

export function isFeatureActive(
  key: FeatureFlagKey,
  flags: Record<FeatureFlagKey, boolean>,
  context?: {
    isSuperadmin?: boolean;
    tripId?: string;
    userId?: string;
    tripOverrides?: Record<string, Record<string, boolean>>;
    userOverrides?: Record<string, Record<string, boolean>>;
  }
): boolean {
  // Superadmin always has full access to all features
  if (context?.isSuperadmin) {
    return true;
  }

  // 1. User-specific override
  if (context?.userId && context.userOverrides?.[context.userId]?.[key] !== undefined) {
    return context.userOverrides[context.userId][key];
  }

  // 2. Trip-specific override
  if (context?.tripId && context.tripOverrides?.[context.tripId]?.[key] !== undefined) {
    return context.tripOverrides[context.tripId][key];
  }

  // 3. Global feature flag configured by Superadmin
  if (flags[key] !== undefined) {
    return flags[key];
  }

  // 4. Default fallback
  return FEATURE_FLAGS_META[key]?.defaultEnabledForUsers ?? false;
}
