import { supabase } from './supabaseClient';
import type { Category, Expense, Group, Member, PreviousMemberSuggestion, SplitMode, Trip } from '../types';
import type { Database } from '../types/database';
import type { AdminUserRow, AppConfigKey, AuditLogEntry, DevicePlatformCount, NotificationStats } from '../types/admin';

type TripRow = Database['public']['Tables']['trips']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];
type GroupRow = Database['public']['Tables']['groups']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

function mapTrip(row: TripRow, memberIds: string[], groupIds: string[]): Trip {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    baseCurrency: row.base_currency,
    ownerId: row.owner_id,
    joinCode: row.join_code,
    memberIds,
    groupIds,
    archived: row.archived,
    frozen: row.frozen,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function mapMember(row: MemberRow & { profile?: { avatar_url: string | null } | null }): Member {
  return {
    id: row.id,
    name: row.name,
    archived: row.archived,
    linkedUserId: row.linked_user_id,
    avatarUrl: row.profile?.avatar_url ?? undefined,
  };
}

function mapGroup(row: GroupRow, memberIds: string[]): Group {
  return { id: row.id, name: row.name, memberIds };
}

function mapCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, icon: row.icon ?? undefined, isCustom: row.is_custom };
}

function mapExpense(row: ExpenseRow & { location?: any }): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.date,
    paidBy: row.paid_by,
    splitMode: row.split_mode as SplitMode,
    splitMemberIds: row.split_member_ids,
    splitConfig: row.split_config ?? undefined,
    resolvedShares: row.resolved_shares,
    receiptPath: row.receipt_path ?? undefined,
    isSettlement: row.is_settlement,
    createdByUserId: row.created_by_user_id,
    location: row.location ?? undefined,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
    deletedByUserId: row.deleted_by_user_id,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export interface TripGraph {
  trips: Trip[];
  members: Record<string, Member>;
  groups: Record<string, Group>;
}

// Fetches every trip the current user can see (RLS-scoped to admin or
// claimed participant) plus all members/groups for those trips. Expenses
// and custom categories are intentionally NOT included here — categories
// are scoped to a single trip (mixing them across trips would leak trip
// B's custom categories into trip A's UI), and expenses are the bulk of
// the data — both are fetched lazily, only when a trip becomes active.
export async function fetchMyTripGraph(): Promise<TripGraph> {
  const { data: tripRows, error: tripsErr } = await supabase.from('trips').select('*').order('created_at', { ascending: true });
  if (tripsErr) throw tripsErr;

  const tripIds = (tripRows ?? []).map((t) => t.id);
  if (tripIds.length === 0) {
    return { trips: [], members: {}, groups: {} };
  }

  const [membersRes, groupsRes, expensesRes] = await Promise.all([
    supabase.from('members').select('*, profile:linked_user_id(avatar_url)').in('trip_id', tripIds),
    supabase.from('groups').select('*').in('trip_id', tripIds),
    supabase.from('expenses').select('trip_id').in('trip_id', tripIds),
  ]);
  if (membersRes.error) throw membersRes.error;
  if (groupsRes.error) throw groupsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const expenseCounts: Record<string, number> = {};
  (expensesRes.data ?? []).forEach((row) => {
    expenseCounts[row.trip_id] = (expenseCounts[row.trip_id] || 0) + 1;
  });

  const groupIds = (groupsRes.data ?? []).map((g) => g.id);
  const groupMembersRes = groupIds.length
    ? await supabase.from('group_members').select('*').in('group_id', groupIds)
    : { data: [] as { group_id: string; member_id: string }[], error: null };
  if (groupMembersRes.error) throw groupMembersRes.error;

  const members: Record<string, Member> = {};
  (membersRes.data ?? []).forEach((row) => {
    members[row.id] = mapMember(row);
  });

  const memberIdsByGroup: Record<string, string[]> = {};
  (groupMembersRes.data ?? []).forEach((row) => {
    (memberIdsByGroup[row.group_id] ??= []).push(row.member_id);
  });

  const groups: Record<string, Group> = {};
  (groupsRes.data ?? []).forEach((row) => {
    groups[row.id] = mapGroup(row, memberIdsByGroup[row.id] ?? []);
  });

  const trips: Trip[] = (tripRows ?? []).map((row) => {
    const memberIds = (membersRes.data ?? []).filter((m) => m.trip_id === row.id).map((m) => m.id);
    const gIds = (groupsRes.data ?? []).filter((g) => g.trip_id === row.id).map((g) => g.id);
    const trip = mapTrip(row, memberIds, gIds);
    trip.expenseCount = expenseCounts[row.id] || 0;
    return trip;
  });

  return { trips, members, groups };
}

