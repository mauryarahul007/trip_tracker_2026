import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureActive,
  FEATURE_FLAGS_META,
} from './featureFlags';

describe('featureFlags', () => {
  it('has valid metadata for all feature flags', () => {
    Object.keys(DEFAULT_FEATURE_FLAGS).forEach((k) => {
      const key = k as keyof typeof DEFAULT_FEATURE_FLAGS;
      expect(FEATURE_FLAGS_META[key]).toBeDefined();
      expect(FEATURE_FLAGS_META[key].label).toBeTruthy();
      expect(FEATURE_FLAGS_META[key].description).toBeTruthy();
    });
  });

  it('superadmin bypasses feature restrictions for normal capabilities', () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS, enableGeotagging: false, enableP2PSync: false };
    expect(isFeatureActive('enableGeotagging', flags, { isSuperadmin: true })).toBe(true);
    expect(isFeatureActive('enableP2PSync', flags, { isSuperadmin: true })).toBe(true);
    expect(isFeatureActive('enableAdvancedLocationSearch', flags, { isSuperadmin: true })).toBe(true);
  });

  it('strict-toggle flags (demo seeding, feature suggestions) respect explicit toggle state even for superadmin', () => {
    const flagsOff = { ...DEFAULT_FEATURE_FLAGS, enableDemoSeeding: false, enableFeatureSuggestions: false };
    expect(isFeatureActive('enableDemoSeeding', flagsOff, { isSuperadmin: true })).toBe(false);
    expect(isFeatureActive('enableFeatureSuggestions', flagsOff, { isSuperadmin: true })).toBe(false);

    const flagsOn = { ...DEFAULT_FEATURE_FLAGS, enableDemoSeeding: true, enableFeatureSuggestions: true };
    expect(isFeatureActive('enableDemoSeeding', flagsOn, { isSuperadmin: true })).toBe(true);
    expect(isFeatureActive('enableFeatureSuggestions', flagsOn, { isSuperadmin: true })).toBe(true);
  });

  it('resolves global flags for regular users', () => {
    const flags = {
      ...DEFAULT_FEATURE_FLAGS,
      enableGeotagging: true,
      enableAdvancedLocationSearch: false,
    };
    expect(isFeatureActive('enableGeotagging', flags, { isSuperadmin: false })).toBe(true);
    expect(isFeatureActive('enableAdvancedLocationSearch', flags, { isSuperadmin: false })).toBe(false);
  });

  it('respects trip-level overrides', () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS, enableAdvancedLocationSearch: false };
    const tripOverrides = {
      'trip-123': { enableAdvancedLocationSearch: true },
    };

    expect(isFeatureActive('enableAdvancedLocationSearch', flags, {
      isSuperadmin: false,
      tripId: 'trip-123',
      tripOverrides,
    })).toBe(true);

    expect(isFeatureActive('enableAdvancedLocationSearch', flags, {
      isSuperadmin: false,
      tripId: 'trip-other',
      tripOverrides,
    })).toBe(false);
  });

  it('respects user-level overrides over trip-level overrides', () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS, enableGeotagging: true };
    const tripOverrides = { 'trip-1': { enableGeotagging: true } };
    const userOverrides = { 'user-vip': { enableGeotagging: false } };

    expect(isFeatureActive('enableGeotagging', flags, {
      isSuperadmin: false,
      userId: 'user-vip',
      tripId: 'trip-1',
      tripOverrides,
      userOverrides,
    })).toBe(false);
  });
});
