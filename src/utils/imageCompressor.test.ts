import { describe, it, expect } from 'vitest';
import { compressImageFile, MAX_COMPRESS_FILE_SIZE_BYTES } from './imageCompressor';

describe('imageCompressor', () => {
  it('exports compressImageFile as a function', () => {
    expect(typeof compressImageFile).toBe('function');
  });

  it('rejects files exceeding 25MB ceiling', async () => {
    const hugeFile = new File(['a'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(hugeFile, 'size', { value: 30 * 1024 * 1024 });

    await expect(compressImageFile(hugeFile)).rejects.toThrow('Image file is too large');
  });

  it('has 25MB constant configured', () => {
    expect(MAX_COMPRESS_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });
});