export async function fetchCategoriesForTrip(tripId: string): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').eq('trip_id', tripId);
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function fetchExpensesForTrip(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapExpense);
}

// Admin Portal only: fetchMyTripGraph() deliberately fetches just trip_id
// (a count, not amounts) since the traveler app only ever needs one trip's
// expenses at a time via fetchExpensesForTrip. Cross-trip analytics needs
// real rows for every trip the caller can see, which for a superadmin is
// every trip (RLS via is_superadmin(), see migration 0054).
export async function fetchAllExpensesForTrips(tripIds: string[]): Promise<Expense[]> {
  if (tripIds.length === 0) return [];
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .in('trip_id', tripIds)
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []).map(mapExpense);
}

export async function fetchDeletedExpensesForTrip(tripId: string): Promise<Expense[]> {
  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .not('deleted_at', 'is', null)
    .gt('deleted_at', cutoffIso)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapExpense);
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function insertTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  ownerId: string;
  id?: string;
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      base_currency: input.baseCurrency,
      owner_id: input.ownerId,
    })
    .select()
    .single();
  if (error) throw error;
  return mapTrip(data, [], []);
}

export async function updateTripRow(id: string, patch: { name: string; startDate: string; endDate: string }): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ name: patch.name, start_date: patch.startDate, end_date: patch.endDate, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function archiveTripRow(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ archived, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function freezeTripRow(id: string, frozen: boolean): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ frozen, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTripRow(id: string): Promise<void> {
  const { data, error } = await supabase.from('trips').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Trip could not be deleted: permission denied or trip not found');
  }
}

export async function deleteAllMyTrips(ownerId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('owner_id', ownerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function insertMember(tripId: string, name: string, linkedUserId?: string, id?: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ ...(id ? { id } : {}), trip_id: tripId, name, ...(linkedUserId ? { linked_user_id: linkedUserId } : {}) })
    .select('*, profile:linked_user_id(avatar_url)')
    .single();
  if (error) throw error;
  return mapMember(data);
}

export async function updateMemberRow(id: string, patch: Partial<{ name: string; archived: boolean }>): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMemberRow(id: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function insertGroup(tripId: string, name: string, memberIds: string[], id?: string): Promise<Group> {
  const { data, error } = await supabase.from('groups').insert({ ...(id ? { id } : {}), trip_id: tripId, name }).select().single();
  if (error) throw error;
  if (memberIds.length) {
    const { error: gmErr } = await supabase
      .from('group_members')
      .insert(memberIds.map((member_id) => ({ group_id: data.id, member_id })));
    if (gmErr) throw gmErr;
  }
  return mapGroup(data, memberIds);
}

export async function updateGroupRow(id: string, name: string, memberIds: string[]): Promise<void> {
  const { error } = await supabase.from('groups').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;

  const { error: delErr } = await supabase.from('group_members').delete().eq('group_id', id);
  if (delErr) throw delErr;

  if (memberIds.length) {
    const { error: insErr } = await supabase.from('group_members').insert(memberIds.map((member_id) => ({ group_id: id, member_id })));
    if (insErr) throw insErr;
  }
}

export async function deleteGroupRow(id: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function insertCategory(tripId: string, name: string, icon?: string, id?: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...(id ? { id } : {}), trip_id: tripId, name, icon: icon ?? null, is_custom: true })
    .select()
    .single();
  if (error) throw error;
  return mapCategory(data);
}

