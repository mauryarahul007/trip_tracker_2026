import type { TripState } from '../types';

export interface ValidationResult {
  valid: boolean;
  sanitizedState?: TripState;
  error?: string;
}

const MAX_IMPORT_TRIPS = 50;
const MAX_IMPORT_EXPENSES_PER_TRIP = 1000;
const MAX_STRING_LENGTH = 200;

export function validateAndSanitizeBackup(jsonString: string): ValidationResult {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, error: 'Empty or invalid JSON payload.' };
  }

  if (jsonString.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'Backup file exceeds maximum allowed size (10MB).' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { valid: false, error: 'Invalid JSON format.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'Root object must be a valid JSON dictionary.' };
  }

  const raw = { ...(parsed as Record<string, unknown>) };

  // Prevent prototype pollution
  Reflect.deleteProperty(raw, '__proto__');
  Reflect.deleteProperty(raw, 'constructor');
  Reflect.deleteProperty(raw, 'prototype');

  if (!Array.isArray(raw.trips)) {
    return { valid: false, error: 'Missing or invalid "trips" array.' };
  }

  if (raw.trips.length > MAX_IMPORT_TRIPS) {
    return { valid: false, error: `Import contains too many trips (max ${MAX_IMPORT_TRIPS}).` };
  }

  const sanitizedTrips: TripState['trips'] = [];
  const rawMembers = raw.members && typeof raw.members === 'object' ? raw.members : {};
  const rawGroups = raw.groups && typeof raw.groups === 'object' ? raw.groups : {};
  const rawExpenses = Array.isArray(raw.expenses) ? raw.expenses : [];
  const rawCategories = Array.isArray(raw.categories) ? raw.categories : [];

  for (const t of raw.trips) {
    if (!t || typeof t !== 'object') continue;
    const name = String(t.name || '').trim().slice(0, 100);
    if (!name) continue;

    const startDate = String(t.startDate || '').slice(0, 10);
    const endDate = String(t.endDate || '').slice(0, 10);
    const baseCurrency = String(t.baseCurrency || 'INR').trim().slice(0, 10).toUpperCase();

    sanitizedTrips.push({
      ...t,
      name,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || new Date().toISOString().slice(0, 10),
      baseCurrency: baseCurrency || 'INR',
      memberIds: Array.isArray(t.memberIds) ? t.memberIds.filter((id: any) => typeof id === 'string') : [],
      groupIds: Array.isArray(t.groupIds) ? t.groupIds.filter((id: any) => typeof id === 'string') : [],
    });
  }

  if (sanitizedTrips.length === 0) {
    return { valid: false, error: 'No valid trips found in backup.' };
  }

  const sanitizedMembers: TripState['members'] = {};
  for (const [id, m] of Object.entries(rawMembers)) {
    if (!m || typeof m !== 'object') continue;
    const name = String((m as any).name || '').trim().slice(0, 100);
    if (!name) continue;
    sanitizedMembers[id] = {
      ...(m as any),
      id,
      name,
      archived: Boolean((m as any).archived),
    };
  }

  const sanitizedGroups: TripState['groups'] = {};
  for (const [id, g] of Object.entries(rawGroups)) {
    if (!g || typeof g !== 'object') continue;
    const name = String((g as any).name || '').trim().slice(0, 100);
    if (!name) continue;
    sanitizedGroups[id] = {
      ...(g as any),
      id,
      name,
      memberIds: Array.isArray((g as any).memberIds) ? (g as any).memberIds.filter((mId: any) => typeof mId === 'string') : [],
    };
  }

  const sanitizedExpenses: TripState['expenses'] = [];
  const maxTotalExpenses = MAX_IMPORT_TRIPS * MAX_IMPORT_EXPENSES_PER_TRIP;
  for (const e of rawExpenses) {
    if (sanitizedExpenses.length >= maxTotalExpenses) break;
    if (!e || typeof e !== 'object') continue;
    const title = String(e.title || '').trim().slice(0, MAX_STRING_LENGTH);
    const amount = Number(e.amount);
    if (!title || isNaN(amount) || amount <= 0 || amount > 999999999.99) continue;

    sanitizedExpenses.push({
      ...e,
      title,
      amount: Math.round(amount * 100) / 100,
      currency: String(e.currency || 'INR').trim().slice(0, 10).toUpperCase(),
      category: String(e.category || 'other').slice(0, 50),
      date: String(e.date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      splitMemberIds: Array.isArray(e.splitMemberIds) ? e.splitMemberIds.filter((id: any) => typeof id === 'string') : [],
    });
  }

  const sanitizedCategories: TripState['categories'] = [];
  for (const c of rawCategories) {
    if (!c || typeof c !== 'object') continue;
    const name = String(c.name || '').trim().slice(0, 50);
    if (!name) continue;
    sanitizedCategories.push({
      ...c,
      name,
      icon: String(c.icon || '🏷️').slice(0, 10),
      isCustom: Boolean(c.isCustom),
    });
  }

  return {
    valid: true,
    sanitizedState: {
      trips: sanitizedTrips,
      members: sanitizedMembers,
      groups: sanitizedGroups,
      expenses: sanitizedExpenses,
      categories: sanitizedCategories,
    } as TripState,
  };
}
