import type { Expense, Member, Trip } from '../types';
import type { AdminUserRow, AuditLogEntry, FeatureFlagKey } from '../types/admin';
import { DEFAULT_FEATURE_FLAGS } from './featureFlags';

export const TEN_MIN_MS = 10 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const SIXTY_DAY_MS = 60 * DAY_MS;
export const NINETY_DAY_MS = 90 * DAY_MS;

export type TripSlice = 'cafe' | 'pass_holder' | 'multi_currency';
export type CloseoutPulseAnswer = 'yes' | 'no' | 'skip';

export type LoopStepKey =
  | 'firstExpense10m'
  | 'secondMember'
  | 'firstSettle'
  | 'locked'
  | 'nextTrip90d';

export interface LoopStepStat {
  key: LoopStepKey;
  label: string;
  count: number;
  pct: number;
}

export interface LoopHealth {
  tripCount: number;
  steps: LoopStepStat[];
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pctOfPrev: number;
  pctOfFirst: number;
}

export interface GhostTripRow {
  tripId: string;
  name: string;
  kind: 'idle' | 'unpaid';
  ageDays: number;
  memberCount: number;
  expenseCount: number;
}

export interface FlagUsageRow {
  key: FeatureFlagKey;
  label: string;
  armed: boolean;
  used: number;
  eligible: number;
  pct: number;
  proxy: string;
}

export interface InviteAttribution {
  joinCodeClaimed: number;
  shareLinkCreated: number;
  shareLinkViews: number;
  joinPreviews: number;
  waSettleProxy: number;
  placeholderMembers: number;
  tripCount: number;
}

export interface SliceLoopRow {
  slice: TripSlice;
  label: string;
  tripCount: number;
  firstExpense10mPct: number;
  secondMemberPct: number;
  firstSettlePct: number;
  nextTrip90dPct: number;
}

export interface WinBackRow {
  tripId: string;
  name: string;
  ownerId: string;
  daysSinceSettle: number;
}

export interface CloseoutPulseSummary {
  yes: number;
  no: number;
  skip: number;
  answered: number;
  wouldReusePct: number;
}

export interface SplitwiseImportSummary {
  tripCount: number;
  expenseCount: number;
}