export async function deleteCategoryRow(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

// The DB stores raw GPS coordinates only — never a reverse-geocoded place
// name. placeName is a client-side display convenience, resolved locally.
function coordsOnly(location: import('../types').ExpenseLocation | null | undefined): { lat: number; lng: number } | null {
  // An unresolved manual place name (no confirmed coords yet) must never
  // reach the DB as a location row — omit it entirely rather than writing
  // the 0,0 placeholder used locally to flag the pending/failed state.
  if (!location || location.locationUnresolved || location.pendingName) return null;
  return { lat: location.lat, lng: location.lng };
}

export interface ExpenseInput {
  id?: string; // pre-generated client-side so a receipt can be uploaded before the row exists
  title: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  paidBy: string;
  splitMode: SplitMode;
  splitMemberIds: string[];
  splitConfig?: Record<string, number>;
  resolvedShares: Record<string, number>;
  receiptPath?: string; // set only when a new receipt was just uploaded — omit to leave existing untouched
  location?: import('../types').ExpenseLocation | null;
}

export async function insertExpense(tripId: string, createdByUserId: string, input: ExpenseInput): Promise<Expense> {
  const basePayload = {
    ...(input.id ? { id: input.id } : {}),
    trip_id: tripId,
    title: input.title,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    date: input.date,
    paid_by: input.paidBy,
    split_mode: input.splitMode,
    split_member_ids: input.splitMemberIds,
    split_config: input.splitConfig ?? null,
    resolved_shares: input.resolvedShares,
    receipt_path: input.receiptPath ?? null,
    is_settlement: input.title.startsWith('Settlement:'),
    created_by_user_id: createdByUserId,
  };

  const payloadWithLoc = {
    ...basePayload,
    ...(input.location ? { location: coordsOnly(input.location) } : {}),
  };

  const { data, error } = await supabase
    .from('expenses')
    .insert(payloadWithLoc)
    .select()
    .single();

  if (error) throw error;

  return mapExpense(data);
}

export async function updateExpenseRow(id: string, input: ExpenseInput): Promise<void> {
  const basePayload: any = {
    title: input.title,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    date: input.date,
    paid_by: input.paidBy,
    split_mode: input.splitMode,
    split_member_ids: input.splitMemberIds,
    split_config: input.splitConfig ?? null,
    resolved_shares: input.resolvedShares,
    updated_at: new Date().toISOString(),
    ...(input.receiptPath ? { receipt_path: input.receiptPath } : {}),
  };

  const payloadWithLoc = {
    ...basePayload,
    ...(input.location !== undefined ? { location: coordsOnly(input.location) } : {}),
  };

  const { error } = await supabase
    .from('expenses')
    .update(payloadWithLoc)
    .eq('id', id);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Receipt images (Supabase Storage — private bucket, signed URLs to read)
// ---------------------------------------------------------------------------

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Path convention (matches the storage.objects RLS policy, which reads the
// trip id out of the first path segment): {tripId}/{expenseId}.jpg
export async function uploadReceipt(tripId: string, expenseId: string, dataUrl: string): Promise<string> {
  const path = `${tripId}/${expenseId}.jpg`;
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await supabase.storage.from('receipts').upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) throw error;
  return path;
}

export async function getReceiptSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 60); // 1 hour
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteExpenseRow(id: string, deletedByUserId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString(), deleted_by_user_id: deletedByUserId })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreExpenseRow(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: null, deleted_by_user_id: null })
    .eq('id', id);
  if (error) throw error;
}

export async function permanentlyDeleteExpenseRow(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function purgeDeletedExpensesForTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)
    .not('deleted_at', 'is', null);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Bulk trip creation (demo seed + local->cloud import share this)
// ---------------------------------------------------------------------------

