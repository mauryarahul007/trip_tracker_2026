import { describe, it, expect } from 'vitest';
import { compressImageFile } from './imageCompressor';

describe('imageCompressor', () => {
  it('exports compressImageFile as a function', () => {
    expect(typeof compressImageFile).toBe('function');
  });
});
