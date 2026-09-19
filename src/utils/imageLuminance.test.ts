import { describe, expect, it } from 'vitest';
import { BRIGHT_LUMINANCE_THRESHOLD, photoTextTone } from './imageLuminance';

describe('photoTextTone', () => {
  it('defaults to light text when luminance is unknown', () => {
    expect(photoTextTone(null)).toBe('light');
  });

  it('keeps light text on dark / mid photos', () => {
    expect(photoTextTone(0)).toBe('light');
    expect(photoTextTone(0.2)).toBe('light');
    expect(photoTextTone(BRIGHT_LUMINANCE_THRESHOLD)).toBe('light');
  });

  it('switches to dark text on bright sky / snow backdrops', () => {
    expect(photoTextTone(BRIGHT_LUMINANCE_THRESHOLD + 0.01)).toBe('dark');
    expect(photoTextTone(0.9)).toBe('dark');
  });
});
