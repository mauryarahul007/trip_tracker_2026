import { describe, it, expect } from 'vitest';
import { saveDraft, loadDraft, DRAFT_TTL_MS } from './expenseDraft';

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    has: (k: string) => m.has(k),
  };
}

describe('expenseDraft', () => {
  it('round-trips a fresh draft', () => {
    const s = memStorage();
    saveDraft(s, 'k', { title: 'Dinner' }, 1000);
    expect(loadDraft(s, 'k', 1000 + 5)).toEqual({ title: 'Dinner' });
  });
  it('expires and removes a stale draft', () => {
    const s = memStorage();
    saveDraft(s, 'k', { title: 'Dinner' }, 1000);
    expect(loadDraft(s, 'k', 1000 + DRAFT_TTL_MS + 1)).toBeNull();
    expect(s.has('k')).toBe(false);
  });
  it('drops malformed or legacy (no savedAt) values', () => {
    const s = memStorage();
    s.setItem('k', '{"title":"old"}');
    expect(loadDraft(s, 'k')).toBeNull();
    s.setItem('k', 'not json');
    expect(loadDraft(s, 'k')).toBeNull();
    expect(s.has('k')).toBe(false);
  });
  it('returns null when nothing is stored', () => {
    expect(loadDraft(memStorage(), 'k')).toBeNull();
  });
});
