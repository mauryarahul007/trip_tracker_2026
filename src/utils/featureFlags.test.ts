import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureActive,
  FEATURE_FLAGS_META,
  CONSUMER_PACKS,
  getPackFlagKeys,
  getPackStatus,
} from './featureFlags';

describe('featureFlags', () => {
  it('has valid metadata for all feature flags', () => {
    Object.keys(DEFAULT_FEATURE_FLAGS).forEach((k) => {
      const key = k as keyof typeof DEFAULT_FEATURE_FLAGS;
      expect(FEATURE_FLAGS_META[key]).toBeDefined();
      expect(FEATURE_FLAGS_META[key].label).toBeTruthy();
      expect(FEATURE_FLAGS_META[key].description).toBeTruthy();
      expect(FEATURE_FLAGS_META[key].defaultEnabledForUsers).toBe(DEFAULT_FEATURE_FLAGS[key]);
    });
  });

  it('defines 6 consumer packs covering every flag exactly once', () => {
    expect(CONSUMER_PACKS.length).toBe(6);
    expect(CONSUMER_PACKS.map((p) => p.id)).toEqual(['core', 'trip', 'travel', 'pro', 'labs', 'ops']);

    CONSUMER_PACKS.forEach((pack) => {
      expect(pack.flagKeys.length).toBeGreaterThan(0);
      pack.flagKeys.forEach((key) => {
        expect(DEFAULT_FEATURE_FLAGS).toHaveProperty(key);
        expect(FEATURE_FLAGS_META[key].pack).toBe(pack.id);
      });
    });

    const inPacks = CONSUMER_PACKS.flatMap((p) => p.flagKeys);
    expect(inPacks).toHaveLength(new Set(inPacks).size);
    expect([...inPacks].sort()).toEqual(Object.keys(DEFAULT_FEATURE_FLAGS).sort());
  });

  it('defaults Core and Trip ON so first and last minutes are reachable', () => {
    // boardingPassLogin is a documented staged-rollout exception: it swaps
    // the traveler login/home screen app-wide the moment it ships, so it
    // stays OFF until a superadmin arms it deliberately. See its
    // FEATURE_FLAGS_META description.
    getPackFlagKeys('core')
      .filter((key) => key !== 'boardingPassLogin')
      .forEach((key) => {
        expect(DEFAULT_FEATURE_FLAGS[key]).toBe(true);
      });
    getPackFlagKeys('trip').forEach((key) => {
      expect(DEFAULT_FEATURE_FLAGS[key]).toBe(true);
    });
    expect(DEFAULT_FEATURE_FLAGS.boardingPassLogin).toBe(false);
    expect(getPackStatus('core', DEFAULT_FEATURE_FLAGS).status).toBe('partial');
    expect(getPackStatus('trip', DEFAULT_FEATURE_FLAGS).status).toBe('armed');
  });

  it('keeps Travel chrome capable but route-stops / tiles / data-saver off', () => {
    expect(DEFAULT_FEATURE_FLAGS.enableTravelPasses).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableNextUpCapsule).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableGateScanner).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableFlightRadar).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableIcsExport).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableProgressiveNextUp).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.enableRouteStops).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.enableOfflineMapTiles).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.enableDataSaverMode).toBe(false);
    expect(getPackStatus('travel', DEFAULT_FEATURE_FLAGS).status).toBe('partial');
  });

  it('keeps Pro, Labs, and Ops safed by default', () => {
    getPackFlagKeys('pro').forEach((key) => {
      expect(DEFAULT_FEATURE_FLAGS[key]).toBe(false);
    });
    getPackFlagKeys('labs').forEach((key) => {
      expect(DEFAULT_FEATURE_FLAGS[key]).toBe(false);
    });
    getPackFlagKeys('ops').forEach((key) => {
      expect(DEFAULT_FEATURE_FLAGS[key]).toBe(false);
    });
    expect(getPackStatus('pro', DEFAULT_FEATURE_FLAGS).status).toBe('safed');
    expect(getPackStatus('labs', DEFAULT_FEATURE_FLAGS).status).toBe('safed');
    expect(getPackStatus('ops', DEFAULT_FEATURE_FLAGS).status).toBe('safed');
  });

  it('places money-loop flags in Core, not Pro', () => {
    const core = getPackFlagKeys('core');
    expect(core).toContain('enableCloneTripSquad');
    expect(core).toContain('enableTripCloseout');
    expect(core).toContain('enableWhatsAppSettlementShare');
    expect(core).toContain('enableUpiPayments');
    expect(core).toContain('enableTripShareLink');
    expect(core).toContain('enableExplainThisNumber');
    expect(getPackFlagKeys('pro')).not.toContain('enableUpiPayments');
    expect(getPackFlagKeys('labs')).toContain('enableChatFirstNav');
    expect(getPackFlagKeys('labs')).toContain('enableTripbotNlExpenses');
  });

  it('correctly calculates pack status (armed, safed, partial)', () => {
    const allArmed = { ...DEFAULT_FEATURE_FLAGS };
    getPackFlagKeys('core').forEach((k) => {
      allArmed[k] = true;
    });
    expect(getPackStatus('core', allArmed).status).toBe('armed');
    expect(getPackStatus('core', allArmed).activeCount).toBe(19);

    const allSafed = { ...DEFAULT_FEATURE_FLAGS };
    getPackFlagKeys('core').forEach((k) => {
      allSafed[k] = false;
    });
    expect(getPackStatus('core', allSafed).status).toBe('safed');
    expect(getPackStatus('core', allSafed).activeCount).toBe(0);

    const partial = { ...allSafed, enablePredictiveChips: true };
    expect(getPackStatus('core', partial).status).toBe('partial');
    expect(getPackStatus('core', partial).activeCount).toBe(1);
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

  it('verifies that every flag in all packs can be enabled and disabled', () => {
    const allFlagKeys = Object.keys(DEFAULT_FEATURE_FLAGS) as (keyof typeof DEFAULT_FEATURE_FLAGS)[];
    expect(allFlagKeys.length).toBe(91);

    allFlagKeys.forEach((flagKey) => {
      const disabledFlags = { ...DEFAULT_FEATURE_FLAGS, [flagKey]: false };
      expect(isFeatureActive(flagKey, disabledFlags, { isSuperadmin: false })).toBe(false);

      const enabledFlags = { ...DEFAULT_FEATURE_FLAGS, [flagKey]: true };
      expect(isFeatureActive(flagKey, enabledFlags, { isSuperadmin: false })).toBe(true);
    });
  });
});
