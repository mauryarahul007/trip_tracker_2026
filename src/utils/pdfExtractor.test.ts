import { describe, it, expect } from 'vitest';
import { extractPdfText } from './pdfExtractor';
import { parseAllBookingPasses } from './passParser';
import fs from 'fs';

describe('pdfExtractor', () => {
  it('extracts text from a real PDF buffer and parses passes', async () => {
    const pdfPath = 'C:/Users/Rahul/.gemini/antigravity-ide/brain/4f61852c-29f8-4984-828b-5d3c9cc1ef68/.user_uploaded/media_1788688965667.pdf';
    if (!fs.existsSync(pdfPath)) {
      // Skip if file not found in environment
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const text = await extractPdfText(buffer);
    expect(text).toContain('IndiGo');
    expect(text).toContain('BLR');
    expect(text).toContain('HYD');
    expect(text).toContain('IXB');

    const passes = parseAllBookingPasses(text);
    // 2 passengers (Rahul Maurya & Upama Maurya) x 3 flight legs = 6 separate passenger passes
    expect(passes.length).toBe(6);
    expect(passes[0].provider).toBe('IndiGo');
    expect(passes[0].passengerName).toBe('Upama Maurya');
    expect(passes[1].passengerName).toBe('Rahul Maurya');
    expect(passes[0].title).toContain('6E-537');
    expect(passes[2].title).toContain('6E-149');
    expect(passes[4].title).toContain('6E-445');
  });

  it('handles invalid input gracefully', async () => {
    await expect(extractPdfText('not a buffer' as any)).rejects.toThrow();
  });
});
