/**
 * Trip Tracker 2026 - Bug Tracker API Service
 * 
 * Provides bi-directional synchronization between UI and filesystem ledger (bugs/bugs.json)
 * during local development (via Vite dev server middleware), with graceful localStorage fallback.
 */

export interface BugRecord {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 
    | 'offline-sync' 
    | 'splits-math' 
    | 'ui-ux' 
    | 'navigation' 
    | 'auth' 
    | 'receipts-camera' 
    | 'p2p-sync' 
    | 'performance' 
    | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  foundBy: string;
  environment: {
    platform: 'web' | 'android' | 'ios';
    browser?: string;
    isOnline: boolean;
    appVersion: string;
    route?: string;
  };
  reproSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  diagnostics?: {
    stackTrace?: string;
    consoleLogs?: string[];
    syncQueueLength?: number;
    activeTripId?: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

const STORAGE_KEY = 'trip-tracker-local-bugs';

export async function fetchBugs(): Promise<BugRecord[]> {
  try {
    const res = await fetch('/api/bugs');
    if (res.ok) {
      const data: BugRecord[] = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // API not reachable (production build or static host), fallback to local storage
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch {
    // Ignored
  }

  return [];
}

export async function createBug(bug: Partial<BugRecord>): Promise<BugRecord> {
  const payload = {
    title: bug.title || 'Untitled Bug',
    description: bug.description || '',
    severity: bug.severity || 'medium',
    category: bug.category || 'general',
    status: bug.status || 'open',
    foundBy: bug.foundBy || 'superadmin-ui',
    environment: bug.environment || {
      platform: 'web',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      appVersion: '1.0.0',
      route: typeof window !== 'undefined' ? window.location.hash : '#/',
    },
    reproSteps: bug.reproSteps || [],
    expectedBehavior: bug.expectedBehavior || '',
    actualBehavior: bug.actualBehavior || '',
    diagnostics: bug.diagnostics || {},
  };

  try {
    const res = await fetch('/api/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created: BugRecord = await res.json();
      const existing = await fetchBugs();
      const next = [...existing.filter(b => b.id !== created.id), created];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return created;
    }
  } catch {
    // Fallback
  }

  // Local fallback
  const existing = await fetchBugs();
  let maxNum = 0;
  for (const b of existing) {
    const m = b.id?.match(/^BUG-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const id = `BUG-${String(maxNum + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const newBug: BugRecord = {
    ...payload,
    id,
    severity: payload.severity as any,
    category: payload.category as any,
    status: payload.status as any,
    environment: payload.environment as any,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...existing, newBug];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return newBug;
}

export async function updateBug(id: string, updates: Partial<BugRecord>): Promise<BugRecord | null> {
  try {
    const res = await fetch(`/api/bugs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated: BugRecord = await res.json();
      const existing = await fetchBugs();
      const next = existing.map(b => (b.id === id ? updated : b));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return updated;
    }
  } catch {
    // Fallback
  }

  // Local fallback
  const existing = await fetchBugs();
  const bug = existing.find(b => b.id.toUpperCase() === id.toUpperCase());
  if (!bug) return null;

  const now = new Date().toISOString();
  const updatedBug: BugRecord = {
    ...bug,
    ...updates,
    updatedAt: now,
    ...(updates.status === 'resolved' && !bug.resolvedAt ? { resolvedAt: now } : {}),
  };

  const next = existing.map(b => (b.id.toUpperCase() === id.toUpperCase() ? updatedBug : b));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return updatedBug;
}

export async function deleteBug(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/bugs/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const existing = await fetchBugs();
      const next = existing.filter(b => b.id.toUpperCase() !== id.toUpperCase());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    }
  } catch {
    // Fallback
  }

  const existing = await fetchBugs();
  const next = existing.filter(b => b.id.toUpperCase() !== id.toUpperCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return true;
}
