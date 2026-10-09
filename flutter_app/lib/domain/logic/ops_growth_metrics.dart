import '../models/admin.dart';
import '../models/admin_fleet.dart';
import '../models/expense.dart';
import '../models/member.dart';
import '../models/trip.dart';
import 'flag_defaults.g.dart';

/// Port of `src/utils/opsGrowthMetrics.ts`: the retention-loop, funnel and attribution figures on the
/// Ops Deck Growth tab. Pure functions over [FleetData]; times are epoch milliseconds like the web code.

const tenMinMs = 10 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const sixtyDayMs = 60 * dayMs;
const ninetyDayMs = 90 * dayMs;

enum TripSlice { cafe, passHolder, multiCurrency }

class LoopStepStat {
  const LoopStepStat(this.key, this.label, this.count, this.pct);
  final String key;
  final String label;
  final int count;
  final double pct;
}

class LoopHealth {
  const LoopHealth(this.tripCount, this.steps);
  final int tripCount;
  final List<LoopStepStat> steps;
}

class FunnelStep {
  const FunnelStep(this.key, this.label, this.count, this.pctOfPrev, this.pctOfFirst);
  final String key;
  final String label;
  final int count;
  final double pctOfPrev;
  final double pctOfFirst;
}

class GhostTripRow {
  const GhostTripRow({
    required this.tripId,
    required this.name,
    required this.kind,
    required this.ageDays,
    required this.memberCount,
    required this.expenseCount,
  });
  final String tripId;
  final String name;

  /// 'idle' (no activity) or 'unpaid' (trip over, spent, nothing settled).
  final String kind;
  final int ageDays;
  final int memberCount;
  final int expenseCount;
}

class FlagUsageRow {
  const FlagUsageRow({
    required this.key,
    required this.label,
    required this.armed,
    required this.used,
    required this.eligible,
    required this.pct,
    required this.proxy,
  });
  final String key;
  final String label;
  final bool armed;
  final int used;
  final int eligible;
  final double pct;
  final String proxy;
}

class InviteAttribution {
  const InviteAttribution({
    required this.tripCount,
    required this.joinCodeClaimed,
    required this.shareLinkCreated,
    required this.shareLinkViews,
    required this.joinPreviews,
    required this.waSettleProxy,
    required this.placeholderMembers,
  });
  final int tripCount;
  final int joinCodeClaimed;
  final int shareLinkCreated;
  final int shareLinkViews;
  final int joinPreviews;
  final int waSettleProxy;
  final int placeholderMembers;
}

class SliceLoopRow {
  const SliceLoopRow({
    required this.slice,
    required this.label,
    required this.tripCount,
    required this.firstExpense10mPct,
    required this.secondMemberPct,
    required this.firstSettlePct,
    required this.nextTrip90dPct,
  });
  final TripSlice slice;
  final String label;
  final int tripCount;
  final double firstExpense10mPct;
  final double secondMemberPct;
  final double firstSettlePct;
  final double nextTrip90dPct;
}

class WinBackRow {
  const WinBackRow({required this.tripId, required this.name, required this.ownerId, required this.daysSinceSettle});
  final String tripId;
  final String name;
  final String ownerId;
  final int daysSinceSettle;
}

class CloseoutPulseSummary {
  const CloseoutPulseSummary({
    required this.yes,
    required this.no,
    required this.skip,
    required this.answered,
    required this.wouldReusePct,
  });
  final int yes;
  final int no;
  final int skip;
  final int answered;
  final double wouldReusePct;
}

class SplitwiseImportSummary {
  const SplitwiseImportSummary(this.tripCount, this.expenseCount);
  final int tripCount;
  final int expenseCount;
}

class SignupSourceRow {
  const SignupSourceRow(this.source, this.count);
  final String source;
  final int count;
}

double _pct(num part, num whole) => whole > 0 ? part / whole * 100 : 0;

bool isLiveExpense(Expense e) => !e.isSettlement && !e.title.startsWith('Settlement:') && e.deletedAt == null;
bool isSettleExpense(Expense e) => (e.isSettlement || e.title.startsWith('Settlement:')) && e.deletedAt == null;

List<FleetTrip> fleetTrips(FleetData d) => [
  for (final t in d.trips)
    if (!t.trip.archived) t,
];

