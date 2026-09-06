// Stages pass attachments (PDF ticket documents, boarding pass images)
// in IndexedDB rather than the zustand `persist` localStorage blob.
// Storing multi-page ticket PDFs as base64 data URLs in localStorage
// quickly exhausts the browser's ~5MB localStorage quota, especially
// when 1 uploaded ticket PDF is attached across multiple flight legs.
// IndexedDB provides hundreds of megabytes of quota, keeping localStorage
// fast, lightweight, and quota-safe.

const DB_NAME = 'trip-tracker-pass-attachments';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a ticket attachment data URL (PDF or image) to IndexedDB.
 */
export async function savePassAttachment(key: string, dataUrl: string): Promise<void> {
  if (!key || !dataUrl) return;
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataUrl, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.warn('[passAttachmentStore] Failed to save attachment to IndexedDB:', err);
  }
}

/**
 * Retrieves a ticket attachment data URL from IndexedDB.
 * If the key is already a direct data: or http(s): URL, it is returned as-is.
 */
export async function getPassAttachment(key: string): Promise<string | undefined> {
  if (!key) return undefined;
  if (!key.startsWith('idb:')) {
    return key;
  }
  try {
    const db = await openDb();
    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result as string | undefined);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.warn('[passAttachmentStore] Failed to retrieve attachment from IndexedDB:', err);
    return undefined;
  }
}

/**
 * Deletes an attachment entry from IndexedDB.
 */
export async function deletePassAttachment(key: string): Promise<void> {
  if (!key || !key.startsWith('idb:')) return;
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.warn('[passAttachmentStore] Failed to delete attachment from IndexedDB:', err);
  }
}
