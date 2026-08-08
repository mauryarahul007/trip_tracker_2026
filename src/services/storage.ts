import localforage from 'localforage';
import type { TripState } from '../types';

localforage.config({
  name: 'TripTracker2026',
  storeName: 'trip_tracker_store'
});

const DB_KEY = 'trip_tracker_state';

export class StorageError extends Error {
  public code: 'QUOTA_EXCEEDED' | 'BLOCKED' | 'UNKNOWN';
  constructor(code: 'QUOTA_EXCEEDED' | 'BLOCKED' | 'UNKNOWN', message: string) {
    super(message);
    this.code = code;
    this.name = 'StorageError';
  }
}

export const storage = {
  async saveState(state: TripState): Promise<void> {
    try {
      await localforage.setItem(DB_KEY, state);
    } catch (error: any) {
      console.error('Storage save failure:', error);
      
      // Map IndexedDB exceptions
      if (
        error.name === 'QuotaExceededError' || 
        error.code === 22 || 
        error.message?.includes('quota')
      ) {
        throw new StorageError('QUOTA_EXCEEDED', 'Device storage is full. Please clear space to save trip changes.');
      } else if (
        error.name === 'SecurityError' || 
        error.message?.includes('security') || 
        error.message?.includes('blocked')
      ) {
        throw new StorageError('BLOCKED', 'Storage is blocked by browser private mode. Allow storage access.');
      } else {
        throw new StorageError('UNKNOWN', error.message || 'Failed to save changes to device.');
      }
    }
  },

  async loadState(): Promise<TripState | null> {
    try {
      const data = await localforage.getItem<TripState>(DB_KEY);
      return data;
    } catch (error) {
      console.error('Storage load failure:', error);
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await localforage.clear();
    } catch (error) {
      console.error('Storage clear failure:', error);
    }
  }
};
