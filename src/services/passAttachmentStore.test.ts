import { describe, it, expect } from 'vitest';
import { savePassAttachment, getPassAttachment, deletePassAttachment } from './passAttachmentStore';

describe('passAttachmentStore', () => {
  it('returns non-idb keys directly without querying IndexedDB', async () => {
    const rawData = 'data:application/pdf;base64,JVBERi0xLjQK';
    const result = await getPassAttachment(rawData);
    expect(result).toBe(rawData);

    const httpUrl = 'https://example.com/ticket.pdf';
    const httpResult = await getPassAttachment(httpUrl);
    expect(httpResult).toBe(httpUrl);
  });

  it('handles empty keys gracefully', async () => {
    expect(await getPassAttachment('')).toBeUndefined();
    await expect(savePassAttachment('', 'data:...')).resolves.not.toThrow();
    await expect(deletePassAttachment('')).resolves.not.toThrow();
  });

  it('safely ignores delete for non-idb keys', async () => {
    await expect(deletePassAttachment('https://example.com/ticket.pdf')).resolves.not.toThrow();
  });
});