export interface TripGraphSeed {
  trip: Pick<Trip, 'name' | 'startDate' | 'endDate' | 'baseCurrency'>;
  members: Record<string, Member>;
  groups: Record<string, Group>;
  categories?: Category[];
  // is_settlement/created_by_user_id are derived (from title / the owner
  // doing the import), never read from the seed — callers don't have them.
  expenses: Omit<Expense, 'isSettlement' | 'createdByUserId'>[];
}

export interface InsertedTripGraph {
  trip: Trip;
  members: Record<string, Member>;
  groups: Record<string, Group>;
  categories: Category[];
  expenses: Expense[];
}

// Recreates a whole trip (members, groups, categories, expenses) under
// `ownerId`, remapping every id to a fresh DB-generated uuid so the source
// ids (demo-seed placeholders, or another account's exported ids) never
// collide with real data.
export async function insertTripGraph(ownerId: string, seed: TripGraphSeed): Promise<InsertedTripGraph> {
  const trip = await insertTrip({ ...seed.trip, ownerId });

  const memberIdMap = new Map<string, string>();
  let members: Member[] = [];
  const oldMembers = Object.values(seed.members);
  if (oldMembers.length) {
    const { data, error } = await supabase
      .from('members')
      .insert(oldMembers.map((m) => ({ trip_id: trip.id, name: m.name, archived: !!m.archived })))
      .select();
    if (error) throw error;
    members = (data ?? []).map(mapMember);
    oldMembers.forEach((old, i) => memberIdMap.set(old.id, members[i].id));
  }

  const groupIdMap = new Map<string, string>();
  let groups: Group[] = [];
  const oldGroups = Object.values(seed.groups);
  if (oldGroups.length) {
    const { data, error } = await supabase
      .from('groups')
      .insert(oldGroups.map((g) => ({ trip_id: trip.id, name: g.name })))
      .select();
    if (error) throw error;
    const rows = data ?? [];
    oldGroups.forEach((old, i) => groupIdMap.set(old.id, rows[i].id));

    const groupMemberRows = oldGroups.flatMap((old) =>
      old.memberIds
        .map((oldMemberId) => ({ group_id: groupIdMap.get(old.id)!, member_id: memberIdMap.get(oldMemberId)! }))
        .filter((r) => r.member_id)
    );
    if (groupMemberRows.length) {
      const { error: gmErr } = await supabase.from('group_members').insert(groupMemberRows);
      if (gmErr) throw gmErr;
    }
    groups = rows.map((row, i) => mapGroup(row, oldGroups[i].memberIds.map((mid) => memberIdMap.get(mid)!).filter(Boolean)));
  }

  let categories: Category[] = [];
  const customCategories = (seed.categories ?? []).filter((c) => c.isCustom);
  if (customCategories.length) {
    const { data, error } = await supabase
      .from('categories')
      .insert(customCategories.map((c) => ({ trip_id: trip.id, name: c.name, icon: c.icon ?? null, is_custom: true })))
      .select();
    if (error) throw error;
    categories = (data ?? []).map(mapCategory);
  }

  let expenses: Expense[] = [];
  if (seed.expenses.length) {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = (str?: string): boolean => typeof str === 'string' && UUID_REGEX.test(str);
    const defaultMemberId = members[0]?.id || trip.id;
    const remapId = (id: string): string => {
      const mapped = memberIdMap.get(id);
      if (mapped) return mapped;
      if (isValidUuid(id)) return id;
      return defaultMemberId;
    };
    const remapIds = (ids: string[]) => (ids || []).map(remapId);
    const remapShares = (shares: Record<string, number>) =>
      Object.fromEntries(Object.entries(shares || {}).map(([k, v]) => [remapId(k), v]));

    const rows = seed.expenses.map((e) => ({
      trip_id: trip.id,
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      date: e.date,
      paid_by: memberIdMap.get(e.paidBy) || (isValidUuid(e.paidBy) ? e.paidBy : defaultMemberId),
      split_mode: e.splitMode,
      split_member_ids: remapIds(e.splitMemberIds),
      split_config: e.splitConfig ? remapShares(e.splitConfig) : null,
      resolved_shares: remapShares(e.resolvedShares),
      location: coordsOnly((e as any).location),
      is_settlement: e.title.startsWith('Settlement:'),
      created_by_user_id: ownerId,
    }));
    let data: any = null;
    const { data: insertData, error } = await supabase.from('expenses').insert(rows).select();
    if (error) {
      const isLocationColError = error.message?.toLowerCase().includes('location') ||
        error.details?.toLowerCase().includes('location') ||
        error.hint?.toLowerCase().includes('location') ||
        error.code === 'PGRST204';

      if (isLocationColError) {
        console.warn('Remote Supabase expenses table missing location column; inserting seed expenses without remote location column.');
        const rowsWithoutLoc = rows.map(({ location: _loc, ...rest }) => rest);
        const fallbackRes = await supabase.from('expenses').insert(rowsWithoutLoc).select();
        if (fallbackRes.error) throw fallbackRes.error;
        data = fallbackRes.data;
      } else {
        throw error;
      }
    } else {
      data = insertData;
    }

    expenses = (data ?? []).map((row: any, i: number) => ({
      ...mapExpense(row),
      location: (seed.expenses[i] as any)?.location ?? row.location ?? undefined,
    }));
  }

  const finalTrip: Trip = { ...trip, memberIds: members.map((m) => m.id), groupIds: groups.map((g) => g.id), expenseCount: expenses.length };
  const membersMap: Record<string, Member> = {};
  members.forEach((m) => (membersMap[m.id] = m));
  const groupsMap: Record<string, Group> = {};
  groups.forEach((g) => (groupsMap[g.id] = g));

  return { trip: finalTrip, members: membersMap, groups: groupsMap, categories, expenses };
}