/// Expenses grouped by trip once, so each metric is one pass instead of a scan per trip.
Map<String, List<Expense>> _byTrip(List<Expense> all) {
  final m = <String, List<Expense>>{};
  for (final e in all) {
    (m[e.tripId] ??= []).add(e);
  }
  return m;
}

String _name(Map<String, Member> members, String id) => (members[id]?.name ?? '').trim().toLowerCase();

int claimedMemberCount(Trip trip, Map<String, Member> members) {
  final seen = <String>{};
  for (final id in trip.memberIds) {
    final linked = members[id]?.linkedUserId;
    if (linked != null && linked.isNotEmpty) seen.add(linked);
  }
  return seen.length;
}

int? firstLiveExpenseAt(List<Expense> tripExpenses) {
  int? min;
  for (final e in tripExpenses) {
    if (!isLiveExpense(e)) continue;
    if (min == null || e.createdAt < min) min = e.createdAt;
  }
  return min;
}

int lastActivityAt(Trip trip, List<Expense> tripExpenses) {
  var max = trip.createdAt;
  for (final e in tripExpenses) {
    if (e.deletedAt != null) continue;
    if (e.createdAt > max) max = e.createdAt;
  }
  return max;
}

TripSlice classifyTripSlice(Trip trip, List<Expense> tripExpenses) {
  if (trip.passes.isNotEmpty) return TripSlice.passHolder;
  final currencies = {
    for (final e in tripExpenses)
      if (isLiveExpense(e)) (e.currency.isEmpty ? trip.baseCurrency : e.currency).toUpperCase(),
  };
  final custom = trip.fxConfig?.customRates.isNotEmpty ?? false;
  return currencies.length > 1 || custom ? TripSlice.multiCurrency : TripSlice.cafe;
}

int _overlappingNames(Trip a, Trip b, Map<String, Member> members) {
  final namesA = {
    for (final id in a.memberIds)
      if (_name(members, id).isNotEmpty) _name(members, id),
  };
  var overlap = 0;
  for (final id in b.memberIds) {
    final n = _name(members, id);
    if (n.isNotEmpty && namesA.contains(n)) overlap++;
  }
  return overlap;
}

bool _hasNextSquadTrip(Trip trip, List<FleetTrip> all, Map<String, Member> members, int now) {
  final windowEnd = trip.createdAt + ninetyDayMs;
  return all.any((o) {
    final other = o.trip;
    if (other.id == trip.id || other.archived) return false;
    if (other.ownerId != trip.ownerId) return false;
    if (other.createdAt <= trip.createdAt) return false;
    if (other.createdAt > windowEnd || other.createdAt > now) return false;
    return _overlappingNames(trip, other, members) >= 2;
  });
}

bool _hasSettle(List<Expense>? ex) => ex?.any(isSettleExpense) ?? false;
bool _hasLive(List<Expense>? ex) => ex?.any(isLiveExpense) ?? false;
bool _hasShare(Trip t) => (t.shareToken != null && t.shareToken!.isNotEmpty) || t.shareEnabled;

bool _firstWithin10m(Trip t, List<Expense>? ex) {
  final first = firstLiveExpenseAt(ex ?? const []);
  return first != null && first - t.createdAt <= tenMinMs && first >= t.createdAt;
}

LoopHealth computeLoopHealth(FleetData d, {required int now}) {
  final pool = fleetTrips(d);
  final by = _byTrip(d.expenses);
  final n = pool.length;
  final firstExpense = pool.where((f) => _firstWithin10m(f.trip, by[f.id])).length;
  final second = pool.where((f) => claimedMemberCount(f.trip, d.members) >= 2 || f.trip.memberIds.length >= 2).length;
  final settle = pool.where((f) => _hasSettle(by[f.id])).length;
  final locked = pool.where((f) => f.trip.closed).length;
  final next = pool.where((f) => _hasNextSquadTrip(f.trip, d.trips, d.members, now)).length;
  return LoopHealth(n, [
    LoopStepStat('firstExpense10m', 'First expense ≤ 10 min', firstExpense, _pct(firstExpense, n)),
    LoopStepStat('secondMember', 'Second member on trip', second, _pct(second, n)),
    LoopStepStat('firstSettle', 'At least one settlement', settle, _pct(settle, n)),
    LoopStepStat('locked', 'Trip locked', locked, _pct(locked, n)),
    LoopStepStat('nextTrip90d', 'Same squad, new trip ≤ 90d', next, _pct(next, n)),
  ]);
}

