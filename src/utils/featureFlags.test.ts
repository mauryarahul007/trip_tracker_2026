import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureActive,
  FEATURE_FLAGS_META,
  RELEASE_PHASES,
  getPhaseFlagKeys,
  getPhaseStatus,
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

  it('defines 4 customer release phases plus deferred ops', () => {
    expect(RELEASE_PHASES.length).toBe(5);
    const phaseIds = RELEASE_PHASES.map((p) => p.id);
    expect(phaseIds).toEqual(['phase1', 'phase2', 'phase3', 'phase4', 'deferred']);

    RELEASE_PHASES.forEach((phase) => {
      expect(phase.flagKeys.length).toBeGreaterThan(0);
      phase.flagKeys.forEach((key) => {
        expect(DEFAULT_FEATURE_FLAGS).toHaveProperty(key);
      });
    });
  });

  it('keeps UPI payments deferred and disabled by default', () => {
    expect(DEFAULT_FEATURE_FLAGS.enableUpiPayments).toBe(false);
    const deferredKeys = getPhaseFlagKeys('deferred');
    expect(deferredKeys).toContain('enableUpiPayments');
  });

  it('correctly calculates phase status (armed, safed, partial)', () => {
    const allArmed = { ...DEFAULT_FEATURE_FLAGS, enablePredictiveChips: true, enableRecycleBin: true };
    expect(getPhaseStatus('phase1', allArmed).status).toBe('armed');
    expect(getPhaseStatus('phase1', allArmed).activeCount).toBe(2);

    const allSafed = { ...DEFAULT_FEATURE_FLAGS, enablePredictiveChips: false, enableRecycleBin: false };
    expect(getPhaseStatus('phase1', allSafed).status).toBe('safed');
    expect(getPhaseStatus('phase1', allSafed).activeCount).toBe(0);

    const partial = { ...DEFAULT_FEATURE_FLAGS, enablePredictiveChips: true, enableRecycleBin: false };
    expect(getPhaseStatus('phase1', partial).status).toBe('partial');
    expect(getPhaseStatus('phase1', partial).activeCount).toBe(1);
  });

  it('strictly respects explicit global flag configurations (armed or safed)', () => {
    const flagsSafed = {
      ...DEFAULT_FEATURE_FLAGS,
      enableTravelPasses: false,
      enablePackingAssistant: false,
      enableNextUpCapsule: false,
      enableVoiceInput: false,
      enableAdvancedSplits: false,
    };
    // Whether superadmin or normal traveler, an explicit safe state must be respected
    expect(isFeatureActive('enableTravelPasses', flagsSafed, { isSuperadmin: true })).toBe(false);
    expect(isFeatureActive('enablePackingAssistant', flagsSafed, { isSuperadmin: true })).toBe(false);
    expect(isFeatureActive('enableNextUpCapsule', flagsSafed, { isSuperadmin: true })).toBe(false);
    expect(isFeatureActive('enableVoiceInput', flagsSafed, { isSuperadmin: false })).toBe(false);
    expect(isFeatureActive('enableAdvancedSplits', flagsSafed, { isSuperadmin: false })).toBe(false);

    const flagsArmed = {
      ...DEFAULT_FEATURE_FLAGS,
      enableTravelPasses: true,
      enablePackingAssistant: true,
      enableNextUpCapsule: true,
      enableVoiceInput: true,
      enableAdvancedSplits: true,
    };
    expect(isFeatureActive('enableTravelPasses', flagsArmed, { isSuperadmin: true })).toBe(true);
    expect(isFeatureActive('enablePackingAssistant', flagsArmed, { isSuperadmin: false })).toBe(true);
    expect(isFeatureActive('enableNextUpCapsule', flagsArmed, { isSuperadmin: true })).toBe(true);
    expect(isFeatureActive('enableVoiceInput', flagsArmed, { isSuperadmin: false })).toBe(true);
    expect(isFeatureActive('enableAdvancedSplits', flagsArmed, { isSuperadmin: true })).toBe(true);
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

  it('verifies that every single flag in all phases can be enabled and disabled', () => {
    const allFlagKeys = Object.keys(DEFAULT_FEATURE_FLAGS) as (keyof typeof DEFAULT_FEATURE_FLAGS)[];
    expect(allFlagKeys.length).toBe(27);

    allFlagKeys.forEach((flagKey) => {
      const disabledFlags = { ...DEFAULT_FEATURE_FLAGS, [flagKey]: false };
      expect(isFeatureActive(flagKey, disabledFlags, { isSuperadmin: false })).toBe(false);

      const enabledFlags = { ...DEFAULT_FEATURE_FLAGS, [flagKey]: true };
      expect(isFeatureActive(flagKey, enabledFlags, { isSuperadmin: false })).toBe(true);
    });
  });
});
