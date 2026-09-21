import type { FeatureFlagKey } from '../types/admin';
import { CONSUMER_PACKS, DEFAULT_FEATURE_FLAGS, getPackFlagKeys, getPackStatus } from './featureFlags';

export const MAX_CUSTOM_FLAG_PRESETS = 5;
export const FLAG_PRESETS_STORAGE_KEY = 'ops-flag-presets:v1';

export type FlagRecipeId = 'recommended' | 'on_the_road' | 'flyer' | 'power_money';

export interface FlagRecipe {
  id: FlagRecipeId;
  title: string;
  tagline: string;
  confirmLabel: string;
  bullets: string[];
  /** Same bits as recommended; different Superadmin story. */
  usesCodeDefaults: boolean;
}

export interface CustomFlagPreset {
  id: string;
  name: string;
  flags: Record<FeatureFlagKey, boolean>;
  savedAt: number;
}

export const FLAG_RECIPES: FlagRecipe[] = [
  {
    id: 'recommended',
    title: 'Recommended',
    tagline: 'Core + Trip on, Travel capable, Pro/Labs off',
    confirmLabel: 'Restore recommended',
    usesCodeDefaults: true,
    bullets: [
      'Core and Trip on — add, invite, settle, Notes, receipts',
      'Travel capable — chrome hidden until a pass. Route stops stay off',
      'Pro, Labs, and Ops off',
    ],
  },
  {
    id: 'on_the_road',
    title: 'On the road',
    tagline: 'Core + Trip only. No pass radar.',
    confirmLabel: 'Apply on the road',
    usesCodeDefaults: false,
    bullets: [
      'Core and Trip on — money loop plus voice, Notes, packing',
      'Travel off — no passes, Next-Up, scanner, or radar',
      'Pro, Labs, and Ops off',
    ],
  },
  {
    id: 'flyer',
    title: 'Flyer',
    tagline: 'Recommended plus air/rail tools ready',
    confirmLabel: 'Apply flyer',
    usesCodeDefaults: true,
    bullets: [
      'Same mix as Recommended — Core + Trip on',
      'Passes, Next-Up, scanner, radar exist; chrome waits for a pass',
      'Route stops stay off. Pro, Labs, and Ops off',
    ],
  },
  {
    id: 'power_money',
    title: 'Power money',
    tagline: 'Recommended plus Pro. Labs still off.',
    confirmLabel: 'Apply power money',
    usesCodeDefaults: false,
    bullets: [
      'Core and Trip on, Travel capable (route stops off)',
      'Pro on — itemized, OCR, analytics, Splitwise import',
      'Labs and Ops stay off',
    ],
  },
];

const ALL_FLAG_KEYS = Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[];

export function hydrateFlagSet(
  partial: Partial<Record<FeatureFlagKey, boolean>> | Record<string, boolean>
): Record<FeatureFlagKey, boolean> {
  const next = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of ALL_FLAG_KEYS) {
    const value = partial[key];
    if (typeof value === 'boolean') next[key] = value;
  }
  return next;
}

export function flagsForRecipe(id: FlagRecipeId): Record<FeatureFlagKey, boolean> {
  if (id === 'recommended' || id === 'flyer') {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
  if (id === 'on_the_road') {
    const next = { ...DEFAULT_FEATURE_FLAGS };
    for (const packId of ['travel', 'pro', 'labs', 'ops'] as const) {
      for (const key of getPackFlagKeys(packId)) next[key] = false;
    }
    return next;
  }
  const next = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of getPackFlagKeys('pro')) next[key] = true;
  for (const key of getPackFlagKeys('labs')) next[key] = false;
  for (const key of getPackFlagKeys('ops')) next[key] = false;
  return next;
}

export function flagSetsEqual(
  a: Record<FeatureFlagKey, boolean>,
  b: Record<FeatureFlagKey, boolean>
): boolean {
  for (const key of ALL_FLAG_KEYS) {
    if (Boolean(a[key]) !== Boolean(b[key])) return false;
  }
  return true;
}

export function recipeMatches(
  id: FlagRecipeId,
  flags: Record<FeatureFlagKey, boolean>
): boolean {
  return flagSetsEqual(flags, flagsForRecipe(id));
}

export function labsKeysOn(flags: Record<FeatureFlagKey, boolean>): FeatureFlagKey[] {
  return getPackFlagKeys('labs').filter((key) => flags[key]);
}

export function packStatusLines(flags: Record<FeatureFlagKey, boolean>): string[] {
  return CONSUMER_PACKS.map((pack) => {
    const { status, activeCount, totalCount } = getPackStatus(pack.id, flags);
    const label = status === 'armed' ? 'on' : status === 'safed' ? 'off' : `partial (${activeCount}/${totalCount})`;
    return `${pack.title.split('—')[0].trim()} ${label}`;
  });
}

export function parseCustomPresets(raw: unknown): CustomFlagPreset[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { custom?: unknown }).custom)
      ? (raw as { custom: unknown[] }).custom
      : [];
  const parsed: CustomFlagPreset[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<CustomFlagPreset>;
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || !row.name.trim()) continue;
    if (!row.flags || typeof row.flags !== 'object') continue;
    parsed.push({
      id: row.id,
      name: row.name.trim().slice(0, 40),
      flags: hydrateFlagSet(row.flags),
      savedAt: typeof row.savedAt === 'number' ? row.savedAt : Date.now(),
    });
    if (parsed.length >= MAX_CUSTOM_FLAG_PRESETS) break;
  }
  return parsed;
}

export function readLocalCustomPresets(): CustomFlagPreset[] {
  try {
    const raw = localStorage.getItem(FLAG_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    return parseCustomPresets(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeLocalCustomPresets(presets: CustomFlagPreset[]): void {
  try {
    localStorage.setItem(FLAG_PRESETS_STORAGE_KEY, JSON.stringify({ custom: presets }));
  } catch {
    // quota / private mode
  }
}
