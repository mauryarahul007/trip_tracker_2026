// IndexedDB store for queuing trip chat messages composed while offline.
// When connection restores, the outbox automatically drains to Supabase.

export interface QueuedChatMessage {
  id: string;
  tripId: string;
  memberId: string;
  body: string;
  replyToId?: string | null;
  replyToSenderName?: string | null;
  replyToBody?: string | null;
  createdAt: number;
  status: 'sending';
}

const DB_NAME = 'trip-tracker-offline-chat';
const STORE_NAME = 'outbox';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineMessage(message: QueuedChatMessage): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(message);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getOfflineMessagesForTrip(tripId: string): Promise<QueuedChatMessage[]> {
  const all = await getAllOfflineMessages();
  return all.filter((m) => m.tripId === tripId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAllOfflineMessages(): Promise<QueuedChatMessage[]> {
  const db = await openDb();
  try {
    return await new Promise<QueuedChatMessage[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as QueuedChatMessage[]) || []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function removeOfflineMessage(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