List<FunnelStep> computeActivationFunnel(FleetData d, List<AdminUser> users) {
  final pool = fleetTrips(d);
  final by = _byTrip(d.expenses);
  final counts = [
    users.length,
    pool.length,
    pool.where((f) => f.trip.memberIds.length >= 2 || _hasShare(f.trip)).length,
    pool.where((f) => claimedMemberCount(f.trip, d.members) >= 1).length,
    pool.where((f) => _hasLive(by[f.id])).length,
    pool.where((f) => _hasSettle(by[f.id])).length,
  ];
  const labels = [
    'Signed up',
    'Created a trip',
    'Invited (2nd seat / share)',
    'Member claimed join code',
    'First expense',
    'First settle',
  ];
  const keys = ['signup', 'trip', 'invite', 'claim', 'expense', 'settle'];
  final first = counts[0] != 0 ? counts[0] : counts[1];
  return [
    for (var i = 0; i < counts.length; i++)
      FunnelStep(keys[i], labels[i], counts[i], i == 0 ? 100 : _pct(counts[i], counts[i - 1]), _pct(counts[i], first)),
  ];
}

List<GhostTripRow> computeGhostTrips(FleetData d, {required int now}) {
  final rows = <GhostTripRow>[];
  final by = _byTrip(d.expenses);
  final today = DateTime.fromMillisecondsSinceEpoch(now, isUtc: true).toIso8601String().substring(0, 10);
  for (final f in fleetTrips(d)) {
    final t = f.trip;
    final live = [
      for (final e in by[t.id] ?? const <Expense>[])
        if (isLiveExpense(e)) e,
    ];
    final ageDays = ((now - t.createdAt) / dayMs).floor();
    final memberCount = t.memberIds.where((id) => !(d.members[id]?.archived ?? false)).length;
    if (memberCount <= 1 && live.isEmpty && now - t.createdAt >= dayMs && !t.closed) {
      rows.add(
        GhostTripRow(
          tripId: t.id,
          name: t.name,
          kind: 'idle',
          ageDays: ageDays,
          memberCount: memberCount,
          expenseCount: 0,
        ),
      );
      continue;
    }
    final ended = t.endDate.isNotEmpty && t.endDate.compareTo(today) < 0;
    if (ended && live.isNotEmpty && !_hasSettle(by[t.id]) && !t.closed) {
      rows.add(
        GhostTripRow(
          tripId: t.id,
          name: t.name,
          kind: 'unpaid',
          ageDays: ageDays,
          memberCount: memberCount,
          expenseCount: live.length,
        ),
      );
    }
  }
  rows.sort((a, b) => b.ageDays.compareTo(a.ageDays));
  return rows;
}