// ---------------------------------------------------------------------------
// Join flow
// ---------------------------------------------------------------------------

export interface JoinLookupResult {
  tripId: string;
  tripName: string;
  isAdmin: boolean;
  myMemberId: string | null;
  unclaimedMembers: { id: string; name: string }[];
}

// Returns null for an invalid/unknown code. A valid code always yields a
// result (unclaimedMembers may be empty if everyone's already claimed).
export async function lookupTripByJoinCode(code: string): Promise<JoinLookupResult | null> {
  const { data, error } = await supabase.rpc('lookup_trip_by_join_code', { p_code: code });
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const [first] = data;
  return {
    tripId: first.trip_id,
    tripName: first.trip_name,
    isAdmin: first.is_admin,
    myMemberId: first.my_member_id,
    unclaimedMembers: data
      .filter((row): row is typeof row & { member_id: string; member_name: string } => row.member_id !== null && row.member_name !== null)
      .map((row) => ({ id: row.member_id, name: row.member_name })),
  };
}

// True if the claim succeeded; false if someone else claimed that member first.
export async function claimTripMember(memberId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_trip_member', { p_member_id: memberId });
  if (error) throw error;
  return data === true;
}

// ---------------------------------------------------------------------------
// Previous Members Typeahead Cache & API
// ---------------------------------------------------------------------------

let previousMembersCache: { userId: string; timestamp: number; data: PreviousMemberSuggestion[] } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function invalidatePreviousMembersCache() {
  previousMembersCache = null;
}

