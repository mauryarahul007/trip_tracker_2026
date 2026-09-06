import { extractText } from 'unpdf';

/**
 * Extracts plain text from an uploaded PDF file, blob, or array buffer using unpdf.
 * Compatible with modern browser and node environments.
 */
export async function extractPdfText(
  source: File | Blob | ArrayBuffer | Uint8Array
): Promise<string> {
  try {
    let uint8: Uint8Array;
    if (source instanceof Uint8Array) {
      uint8 = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else if (source instanceof ArrayBuffer) {
      uint8 = new Uint8Array(source);
    } else if (typeof Blob !== 'undefined' && source instanceof Blob) {
      const arrayBuffer = await source.arrayBuffer();
      uint8 = new Uint8Array(arrayBuffer);
    } else {
      throw new Error('Unsupported PDF source format');
    }

    const res = await extractText(uint8);
    if (Array.isArray(res.text)) {
      return res.text.filter(Boolean).join('\n\n').trim();
    }
    const rawText: unknown = res.text;
    return typeof rawText === 'string' ? rawText.trim() : '';
  } catch (err) {
    console.error('[pdfExtractor] Failed to extract text from PDF:', err);
    throw new Error('Could not extract text from the uploaded PDF document. Please verify the file is not password-protected.');
  }
}
