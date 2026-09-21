import { describe, expect, it } from 'vitest';
import { groupReliability } from './growthApi';

describe('groupReliability', () => {
  it('folds per-event rows into one line per platform and version', () => {
    const rows = [
      { platform: 'android', appVersion: '3.36.0', event: 'app_open', events: 40, users: 30 },
      { platform: 'android', appVersion: '3.36.0', event: 'queue_stuck', events: 4, users: 3 },
      { platform: 'android', appVersion: '3.36.0', event: 'sync_fail', events: 2, users: 2 },
      { platform: 'web', appVersion: '3.36.0', event: 'app_open', events: 10, users: 9 },
      { platform: 'web', appVersion: '3.36.0', event: 'flush_ok', events: 5, users: 5 },
    ];
    expect(groupReliability(rows)).toEqual([
      { platform: 'android', appVersion: '3.36.0', openUsers: 30, stuckUsers: 3, failUsers: 2 },
      { platform: 'web', appVersion: '3.36.0', openUsers: 9, stuckUsers: 0, failUsers: 0 },
    ]);
  });
});
