import { describe, it, expect } from 'vitest';
import { isSecondBackPress, EXIT_WINDOW_MS } from './doubleBackExit';

describe('isSecondBackPress', () => {
  it('is false for the first press', () => {
    expect(isSecondBackPress(0, 5000)).toBe(false);
  });
  it('is true inside the window', () => {
    expect(isSecondBackPress(1000, 1000 + EXIT_WINDOW_MS)).toBe(true);
  });
  it('is false after the window lapses', () => {
    expect(isSecondBackPress(1000, 1001 + EXIT_WINDOW_MS)).toBe(false);
  });
});
