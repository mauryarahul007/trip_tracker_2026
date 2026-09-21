import { describe, it, expect } from 'vitest';
import { DEFAULT_FEATURE_FLAGS, getPackFlagKeys, getPackStatus } from './featureFlags';
import {
  flagsForRecipe,
  hydrateFlagSet,
  flagSetsEqual,
  recipeMatches,
  labsKeysOn,
  parseCustomPresets,
  MAX_CUSTOM_FLAG_PRESETS,
} from './flagPresets';

describe('flagPresets', () => {
  it('recommended and flyer match code defaults', () => {
    expect(flagSetsEqual(flagsForRecipe('recommended'), DEFAULT_FEATURE_FLAGS)).toBe(true);
    expect(flagSetsEqual(flagsForRecipe('flyer'), DEFAULT_FEATURE_FLAGS)).toBe(true);
    expect(recipeMatches('flyer', DEFAULT_FEATURE_FLAGS)).toBe(true);
  });

  it('on the road keeps Core+Trip and safes Travel/Pro/Labs/Ops', () => {
    const flags = flagsForRecipe('on_the_road');
    expect(getPackStatus('core', flags).status).toBe('armed');
    expect(getPackStatus('trip', flags).status).toBe('armed');
    expect(getPackStatus('travel', flags).status).toBe('safed');
    expect(getPackStatus('pro', flags).status).toBe('safed');
    expect(getPackStatus('labs', flags).status).toBe('safed');
    expect(getPackStatus('ops', flags).status).toBe('safed');
    expect(flags.enableRouteStops).toBe(false);
    expect(flags.enableTravelPasses).toBe(false);
  });

  it('power money arms Pro and leaves Labs off', () => {
    const flags = flagsForRecipe('power_money');
    expect(getPackStatus('core', flags).status).toBe('armed');
    expect(getPackStatus('trip', flags).status).toBe('armed');
    expect(getPackStatus('pro', flags).status).toBe('armed');
    expect(getPackStatus('labs', flags).status).toBe('safed');
    expect(getPackStatus('ops', flags).status).toBe('safed');
    expect(flags.enableSplitwiseImport).toBe(true);
    expect(flags.enableReceiptOcr).toBe(true);
    expect(flags.enableChatFirstNav).toBe(false);
    expect(getPackStatus('travel', flags).status).toBe('partial');
  });

  it('hydrate fills missing keys from defaults and ignores unknown keys', () => {
    const flags = hydrateFlagSet({ enableSplitwiseImport: true, notAFlag: true } as Record<string, boolean>);
    expect(flags.enableSplitwiseImport).toBe(true);
    expect(flags.enableCloneLastExpense).toBe(DEFAULT_FEATURE_FLAGS.enableCloneLastExpense);
    expect('notAFlag' in flags).toBe(false);
  });

  it('labsKeysOn lists only armed Labs flags', () => {
    const flags = { ...DEFAULT_FEATURE_FLAGS, enableChatFirstNav: true, enableCloseoutPulse: true };
    expect(labsKeysOn(flags).sort()).toEqual(['enableChatFirstNav', 'enableCloseoutPulse'].sort());
    expect(labsKeysOn(DEFAULT_FEATURE_FLAGS)).toEqual([]);
  });

  it('parseCustomPresets hydrates, trims names, and caps at 5', () => {
    const raw = {
      custom: [
        { id: 'a', name: '  Goa  ', flags: { enableSplitwiseImport: true }, savedAt: 1 },
        { id: 'skip', name: '', flags: {} },
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `p${i}`,
          name: `Mix ${i}`,
          flags: {},
          savedAt: i,
        })),
      ],
    };
    const parsed = parseCustomPresets(raw);
    expect(parsed).toHaveLength(MAX_CUSTOM_FLAG_PRESETS);
    expect(parsed[0].name).toBe('Goa');
    expect(parsed[0].flags.enableSplitwiseImport).toBe(true);
    expect(parsed[0].flags.enableCloneLastExpense).toBe(DEFAULT_FEATURE_FLAGS.enableCloneLastExpense);
    expect(getPackFlagKeys('core').every((k) => typeof parsed[0].flags[k] === 'boolean')).toBe(true);
  });
});
