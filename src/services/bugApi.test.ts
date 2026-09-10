import { describe, expect, it } from 'vitest';
import { appendBugActivity, bugFingerprint } from './bugApi';

describe('bugFingerprint', () => {
  it('is stable for the same stack line and title', () => {
    const a = bugFingerprint({
      title: 'Share math off by a penny',
      category: 'splits-math',
      stackTrace: 'Error: split remainder\n    at settle (Balances.tsx:12)',
      route: '#/expenses',
    });
    const b = bugFingerprint({
      title: 'Share math off by a penny',
      category: 'splits-math',
      stackTrace: 'Error: split remainder\n    at settle (Balances.tsx:12)',
      route: '#/expenses',
    });
    expect(a).toBe(b);
    expect(a.startsWith('fp_')).toBe(true);
  });

  it('groups by first stack line even when titles differ', () => {
    const stack = 'TypeError: Cannot read properties of null\n    at render (App.tsx:8)';
    const a = bugFingerprint({ title: 'Crash on expenses', category: 'ui-ux', stackTrace: stack });
    const b = bugFingerprint({ title: 'Null crash', category: 'navigation', stackTrace: stack });
    expect(a).toBe(b);
  });
});

describe('appendBugActivity', () => {
  it('appends a status change without mutating the original list', () => {
    const existing = [{ at: '2026-01-01T00:00:00.000Z', by: 'ada', action: 'filed' }];
    const next = appendBugActivity(existing, { by: 'ada', action: 'status', note: 'open → in_progress', at: '2026-01-02T00:00:00.000Z' });
    expect(existing).toHaveLength(1);
    expect(next).toEqual([
      existing[0],
      { at: '2026-01-02T00:00:00.000Z', by: 'ada', action: 'status', note: 'open → in_progress' },
    ]);
  });

  it('treats a missing activity log as an empty list', () => {
    const next = appendBugActivity(undefined, { by: 'ada', action: 'assign', note: 'linus', at: '2026-01-03T00:00:00.000Z' });
    expect(next).toEqual([{ at: '2026-01-03T00:00:00.000Z', by: 'ada', action: 'assign', note: 'linus' }]);
  });
});
