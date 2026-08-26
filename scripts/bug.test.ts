import { describe, it, expect } from 'vitest';
import {
  getNextBugId,
  VALID_SEVERITIES,
  VALID_STATUSES,
  VALID_CATEGORIES,
  renderMarkdown
} from './bug.mjs';

describe('Bug CLI Engine', () => {
  it('defines valid severities, statuses, and categories', () => {
    expect(VALID_SEVERITIES).toContain('critical');
    expect(VALID_SEVERITIES).toContain('high');
    expect(VALID_SEVERITIES).toContain('medium');
    expect(VALID_SEVERITIES).toContain('low');

    expect(VALID_STATUSES).toContain('open');
    expect(VALID_STATUSES).toContain('in_progress');
    expect(VALID_STATUSES).toContain('resolved');
    expect(VALID_STATUSES).toContain('wont_fix');

    expect(VALID_CATEGORIES).toContain('offline-sync');
    expect(VALID_CATEGORIES).toContain('splits-math');
    expect(VALID_CATEGORIES).toContain('navigation');
  });

  it('generates sequential bug IDs correctly', () => {
    expect(getNextBugId([])).toBe('BUG-001');

    const bugs = [
      { id: 'BUG-001', title: 'Bug 1' },
      { id: 'BUG-002', title: 'Bug 2' },
      { id: 'BUG-009', title: 'Bug 9' },
    ];

    expect(getNextBugId(bugs)).toBe('BUG-010');
  });

  it('renders markdown table and metrics correctly in renderMarkdown', () => {
    const mockBugs = [
      {
        id: 'BUG-101',
        title: 'Mock Open Bug',
        description: 'Testing markdown generation',
        severity: 'high',
        category: 'navigation',
        status: 'open',
        foundBy: 'claude-cli',
        environment: { platform: 'web', isOnline: true },
        createdAt: '2026-08-17T12:00:00.000Z',
        updatedAt: '2026-08-17T12:00:00.000Z',
      },
      {
        id: 'BUG-102',
        title: 'Mock Resolved Bug',
        description: 'Fixed bug',
        severity: 'low',
        category: 'ui-ux',
        status: 'resolved',
        foundBy: 'antigravity',
        resolvedBy: 'antigravity',
        resolutionNote: 'Fixed in CSS',
        createdAt: '2026-08-16T12:00:00.000Z',
        updatedAt: '2026-08-17T12:00:00.000Z',
      }
    ];

    const md = renderMarkdown(mockBugs);
    expect(md).toContain('# 🐞 Trip Tracker Bug Tracker');
    expect(md).toContain('| **Total Tracked** | **2** |');
    expect(md).toContain('| **🟢 Open** | **1** |');
    expect(md).toContain('| **✅ Resolved** | **1** |');
    expect(md).toContain('BUG-101');
    expect(md).toContain('Mock Open Bug');
    expect(md).toContain('BUG-102');
    expect(md).toContain('Fixed in CSS');
  });
});
