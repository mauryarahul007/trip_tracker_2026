import { describe, it, expect } from 'vitest';
import { parseDeepLink, withDeepLink } from './deepLink';

describe('deepLink', () => {
  it('parses trip and tab', () => {
    expect(parseDeepLink('?trip=t1&tab=members')).toEqual({ tripId: 't1', tab: 'members' });
    expect(parseDeepLink('')).toEqual({ tripId: null, tab: null });
  });
  it('sets trip and tab, keeping unrelated params', () => {
    expect(withDeepLink('?x=1', 't1', 'notes')).toBe('?x=1&trip=t1&tab=notes');
  });
  it('replaces existing values', () => {
    expect(withDeepLink('?trip=a&tab=b', 't2', 'settings')).toBe('?trip=t2&tab=settings');
  });
  it('drops both when no trip is open', () => {
    expect(withDeepLink('?trip=a&tab=b&x=1', null, 'expenses')).toBe('?x=1');
    expect(withDeepLink('?trip=a&tab=b', null, null)).toBe('');
  });
});
