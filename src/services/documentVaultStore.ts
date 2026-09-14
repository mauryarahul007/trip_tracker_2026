// Local-only store for passport/visa/insurance scans -- separate IndexedDB
// database from offlineReceiptStore (same open/get/put/delete shape, copied
// deliberately rather than shared) because that store's entries are transient
// sync-staging that get deleted once a receipt uploads; vault documents are
// meant to persist indefinitely and are never uploaded anywhere.

export type VaultDocType = 'passport' | 'visa' | 'insurance' | 'id-card' | 'other';

export interface VaultDocument {
  id: string;
  name: string;
  docType: VaultDocType;
  expiryDate?: string; // ISO date, optional
  dataUrl: string;
  createdAt: number;
}

const DB_NAME = 'trip-tracker-document-vault';
const STORE_NAME = 'documents';
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

export async function saveVaultDocument(doc: VaultDocument): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(doc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getAllVaultDocuments(): Promise<VaultDocument[]> {
  const db = await openDb();
  try {
    return await new Promise<VaultDocument[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as VaultDocument[]) || []);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteVaultDocument(id: string): Promise<void> {
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
