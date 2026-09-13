import type { SplitMode } from '../types';

export const DEFAULT_SPLIT_VERSION = 'v1';

export interface RememberedDefaultSplit {
  splitMode: SplitMode;
  splitMemberIds: string[];
  splitConfig?: Record<string, number>;
}

function storageKey(tripId: string): string {
  return `tt-default-split:${DEFAULT_SPLIT_VERSION}:${tripId}`;
}

export function loadDefaultSplit(tripId: string): RememberedDefaultSplit | null {
  if (!tripId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedDefaultSplit;
    if (!parsed || !parsed.splitMode || !Array.isArray(parsed.splitMemberIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDefaultSplit(tripId: string, value: RememberedDefaultSplit): void {
  if (!tripId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}
