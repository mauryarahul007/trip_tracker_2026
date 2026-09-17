import { supabase } from './supabaseClient';

const BUCKET = 'chat-media';
const MAX_BYTES = 5 * 1024 * 1024;

function extForMime(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'jpg';
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Upload chat image/audio. Path: {tripId}/{messageId}.{ext} */
export async function uploadChatMedia(
  tripId: string,
  messageId: string,
  blob: Blob,
  mimeType: string
): Promise<string> {
  if (blob.size > MAX_BYTES) {
    throw new Error('File is too large (max 5 MB)');
  }
  const ext = extForMime(mimeType || blob.type || 'application/octet-stream');
  const path = `${tripId}/${messageId}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mimeType || blob.type || 'application/octet-stream',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function uploadChatMediaDataUrl(
  tripId: string,
  messageId: string,
  dataUrl: string
): Promise<{ path: string; mimeType: string }> {
  const blob = dataUrlToBlob(dataUrl);
  const mimeType = blob.type || 'image/jpeg';
  const path = await uploadChatMedia(tripId, messageId, blob, mimeType);
  return { path, mimeType };
}

export async function getChatMediaSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteChatMedia(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn('[chatMediaApi] deleteChatMedia warning:', error.message);
  }
}
