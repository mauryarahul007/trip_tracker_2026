import { describe, it, expect } from 'vitest';
import { generateQrCodeDataUrl, generateQrCodeSvg } from './qrGenerator';

describe('qrGenerator', () => {
  it('generates a valid data URL for standard input', async () => {
    const text = 'https://trip-tracker.blackmaroon.in/#join-test';
    const dataUrl = await generateQrCodeDataUrl(text, { size: 200 });
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('generates a valid SVG string for standard input', async () => {
    const text = 'upi://pay?pa=test@upi&pn=Test&am=100.00';
    const svg = await generateQrCodeSvg(text, { size: 200 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('handles empty input gracefully', async () => {
    const dataUrl = await generateQrCodeDataUrl('');
    expect(dataUrl).toBe('');
    const svg = await generateQrCodeSvg('');
    expect(svg).toBe('');
  });

  it('reuses cached data URL for identical input', async () => {
    const text = 'https://trip-tracker.blackmaroon.in/#cache-test';
    const url1 = await generateQrCodeDataUrl(text);
    const url2 = await generateQrCodeDataUrl(text);
    expect(url1).toBe(url2);
  });
});
