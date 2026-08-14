import { supabase } from './supabaseClient';
import type { Category, Expense, Group, Member, PreviousMemberSuggestion, SplitMode, Trip } from '../types';
import type { Database } from '../types/database';

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

function mapExpense(row: ExpenseRow): Expense {
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

export async function fetchDeletedExpensesForTrip(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .not('deleted_at', 'is', null)
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
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
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

export async function deleteTripRow(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllMyTrips(ownerId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('owner_id', ownerId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function insertMember(tripId: string, name: string, linkedUserId?: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ trip_id: tripId, name, ...(linkedUserId ? { linked_user_id: linkedUserId } : {}) })
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

export async function insertGroup(tripId: string, name: string, memberIds: string[]): Promise<Group> {
  const { data, error } = await supabase.from('groups').insert({ trip_id: tripId, name }).select().single();
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

export async function insertCategory(tripId: string, name: string, icon?: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ trip_id: tripId, name, icon: icon ?? null, is_custom: true })
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
}

export async function insertExpense(tripId: string, createdByUserId: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
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
    })
    .select()
    .single();
  if (error) throw error;
  return mapExpense(data);
}

export async function updateExpenseRow(id: string, input: ExpenseInput): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({
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
    })
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
    const remapIds = (ids: string[]) => ids.map((id) => memberIdMap.get(id) ?? id);
    const remapShares = (shares: Record<string, number>) =>
      Object.fromEntries(Object.entries(shares).map(([k, v]) => [memberIdMap.get(k) ?? k, v]));

    const rows = seed.expenses.map((e) => ({
      trip_id: trip.id,
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      date: e.date,
      paid_by: memberIdMap.get(e.paidBy) ?? e.paidBy,
      split_mode: e.splitMode,
      split_member_ids: remapIds(e.splitMemberIds),
      split_config: e.splitConfig ? remapShares(e.splitConfig) : null,
      resolved_shares: remapShares(e.resolvedShares),
      is_settlement: e.title.startsWith('Settlement:'),
      created_by_user_id: ownerId,
    }));
    const { data, error } = await supabase.from('expenses').insert(rows).select();
    if (error) throw error;
    expenses = (data ?? []).map(mapExpense);
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
  if (!userId) return [];

  const now = Date.now();
  if (previousMembersCache && previousMembersCache.userId === userId && now - previousMembersCache.timestamp < CACHE_TTL_MS) {
    return previousMembersCache.data;
  }

  // Fetch all trips visible to this user
  const { data: tripsData, error: tripsErr } = await supabase.from('trips').select('id');
  if (tripsErr) throw tripsErr;
  if (!tripsData || tripsData.length === 0) {
    previousMembersCache = { userId, timestamp: now, data: [] };
    return [];
  }

  const tripIds = tripsData.map((t) => t.id);

  // Fetch members associated with these trips
  const { data: membersData, error: membersErr } = await supabase
    .from('members')
    .select('name, linked_user_id, profile:linked_user_id(avatar_url, display_name)')
    .in('trip_id', tripIds);

  if (membersErr) throw membersErr;

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

  previousMembersCache = { userId, timestamp: now, data: results };
  return results;
}

