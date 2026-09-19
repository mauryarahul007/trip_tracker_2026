import { describe, it, expect } from 'vitest';
import { pushTab, popTab, MAX_TAB_TRAIL } from './tabTrail';

describe('tabTrail', () => {
  it('records the tab being left', () => {
    expect(pushTab(['a'], 'b', 'c')).toEqual(['a', 'b']);
  });
  it('ignores a switch to the same tab', () => {
    expect(pushTab(['a'], 'b', 'b')).toEqual(['a']);
  });
  it('stops recording at the cap', () => {
    const full = Array.from({ length: MAX_TAB_TRAIL }, () => 'x');
    expect(pushTab(full, 'y', 'z')).toHaveLength(MAX_TAB_TRAIL);
  });
  it('pops the most recent tab', () => {
    expect(popTab(['a', 'b'])).toEqual({ tab: 'b', trail: ['a'] });
    expect(popTab([])).toEqual({ tab: undefined, trail: [] });
  });
});
