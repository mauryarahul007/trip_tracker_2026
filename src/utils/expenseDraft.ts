export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type DraftData = Record<string, unknown>;

export function saveDraft(storage: StorageLike, key: string, data: DraftData, now = Date.now()): void {
  storage.setItem(key, JSON.stringify({ savedAt: now, data }));
}

/** Returns the stored draft, or null if missing, malformed or older than the TTL (expired drafts are removed). */
export function loadDraft(storage: StorageLike, key: string, now = Date.now()): DraftData | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedAt?: unknown; data?: unknown };
    if (typeof parsed.savedAt === 'number' && parsed.data && typeof parsed.data === 'object' && now - parsed.savedAt <= DRAFT_TTL_MS) {
      return parsed.data as DraftData;
    }
  } catch {
    // fall through to removal
  }
  storage.removeItem(key);
  return null;
}