bool _cloneLastUsed(List<Expense>? tripExpenses) {
  final live = [
    for (final e in tripExpenses ?? const <Expense>[])
      if (isLiveExpense(e)) e,
  ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  for (var i = 1; i < live.length; i++) {
    final p = live[i - 1], c = live[i];
    final same = c.title == p.title && c.amount == p.amount && c.paidBy == p.paidBy && c.category == p.category;
    if (same && c.createdAt - p.createdAt <= 5 * 60 * 1000) return true;
  }
  return false;
}

/// [armed] is the effective global value per flag key (override, else the registry default).
List<FlagUsageRow> computeFlagUsageProxies(FleetData d, {Map<String, bool>? armed}) {
  final pool = fleetTrips(d);
  final by = _byTrip(d.expenses);
  final eligible = pool.isEmpty ? 1 : pool.length;
  bool any(FleetTrip f, bool Function(Expense) test) => (by[f.id] ?? const <Expense>[]).any(test);

  final rows = <(String, String, int, String)>[
    (
      'enableCloneLastExpense',
      'Clone last expense',
      pool.where((f) => _cloneLastUsed(by[f.id])).length,
      'Back-to-back same title/amount/payer within 5 min',
    ),
    (
      'enableTripShareLink',
      'View-only share link',
      pool.where((f) => _hasShare(f.trip)).length,
      'Share token generated on the trip',
    ),
    (
      'enableWhatsAppSettlementShare',
      'WhatsApp settle card',
      pool.where((f) => _hasSettle(by[f.id])).length,
      'Settlement row exists (share itself is device-local)',
    ),
    (
      'enableRememberDefaultSplit',
      'Remember default split',
      pool.where((f) => any(f, (e) => isLiveExpense(e) && e.splitMode.isNotEmpty && e.splitMode != 'equal')).length,
      'Any non-equal split on the trip',
    ),
    (
      'enableNotesTalkPackPass',
      'Notes Talk / Pack / Pass',
      pool.where((f) => f.trip.notes.isNotEmpty || f.trip.checklist.isNotEmpty).length,
      'At least one note or packing item',
    ),
    (
      'enableTravelPasses',
      'Travel passes',
      pool.where((f) => f.trip.passes.isNotEmpty).length,
      'Boarding pass / ticket saved',
    ),
    (
      'enableCloneTripSquad',
      'Clone last squad',
      pool
          .where(
            (f) => d.trips.any(
              (o) =>
                  o.id != f.id && o.trip.ownerId == f.trip.ownerId && _overlappingNames(f.trip, o.trip, d.members) >= 2,
            ),
          )
          .length,
      'Owner has another trip sharing 2+ names',
    ),
    ('enableTripCloseout', 'Trip closeout / lock', pool.where((f) => f.trip.closed).length, 'Trip locked'),
    (
      'enableReceiptUpload',
      'Receipt photo',
      pool.where((f) => any(f, (e) => (e.receiptPath ?? '').isNotEmpty)).length,
      'Expense has a receipt path',
    ),
    (
      'enableGeotagging',
      'Geotag',
      pool.where((f) => any(f, (e) => e.location != null)).length,
      'Expense has coordinates',
    ),
    (
      'enableSplitwiseImport',
      'Splitwise CSV import',
      pool.where((f) => f.splitwiseImportCount > 0 || f.splitwiseImportedAt != null).length,
      'Import recorded on the trip',
    ),
    (
      'enableContactInvite',
      'Contact invite',
      pool.where((f) => f.trip.memberIds.length > claimedMemberCount(f.trip, d.members)).length,
      'Placeholder members (not yet claimed)',
    ),
  ];
  return [
    for (final (key, label, used, proxy) in rows)
      FlagUsageRow(
        key: key,
        label: label,
        armed: (armed ?? defaultFeatureFlags)[key] ?? defaultFeatureFlags[key] ?? false,
        used: used,
        eligible: pool.length,
        pct: _pct(used, eligible),
        proxy: proxy,
      ),
  ];
}

InviteAttribution computeInviteAttribution(FleetData d) {
  final pool = fleetTrips(d);
  final by = _byTrip(d.expenses);
  return InviteAttribution(
    tripCount: pool.length,
    joinCodeClaimed: pool.where((f) => claimedMemberCount(f.trip, d.members) >= 1).length,
    shareLinkCreated: pool.where((f) => _hasShare(f.trip)).length,
    shareLinkViews: pool.fold(0, (s, f) => s + f.trip.shareViewCount),
    joinPreviews: pool.fold(0, (s, f) => s + f.joinPreviewCount),
    waSettleProxy: pool.where((f) => _hasSettle(by[f.id])).length,
    placeholderMembers: pool.where((f) => f.trip.memberIds.length > claimedMemberCount(f.trip, d.members)).length,
  );
}

const _sliceLabels = {
  TripSlice.cafe: 'Cafe / weekend',
  TripSlice.passHolder: 'Pass holder',
  TripSlice.multiCurrency: 'Multi-currency',
};

List<SliceLoopRow> computeSliceLoopHealth(FleetData d, {required int now}) {
  final by = _byTrip(d.expenses);
  final buckets = {for (final s in TripSlice.values) s: <FleetTrip>[]};
  for (final f in fleetTrips(d)) {
    buckets[classifyTripSlice(f.trip, by[f.id] ?? const [])]!.add(f);
  }
  return [
    for (final s in TripSlice.values)
      () {
        final g = buckets[s]!;
        final n = g.length;
        return SliceLoopRow(
          slice: s,
          label: _sliceLabels[s]!,
          tripCount: n,
          firstExpense10mPct: _pct(g.where((f) => _firstWithin10m(f.trip, by[f.id])).length, n),
          secondMemberPct: _pct(
            g.where((f) => f.trip.memberIds.length >= 2 || claimedMemberCount(f.trip, d.members) >= 2).length,
            n,
          ),
          firstSettlePct: _pct(g.where((f) => _hasSettle(by[f.id])).length, n),
          nextTrip90dPct: _pct(g.where((f) => _hasNextSquadTrip(f.trip, d.trips, d.members, now)).length, n),
        );
      }(),
  ];
}

List<WinBackRow> computeWinBackList(FleetData d, {required int now}) {
  final by = _byTrip(d.expenses);
  final rows = <WinBackRow>[];
  for (final f in fleetTrips(d)) {
    final t = f.trip;
    if (!_hasSettle(by[t.id]) && !t.closed) continue;
    final age = now - lastActivityAt(t, by[t.id] ?? const []);
    if (age < sixtyDayMs || age > ninetyDayMs) continue;
    final newer = d.trips.any(
      (o) => o.trip.ownerId == t.ownerId && o.id != t.id && o.trip.createdAt > t.createdAt && !o.trip.archived,
    );
    if (newer) continue;
    rows.add(WinBackRow(tripId: t.id, name: t.name, ownerId: t.ownerId, daysSinceSettle: (age / dayMs).floor()));
  }
  rows.sort((a, b) => b.daysSinceSettle.compareTo(a.daysSinceSettle));
  return rows;
}

/// [auditPulses] are the `wouldReuse` answers logged to the audit trail, used only when no trip carries one.
CloseoutPulseSummary computeCloseoutPulse(FleetData d, {List<String> auditPulses = const []}) {
  final fromTrips = [
    for (final f in fleetTrips(d))
      if (const ['yes', 'no', 'skip'].contains(f.closeoutPulse)) f.closeoutPulse!,
  ];
  final answers = fromTrips.isNotEmpty
      ? fromTrips
      : [
          for (final a in auditPulses)
            if (const ['yes', 'no', 'skip'].contains(a)) a,
        ];
  final yes = answers.where((a) => a == 'yes').length;
  final no = answers.where((a) => a == 'no').length;
  final skip = answers.where((a) => a == 'skip').length;
  return CloseoutPulseSummary(
    yes: yes,
    no: no,
    skip: skip,
    answered: yes + no + skip,
    wouldReusePct: _pct(yes, yes + no),
  );
}

SplitwiseImportSummary computeSplitwiseImports(FleetData d, {List<AuditEntry> audit = const []}) {
  final imported = [
    for (final f in fleetTrips(d))
      if (f.splitwiseImportCount > 0 || f.splitwiseImportedAt != null) f,
  ];
  if (imported.isNotEmpty) {
    return SplitwiseImportSummary(imported.length, imported.fold(0, (s, f) => s + f.splitwiseImportCount));
  }
  final logs = [
    for (final l in audit)
      if (l.action == 'splitwise_import') l,
  ];
  return SplitwiseImportSummary(
    {
      for (final l in logs)
        if (l.tripId != null) l.tripId,
    }.length,
    logs.fold(0, (s, l) => s + (l.details['count'] is num ? (l.details['count'] as num).toInt() : 0)),
  );
}

List<SignupSourceRow> computeSignupSources(List<AdminUser> users, {List<AuditEntry> audit = const []}) {
  final fromProfiles = users.any((u) => u.signupSource != null);
  final map = <String, int>{};
  if (fromProfiles) {
    for (final u in users) {
      final s = u.signupSource ?? 'direct / unknown';
      map[s] = (map[s] ?? 0) + 1;
    }
  } else {
    for (final l in audit.where((l) => l.action == 'signup_attribution')) {
      final raw = l.details['utm_source'];
      final s = raw is String && raw.trim().isNotEmpty ? raw.trim() : 'direct / unknown';
      map[s] = (map[s] ?? 0) + 1;
    }
    if (map.isEmpty && users.isNotEmpty) map['direct / unknown'] = users.length;
  }
  return [for (final e in map.entries) SignupSourceRow(e.key, e.value)]..sort((a, b) => b.count.compareTo(a.count));
}