export async function fetchPreviousTripMembers(userId: string | null | undefined): Promise<PreviousMemberSuggestion[]> {
  const cacheKey = userId || 'anonymous';
  const now = Date.now();
  if (previousMembersCache && previousMembersCache.userId === cacheKey && now - previousMembersCache.timestamp < CACHE_TTL_MS) {
    return previousMembersCache.data;
  }

  try {
    // Fetch all trips visible
    const { data: tripsData, error: tripsErr } = await supabase.from('trips').select('id');
    if (tripsErr || !tripsData || tripsData.length === 0) {
      previousMembersCache = { userId: cacheKey, timestamp: now, data: [] };
      return [];
    }

    const tripIds = tripsData.map((t) => t.id);

    // Fetch members associated with these trips
    const { data: membersData, error: membersErr } = await supabase
      .from('members')
      .select('name, linked_user_id, profile:linked_user_id(avatar_url, display_name)')
      .in('trip_id', tripIds);

    if (membersErr) {
      previousMembersCache = { userId: cacheKey, timestamp: now, data: [] };
      return [];
    }

  // Deduplicate and prioritize linked Google accounts
  const memberMap = new Map<string, PreviousMemberSuggestion>();

  (membersData ?? []).forEach((row: any) => {
    const rawName = (row.profile?.display_name || row.name || '').trim();
    if (!rawName) return;

    // Exclude the current user themselves
    if (row.linked_user_id === userId) return;

    const normalizedName = rawName.toLowerCase();
    const existing = memberMap.get(normalizedName);

    const suggestion: PreviousMemberSuggestion = {
      name: rawName,
      linkedUserId: row.linked_user_id || null,
      avatarUrl: row.profile?.avatar_url || null,
    };

    if (!existing) {
      memberMap.set(normalizedName, suggestion);
    } else {
      // If the new one has a linked account and the existing one does not, prioritize the linked one
      if (!existing.linkedUserId && suggestion.linkedUserId) {
        memberMap.set(normalizedName, suggestion);
      } else if (!existing.avatarUrl && suggestion.avatarUrl) {
        existing.avatarUrl = suggestion.avatarUrl;
      }
    }
  });

  // Sort: Google linked members first, then alphabetically
  const results = Array.from(memberMap.values()).sort((a, b) => {
    if (Boolean(a.linkedUserId) !== Boolean(b.linkedUserId)) {
      return a.linkedUserId ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

    previousMembersCache = { userId: cacheKey, timestamp: now, data: results };
    return results;
  } catch {
    previousMembersCache = { userId: cacheKey, timestamp: now, data: [] };
    return [];
  }
}

export async function searchRemoteMemberSuggestions(
  query: string,
  userId: string | null | undefined
): Promise<PreviousMemberSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || !userId) return [];

  try {
    // 1. Search profiles for Google accounts
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${trimmed}%`)
      .limit(10);

    // 2. Search all members for previous trip participant names
    const { data: membersData } = await supabase
      .from('members')
      .select('name, linked_user_id, profile:linked_user_id(avatar_url, display_name)')
      .ilike('name', `%${trimmed}%`)
      .limit(10);

    const memberMap = new Map<string, PreviousMemberSuggestion>();

    (profilesData ?? []).forEach((p: any) => {
      const name = (p.display_name || '').trim();
      if (!name || p.id === userId) return;
      memberMap.set(name.toLowerCase(), {
        name,
        linkedUserId: p.id,
        avatarUrl: p.avatar_url || null,
      });
    });

    (membersData ?? []).forEach((m: any) => {
      const name = (m.profile?.display_name || m.name || '').trim();
      if (!name || m.linked_user_id === userId) return;
      const norm = name.toLowerCase();
      const existing = memberMap.get(norm);
      if (!existing) {
        memberMap.set(norm, {
          name,
          linkedUserId: m.linked_user_id || null,
          avatarUrl: m.profile?.avatar_url || null,
        });
      } else if (!existing.linkedUserId && m.linked_user_id) {
        memberMap.set(norm, {
          name,
          linkedUserId: m.linked_user_id,
          avatarUrl: m.profile?.avatar_url || existing.avatarUrl,
        });
      }
    });

    return Array.from(memberMap.values()).sort((a, b) => {
      if (Boolean(a.linkedUserId) !== Boolean(b.linkedUserId)) {
        return a.linkedUserId ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    console.error('Remote member search error:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Ops Deck: user directory, app config, broadcast, recycle-bin purge
// ---------------------------------------------------------------------------

export async function fetchAllProfilesForAdmin(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, banned, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    banned: p.banned,
    createdAt: p.created_at,
  }));
}

export async function fetchSuperadminIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_superadmin_ids');
  if (error) throw error;
  return data ?? [];
}

export async function setUserBanned(userId: string, banned: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_user_banned', { p_user_id: userId, p_banned: banned });
  if (error) throw error;
}

// One row per device, so a multi-device user counts once per platform they
// use -- fine for a rough fleet split, not meant to be a unique-user count.
export async function fetchDevicePlatformCounts(): Promise<DevicePlatformCount[]> {
  const { data, error } = await supabase.from('device_push_tokens').select('platform');
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    counts[row.platform] = (counts[row.platform] || 0) + 1;
  });
  return Object.entries(counts).map(([platform, count]) => ({ platform: platform as 'ios' | 'android', count }));
}

export async function fetchAppConfig(): Promise<Partial<Record<AppConfigKey, unknown>>> {
  const { data, error } = await supabase.rpc('get_app_config');
  if (error) throw error;
  const map: Partial<Record<AppConfigKey, unknown>> = {};
  (data ?? []).forEach((row) => {
    map[row.key as AppConfigKey] = row.value;
  });
  return map;
}

// Single-key read, works for anon (pre-login) callers too -- used by the
// login screen (signup_gate) and the app shell (maintenance_mode), neither
// of which should need the full superadmin-only get_app_config() list.
export async function fetchAppFlag(key: AppConfigKey): Promise<unknown> {
  const { data, error } = await supabase.rpc('get_app_flag', { p_key: key });
  if (error) throw error;
  return data;
}

export async function setAppConfigValue(key: AppConfigKey, value: unknown): Promise<void> {
  const { error } = await supabase.rpc('set_app_config', { p_key: key, p_value: value });
  if (error) throw error;
}

export async function broadcastNotification(title: string, body: string, tripId?: string | null): Promise<number> {
  const { data, error } = await supabase.rpc('broadcast_notification', {
    p_title: title,
    p_body: body,
    p_trip_id: tripId ?? null,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function purgeRecycleBinOlderThan(days: number): Promise<number> {
  const { data, error } = await supabase.rpc('purge_recycle_bin_older_than', { p_days: days });
  if (error) throw error;
  return data ?? 0;
}

export async function fetchNotificationStats(): Promise<NotificationStats> {
  const { data, error } = await supabase.rpc('get_notification_stats');
  if (error) throw error;
  const row = data?.[0];
  return {
    totalCount: row?.total_count ?? 0,
    readCount: row?.read_count ?? 0,
    last7dCount: row?.last_7d_count ?? 0,
  };
}

export async function fetchRecycledExpenseCount(): Promise<number> {
  const { data, error } = await supabase.rpc('count_recycled_expenses');
  if (error) throw error;
  return data ?? 0;
}

// trip_id is null OR is_trip_admin(trip_id) per the RLS policy (0048) --
// a superadmin's is_trip_admin() bypass means this returns every row.
export async function fetchAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('security_audit_logs')
    .select('id, trip_id, actor_user_id, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    tripId: r.trip_id,
    actorUserId: r.actor_user_id,
    action: r.action,
    details: r.details,
    createdAt: r.created_at,
  }));
}

export async function purgeAuditLogsOlderThan(days: number): Promise<number> {
  const { data, error } = await supabase.rpc('purge_audit_logs_older_than', { p_days: days });
  if (error) throw error;
  return data ?? 0;
}

// For actions the superadmin portal performs via plain table writes (trip
// ground/archive/delete, feature-request edits) that have no dedicated
// logging RPC of their own -- log_security_event (0048) is grantable to any
// authenticated user, so the portal calls it directly after the write
// succeeds instead of needing a new RPC per action.
export async function logSuperadminAction(
  tripId: string | null,
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.rpc('log_security_event', { p_trip_id: tripId, p_action: action, p_details: details });
  if (error) throw error;
}
