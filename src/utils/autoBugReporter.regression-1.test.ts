// Regression: BUG-237..247 — dev-server hot-reload crashes ("X is not defined",
// removeChild during a hot swap) were auto-filed as Critical cases in the
// production Bug Ledger.
// Found by /qa on 2026-09-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-09-27.md
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/bugApi', () => ({ createBug: vi.fn() }));
vi.mock('./diagnosticLogger', () => ({ diagnosticLogger: { captureSnapshot: vi.fn() } }));

import { shouldAutoReport } from './autoBugReporter';

describe('shouldAutoReport', () => {
  it('stays silent on the Vite dev server', () => {
    expect(shouldAutoReport({ DEV: true, MODE: 'development' })).toBe(false);
  });
  it('files cases from built apps (web, Android, iOS)', () => {
    expect(shouldAutoReport({ DEV: false, MODE: 'production' })).toBe(true);
  });
});