export interface SignupSourceRow {
  source: string;
  count: number;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export function isLiveExpense(expense: Expense): boolean {
  return !expense.isSettlement && !expense.title.startsWith('Settlement:') && !expense.deletedAt;
}

export function isSettleExpense(expense: Expense): boolean {
  return (expense.isSettlement || expense.title.startsWith('Settlement:')) && !expense.deletedAt;
}

export function fleetTrips(trips: Trip[]): Trip[] {
  return trips.filter((t) => !t.archived);
}

function expensesForTrip(tripId: string, expenses: Expense[]): Expense[] {
  return expenses.filter((e) => e.tripId === tripId);
}

export function claimedMemberCount(trip: Trip, members: Record<string, Member>): number {
  const seen = new Set<string>();
  for (const id of trip.memberIds) {
    const linked = members[id]?.linkedUserId;
    if (linked) seen.add(linked);
  }
  return seen.size;
}

export function firstLiveExpenseAt(trip: Trip, expenses: Expense[]): number | null {
  let min: number | null = null;
  for (const e of expensesForTrip(trip.id, expenses)) {
    if (!isLiveExpense(e)) continue;
    if (min === null || e.createdAt < min) min = e.createdAt;
  }
  return min;
}

export function lastActivityAt(trip: Trip, expenses: Expense[]): number {
  let max = trip.createdAt;
  for (const e of expensesForTrip(trip.id, expenses)) {
    if (e.deletedAt) continue;
    if (e.createdAt > max) max = e.createdAt;
  }
  return max;
}

export function classifyTripSlice(trip: Trip, expenses: Expense[]): TripSlice {
  if ((trip.passes?.length ?? 0) > 0) return 'pass_holder';
  const live = expensesForTrip(trip.id, expenses).filter(isLiveExpense);
  const currencies = new Set(live.map((e) => (e.currency || trip.baseCurrency).toUpperCase()));
  if (currencies.size > 1 || Boolean(trip.fxConfig?.customRates && Object.keys(trip.fxConfig.customRates).length > 0)) {
    return 'multi_currency';
  }
  return 'cafe';
}

export function squadKey(trip: Trip, members: Record<string, Member>): string {
  const names = trip.memberIds
    .map((id) => (members[id]?.name || '').trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return names.join('|');
}

function overlappingNames(a: Trip, b: Trip, members: Record<string, Member>): number {
  const namesA = new Set(
    a.memberIds.map((id) => (members[id]?.name || '').trim().toLowerCase()).filter(Boolean)
  );
  let overlap = 0;
  for (const id of b.memberIds) {
    const name = (members[id]?.name || '').trim().toLowerCase();
    if (name && namesA.has(name)) overlap += 1;
  }
  return overlap;
}

function hasNextSquadTrip(trip: Trip, all: Trip[], members: Record<string, Member>, now: number): boolean {
  const windowEnd = trip.createdAt + NINETY_DAY_MS;
  return all.some((other) => {
    if (other.id === trip.id || other.archived) return false;
    if (other.ownerId !== trip.ownerId) return false;
    if (other.createdAt <= trip.createdAt) return false;
    if (other.createdAt > windowEnd || other.createdAt > now) return false;
    return overlappingNames(trip, other, members) >= 2;
  });
}

function tripHasSettle(trip: Trip, expenses: Expense[]): boolean {
  return expensesForTrip(trip.id, expenses).some(isSettleExpense);
}

function tripHasLiveExpense(trip: Trip, expenses: Expense[]): boolean {
  return expensesForTrip(trip.id, expenses).some(isLiveExpense);
}

export function computeLoopHealth(
  trips: Trip[],
  expenses: Expense[],
  members: Record<string, Member>,
  now = Date.now()
): LoopHealth {
  const pool = fleetTrips(trips);
  const n = pool.length;
  const firstExpense10m = pool.filter((t) => {
    const first = firstLiveExpenseAt(t, expenses);
    return first !== null && first - t.createdAt <= TEN_MIN_MS && first >= t.createdAt;
  }).length;
  const secondMember = pool.filter((t) => claimedMemberCount(t, members) >= 2 || t.memberIds.length >= 2).length;
  const firstSettle = pool.filter((t) => tripHasSettle(t, expenses)).length;
  const locked = pool.filter((t) => Boolean(t.closed)).length;
  const nextTrip90d = pool.filter((t) => hasNextSquadTrip(t, trips, members, now)).length;

  const steps: LoopStepStat[] = [
    { key: 'firstExpense10m', label: 'First expense ≤ 10 min', count: firstExpense10m, pct: pct(firstExpense10m, n) },
    { key: 'secondMember', label: 'Second member on trip', count: secondMember, pct: pct(secondMember, n) },
    { key: 'firstSettle', label: 'At least one settlement', count: firstSettle, pct: pct(firstSettle, n) },
    { key: 'locked', label: 'Trip locked', count: locked, pct: pct(locked, n) },
    { key: 'nextTrip90d', label: 'Same squad, new trip ≤ 90d', count: nextTrip90d, pct: pct(nextTrip90d, n) },
  ];
  return { tripCount: n, steps };
}

export function computeActivationFunnel(
  users: AdminUserRow[],
  trips: Trip[],
  expenses: Expense[],
  members: Record<string, Member>
): FunnelStep[] {
  const signup = users.length;
  const tripCreated = fleetTrips(trips).length;
  const inviteSent = fleetTrips(trips).filter((t) => t.memberIds.length >= 2 || Boolean(t.shareToken) || t.shareEnabled).length;
  const memberClaimed = fleetTrips(trips).filter((t) => claimedMemberCount(t, members) >= 1).length;
  const firstExpense = fleetTrips(trips).filter((t) => tripHasLiveExpense(t, expenses)).length;
  const firstSettle = fleetTrips(trips).filter((t) => tripHasSettle(t, expenses)).length;

  const counts = [signup, tripCreated, inviteSent, memberClaimed, firstExpense, firstSettle];
  const labels = [
    'Signed up',
    'Created a trip',
    'Invited (2nd seat / share)',
    'Member claimed join code',
    'First expense',
    'First settle',
  ];
  const keys = ['signup', 'trip', 'invite', 'claim', 'expense', 'settle'];

  return counts.map((count, i) => ({
    key: keys[i],
    label: labels[i],
    count,
    pctOfPrev: i === 0 ? 100 : pct(count, counts[i - 1]),
    pctOfFirst: pct(count, counts[0] || counts[1]),
  }));
}

export function computeGhostTrips(
  trips: Trip[],
  expenses: Expense[],
  members: Record<string, Member>,
  now = Date.now()
): GhostTripRow[] {
  const rows: GhostTripRow[] = [];
  const today = new Date(now).toISOString().slice(0, 10);

  for (const trip of fleetTrips(trips)) {
    const live = expensesForTrip(trip.id, expenses).filter(isLiveExpense);
    const ageDays = Math.floor((now - trip.createdAt) / DAY_MS);
    const memberCount = trip.memberIds.filter((id) => !members[id]?.archived).length;

    if (memberCount <= 1 && live.length === 0 && now - trip.createdAt >= DAY_MS && !trip.closed) {
      rows.push({
        tripId: trip.id,
        name: trip.name,
        kind: 'idle',
        ageDays,
        memberCount,
        expenseCount: 0,
      });
      continue;
    }

    const ended = Boolean(trip.endDate && trip.endDate < today);
    if (ended && live.length > 0 && !tripHasSettle(trip, expenses) && !trip.closed) {
      rows.push({
        tripId: trip.id,
        name: trip.name,
        kind: 'unpaid',
        ageDays,
        memberCount,
        expenseCount: live.length,
      });
    }
  }

  return rows.sort((a, b) => b.ageDays - a.ageDays);
}

function cloneLastUsed(trip: Trip, expenses: Expense[]): boolean {
  const live = expensesForTrip(trip.id, expenses)
    .filter(isLiveExpense)
    .sort((a, b) => a.createdAt - b.createdAt);
  for (let i = 1; i < live.length; i++) {
    const prev = live[i - 1];
    const curr = live[i];
    const same =
      curr.title === prev.title &&
      curr.amount === prev.amount &&
      curr.paidBy === prev.paidBy &&
      curr.category === prev.category;
    if (same && curr.createdAt - prev.createdAt <= 5 * 60 * 1000) return true;
  }
  return false;
}

export function computeFlagUsageProxies(
  trips: Trip[],
  expenses: Expense[],
  members: Record<string, Member>,
  armedFlags: Record<FeatureFlagKey, boolean> = DEFAULT_FEATURE_FLAGS
): FlagUsageRow[] {
  const pool = fleetTrips(trips);
  const eligible = Math.max(1, pool.length);

  const rows: Array<Omit<FlagUsageRow, 'armed' | 'pct' | 'eligible'> & { proxy: string; used: number }> = [
    {
      key: 'enableCloneLastExpense',
      label: 'Clone last expense',
      used: pool.filter((t) => cloneLastUsed(t, expenses)).length,
      proxy: 'Back-to-back same title/amount/payer within 5 min',
    },
    {
      key: 'enableUpiPayments',
      label: 'UPI on settle row',
      used: pool.filter((t) => t.memberIds.some((id) => Boolean(members[id]?.upiId))).length,
      proxy: 'A member on the trip has a UPI id saved',
    },
    {
      key: 'enableTripShareLink',
      label: 'View-only share link',
      used: pool.filter((t) => Boolean(t.shareToken) || t.shareEnabled).length,
      proxy: 'Share token generated on the trip',
    },
    {
      key: 'enableWhatsAppSettlementShare',
      label: 'WhatsApp settle card',
      used: pool.filter((t) => tripHasSettle(t, expenses)).length,
      proxy: 'Settlement row exists (share itself is device-local)',
    },
    {
      key: 'enableRememberDefaultSplit',
      label: 'Remember default split',
      used: pool.filter((t) =>
        expensesForTrip(t.id, expenses).some((e) => isLiveExpense(e) && e.splitMode && e.splitMode !== 'equal')
      ).length,
      proxy: 'Any non-equal split on the trip',
    },
    {
      key: 'enableNotesTalkPackPass',
      label: 'Notes Talk / Pack / Pass',
      used: pool.filter((t) => (t.notes?.length ?? 0) > 0 || (t.checklist?.length ?? 0) > 0).length,
      proxy: 'At least one note or packing item',
    },
    {
      key: 'enableTravelPasses',
      label: 'Travel passes',
      used: pool.filter((t) => (t.passes?.length ?? 0) > 0).length,
      proxy: 'Boarding pass / ticket saved',
    },
    {
      key: 'enableCloneTripSquad',
      label: 'Clone last squad',
      used: pool.filter((t) =>
        trips.some((other) => other.id !== t.id && other.ownerId === t.ownerId && overlappingNames(t, other, members) >= 2)
      ).length,
      proxy: 'Owner has another trip sharing 2+ names',
    },
    {
      key: 'enableTripCloseout',
      label: 'Trip closeout / lock',
      used: pool.filter((t) => Boolean(t.closed)).length,
      proxy: 'Trip locked',
    },
    {
      key: 'enableReceiptUpload',
      label: 'Receipt photo',
      used: pool.filter((t) => expensesForTrip(t.id, expenses).some((e) => Boolean(e.receiptPath))).length,
      proxy: 'Expense has a receipt path',
    },
    {
      key: 'enableGeotagging',
      label: 'Geotag',
      used: pool.filter((t) => expensesForTrip(t.id, expenses).some((e) => Boolean(e.location))).length,
      proxy: 'Expense has coordinates',
    },
    {
      key: 'enableRecycleBin',
      label: 'Recycle bin',
      used: pool.filter((t) => expensesForTrip(t.id, expenses).some((e) => Boolean(e.deletedAt))).length,
      proxy: 'Soft-deleted expense on the trip',
    },
    {
      key: 'enableSplitwiseImport',
      label: 'Splitwise CSV import',
      used: pool.filter((t) => (t.splitwiseImportCount ?? 0) > 0 || Boolean(t.splitwiseImportedAt)).length,
      proxy: 'Import recorded on the trip',
    },
    {
      key: 'enableContactInvite',
      label: 'Contact invite',
      used: pool.filter((t) => t.memberIds.length > claimedMemberCount(t, members)).length,
      proxy: 'Placeholder members (not yet claimed)',
    },
  ];

  return rows.map((row) => ({
    ...row,
    eligible: pool.length,
    armed: Boolean(armedFlags[row.key]),
    pct: pct(row.used, eligible),
  }));
}

export function computeInviteAttribution(
  trips: Trip[],
  expenses: Expense[],
  members: Record<string, Member>
): InviteAttribution {
  const pool = fleetTrips(trips);
  return {
    tripCount: pool.length,
    joinCodeClaimed: pool.filter((t) => claimedMemberCount(t, members) >= 1).length,
    shareLinkCreated: pool.filter((t) => Boolean(t.shareToken) || t.shareEnabled).length,
    shareLinkViews: pool.reduce((sum, t) => sum + (t.shareViewCount ?? 0), 0),
    joinPreviews: pool.reduce((sum, t) => sum + (t.joinPreviewCount ?? 0), 0),
    waSettleProxy: pool.filter((t) => tripHasSettle(t, expenses)).length,
    placeholderMembers: pool.filter((t) => t.memberIds.length > claimedMemberCount(t, members)).length,
  };
}

const SLICE_LABELS: Record<TripSlice, string> = {
  cafe: 'Cafe / weekend',
  pass_holder: 'Pass holder',
  multi_currency: 'Multi-currency',
};

export function computeSliceLoopHealth(
  trips: Trip[],
  expenses: Expense[],
  members: Record<string, Member>,
  now = Date.now()
): SliceLoopRow[] {
  const pool = fleetTrips(trips);
  const buckets: Record<TripSlice, Trip[]> = {
    cafe: [],
    pass_holder: [],
    multi_currency: [],
  };
  for (const trip of pool) {
    buckets[classifyTripSlice(trip, expenses)].push(trip);
  }

  return (Object.keys(buckets) as TripSlice[]).map((slice) => {
    const group = buckets[slice];
    const n = group.length;
    const firstExpense10m = group.filter((t) => {
      const first = firstLiveExpenseAt(t, expenses);
      return first !== null && first - t.createdAt <= TEN_MIN_MS && first >= t.createdAt;
    }).length;
    const secondMember = group.filter((t) => t.memberIds.length >= 2 || claimedMemberCount(t, members) >= 2).length;
    const firstSettle = group.filter((t) => tripHasSettle(t, expenses)).length;
    const nextTrip90d = group.filter((t) => hasNextSquadTrip(t, trips, members, now)).length;
    return {
      slice,
      label: SLICE_LABELS[slice],
      tripCount: n,
      firstExpense10mPct: pct(firstExpense10m, n),
      secondMemberPct: pct(secondMember, n),
      firstSettlePct: pct(firstSettle, n),
      nextTrip90dPct: pct(nextTrip90d, n),
    };
  });
}

export function computeWinBackList(
  trips: Trip[],
  expenses: Expense[],
  now = Date.now()
): WinBackRow[] {
  const pool = fleetTrips(trips);
  const rows: WinBackRow[] = [];

  for (const trip of pool) {
    if (!tripHasSettle(trip, expenses) && !trip.closed) continue;
    const last = lastActivityAt(trip, expenses);
    const age = now - last;
    if (age < SIXTY_DAY_MS || age > NINETY_DAY_MS) continue;
    const newer = trips.some(
      (other) => other.ownerId === trip.ownerId && other.id !== trip.id && other.createdAt > trip.createdAt && !other.archived
    );
    if (newer) continue;
    rows.push({
      tripId: trip.id,
      name: trip.name,
      ownerId: trip.ownerId,
      daysSinceSettle: Math.floor(age / DAY_MS),
    });
  }

  return rows.sort((a, b) => b.daysSinceSettle - a.daysSinceSettle);
}

export function computeCloseoutPulse(trips: Trip[], auditLogs: AuditLogEntry[] = []): CloseoutPulseSummary {
  const fromTrips = fleetTrips(trips)
    .map((t) => t.closeoutPulse)
    .filter((v): v is CloseoutPulseAnswer => v === 'yes' || v === 'no' || v === 'skip');

  const fromAudit = auditLogs
    .filter((l) => l.action === 'closeout_pulse')
    .map((l) => {
      const details = l.details as { wouldReuse?: CloseoutPulseAnswer } | null;
      return details?.wouldReuse;
    })
    .filter((v): v is CloseoutPulseAnswer => v === 'yes' || v === 'no' || v === 'skip');

  const answers = fromTrips.length > 0 ? fromTrips : fromAudit;
  const yes = answers.filter((a) => a === 'yes').length;
  const no = answers.filter((a) => a === 'no').length;
  const skip = answers.filter((a) => a === 'skip').length;
  const answered = yes + no + skip;
  return { yes, no, skip, answered, wouldReusePct: pct(yes, yes + no) };
}

export function computeSplitwiseImports(trips: Trip[], auditLogs: AuditLogEntry[] = []): SplitwiseImportSummary {
  const fromTrips = fleetTrips(trips).filter((t) => (t.splitwiseImportCount ?? 0) > 0 || Boolean(t.splitwiseImportedAt));
  if (fromTrips.length > 0) {
    return {
      tripCount: fromTrips.length,
      expenseCount: fromTrips.reduce((sum, t) => sum + (t.splitwiseImportCount ?? 0), 0),
    };
  }
  const logs = auditLogs.filter((l) => l.action === 'splitwise_import');
  return {
    tripCount: new Set(logs.map((l) => l.tripId).filter(Boolean)).size,
    expenseCount: logs.reduce((sum, l) => {
      const details = l.details as { count?: number } | null;
      return sum + (typeof details?.count === 'number' ? details.count : 0);
    }, 0),
  };
}

export function computeSignupSources(users: AdminUserRow[], auditLogs: AuditLogEntry[] = []): SignupSourceRow[] {
  const fromProfiles = users.some((u) => Boolean(u.signupSource?.utm_source));
  const map = new Map<string, number>();

  if (fromProfiles) {
    for (const user of users) {
      const source = user.signupSource?.utm_source?.trim() || 'direct / unknown';
      map.set(source, (map.get(source) || 0) + 1);
    }
  } else {
    for (const log of auditLogs.filter((l) => l.action === 'signup_attribution')) {
      const details = log.details as { utm_source?: string } | null;
      const source = details?.utm_source?.trim() || 'direct / unknown';
      map.set(source, (map.get(source) || 0) + 1);
    }
    if (map.size === 0 && users.length > 0) {
      map.set('direct / unknown', users.length);
    }
  }

  return [...map.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
