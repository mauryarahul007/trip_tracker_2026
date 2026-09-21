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

/** Remap remembered split member IDs onto a duplicated trip. */
export function copyDefaultSplit(
  sourceTripId: string,
  destTripId: string,
  memberIdMap: Record<string, string>,
): RememberedDefaultSplit | null {
  const stored = loadDefaultSplit(sourceTripId);
  if (!stored) return null;
  const splitMemberIds = stored.splitMemberIds
    .map((id) => memberIdMap[id])
    .filter((id): id is string => Boolean(id));
  if (splitMemberIds.length === 0) return null;
  let splitConfig: Record<string, number> | undefined;
  if (stored.splitConfig) {
    const next: Record<string, number> = {};
    for (const [id, val] of Object.entries(stored.splitConfig)) {
      const mapped = memberIdMap[id];
      if (mapped) next[mapped] = val;
    }
    if (Object.keys(next).length > 0) splitConfig = next;
  }
  const value: RememberedDefaultSplit = {
    splitMode: stored.splitMode,
    splitMemberIds,
    ...(splitConfig ? { splitConfig } : {}),
  };
  saveDefaultSplit(destTripId, value);
  return value;
}
