import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/ops_analytics.dart';
import 'package:trip_tracker/domain/logic/ops_growth_metrics.dart';
import 'package:trip_tracker/domain/models/admin.dart';
import 'package:trip_tracker/domain/models/admin_fleet.dart';

import '../support/fleet_fixture.dart';

void main() {
  final d = sampleFleet();
  final users = sampleUsers();

  group('growth metrics (port of opsGrowthMetrics.ts)', () {
    test('loop health counts the live pool only (the archived trip is ignored)', () {
      final loop = computeLoopHealth(d, now: fleetNow);
      expect(loop.tripCount, 6);
      expect(
        {for (final s in loop.steps) s.key: s.count},
        {
          'firstExpense10m': 2, // T1 and T7
          'secondMember': 4, // T1, T2, T4, T7
          'firstSettle': 2, // T1, T5
          'locked': 1, // T1
          'nextTrip90d': 1, // T1 -> T2: same owner, two shared names, inside 90 days
        },
      );
      expect(loop.steps.first.pct, closeTo(33.3, 0.1));
    });

    test('activation funnel', () {
      final f = computeActivationFunnel(d, users);
      expect([for (final s in f) s.count], [8, 6, 4, 6, 3, 2]);
      expect(f.first.pctOfPrev, 100);
      expect(f[1].pctOfPrev, 75); // 6 trips from 8 signups
      expect(f.last.pctOfFirst, 25);
    });

    test('ghost trips: idle ones and ended-but-unpaid ones, oldest first', () {
      final g = computeGhostTrips(d, now: fleetNow);
      expect([for (final r in g) (r.tripId, r.kind)], [('t5', 'idle'), ('t4', 'unpaid'), ('t3', 'idle')]);
      expect(g.first.ageDays, 80);
    });

    test('win-back: settled, quiet for 60-90 days, owner has no newer trip', () {
      final w = computeWinBackList(d, now: fleetNow);
      expect([for (final r in w) (r.tripId, r.daysSinceSettle)], [('t5', 75)]);
    });

    test('invite attribution', () {
      final a = computeInviteAttribution(d);
      expect(a.joinCodeClaimed, 6);
      expect(a.shareLinkCreated, 1);
      expect(a.shareLinkViews, 7);
      expect(a.joinPreviews, 3);
      expect(a.waSettleProxy, 2);
      expect(a.placeholderMembers, 2); // T1 (Cara) and T4 (Fay) have unclaimed seats
    });

    test('trip-type slices', () {
      final s = {for (final r in computeSliceLoopHealth(d, now: fleetNow)) r.slice: r};
      expect(s[TripSlice.cafe]!.tripCount, 5);
      expect(s[TripSlice.multiCurrency]!.tripCount, 1); // T7 has INR and USD spend
      expect(s[TripSlice.passHolder]!.tripCount, 0);
      expect(s[TripSlice.multiCurrency]!.firstExpense10mPct, 100);
    });

    test('closeout pulse, splitwise imports and signup sources', () {
      final p = computeCloseoutPulse(d);
      expect((p.yes, p.no, p.answered, p.wouldReusePct), (1, 1, 2, 50.0));
      final sw = computeSplitwiseImports(d);
      expect((sw.tripCount, sw.expenseCount), (1, 5));
      final src = computeSignupSources(users);
      expect([for (final r in src) (r.source, r.count)], [('direct / unknown', 5), ('instagram', 3)]);
    });

    test('closeout pulse falls back to the audit trail when no trip has an answer', () {
      final bare = FleetData(
        members: d.members,
        expenses: d.expenses,
        trips: [for (final f in d.trips) FleetTrip(trip: f.trip)],
      );
      final p = computeCloseoutPulse(bare, auditPulses: ['yes', 'yes', 'no', 'maybe']);
      expect((p.yes, p.no, p.answered), (2, 1, 3)); // 'maybe' is not an answer
    });

    test('flag usage reads the registry default unless an override says otherwise', () {
      final rows = {for (final r in computeFlagUsageProxies(d)) r.key: r};
      expect(rows['enableTripShareLink']!.used, 1);
      expect(rows['enableTripCloseout']!.used, 1);
      expect(rows['enableReceiptUpload']!.used, 1); // e1 has a receipt
      expect(rows['enableCloneTripSquad']!.used, 2); // T1 and T2: same owner, shared names
      final off = computeFlagUsageProxies(d, armed: {'enableTripShareLink': false});
      expect(off.firstWhere((r) => r.key == 'enableTripShareLink').armed, isFalse);
    });
  });

  group('spend and engagement analytics (port of AdminAnalyticsPage.tsx)', () {
    test('active expenses leave out settlements and archived trips', () {
      expect(activeExpenses(d).map((e) => e.id).toSet(), {'e1', 'e2', 'e4', 'e7a', 'e7b'});
    });

    test('currency, category and spender breakdowns', () {
      final ex = activeExpenses(d);
      expect(
        [for (final c in currencyBreakdown(ex)) (c.currency, c.total, c.count)],
        [('INR', 1250.0, 3), ('USD', 420.0, 2)],
      );
      final cats = categoryBreakdown(ex);
      expect(cats.single.name, 'Food & Dining');
      expect(cats.single.pct, 100);
      final sp = topSpenders(d, ex);
      expect((sp.first.name, sp.first.total), ('Asha', 900.0));
    });

    test('split modes, receipts and edit rate', () {
      final ex = activeExpenses(d);
      final modes = splitModeBreakdown(ex);
      expect((modes.first.label, modes.first.count), ('Equal', 4));
      expect(modes.last.label, 'Exact Amount');
      expect(computeFeatureAdoption(ex).receipts, 1);
      expect(computeEditRate(ex).edited, 0);
    });

    test('lifecycle counts every trip, averages use the live pool', () {
      final l = computeLifecycle(d, activeExpenses(d));
      expect((l.active, l.grounded, l.archived), (6, 0, 1));
      expect(l.avgExpenses, closeTo(5 / 6, 0.001));
    });

    test('stale trips: nothing for 30+ days, longest first', () {
      final s = staleTrips(d, now: fleetNow);
      // T1 last spend 98d ago, T5 75d, T2 70d (created, never spent). T4 (19d), T3 and T7 are recent.
      expect([for (final r in s) (r.tripId, r.days)], [('t1', 98), ('t5', 75), ('t2', 70)]);
    });

    test('join funnel counts trips with a member who linked an account', () {
      final j = computeJoinFunnel(d);
      expect((j.generated, j.joined), (7, 6)); // T6 (archived) has no members
    });

    test('retention: signed up 14+ days ago and created an expense in the last 30 days', () {
      final r = computeRetention(users, d, now: fleetNow);
      expect(r.eligible, 7); // u1 signed up 10 days ago: too new
      expect(r.retained, 0); // no fixture expense was created in the last 30 days
    });

    test('seven-day trend sums the last week against the week before', () {
      final t = computeSevenDayTrend(activeExpenses(d), now: fleetNow);
      expect(t.dayBuckets, hasLength(7));
      expect(t.thisWeekCount, 0); // every fixture expense is older than a week
      expect(t.lastWeekSpend, 70); // e7a (50) and e7b (20) fall in the week before
      expect(t.pctChange, -100); // nothing this week against 70 last week
    });

    test('settlement health: trips with no spend are settled, others carry a balance', () {
      final h = computeSettlementHealth(d);
      expect(h.settledCount + h.unsettledCount, 6);
      expect(h.settledCount, greaterThanOrEqualTo(2)); // T2 and T3 have no expenses
      expect(h.outstandingVolume, greaterThan(0));
    });

    test('bug pulse', () {
      final p = computeBugPulse([
        const AdminBug(
          id: 'B1',
          title: 'a',
          description: '',
          severity: 'critical',
          category: 'general',
          status: 'open',
          foundBy: 'auto-crash-handler',
        ),
        AdminBug(
          id: 'B2',
          title: 'b',
          description: '',
          severity: 'low',
          category: 'general',
          status: 'resolved',
          foundBy: 'human',
          createdAt: DateTime.utc(2026, 10, 1),
          resolvedAt: DateTime.utc(2026, 10, 1, 6),
        ),
      ]);
      expect((p.open, p.critical, p.autoFiled), (1, 1, 1));
      expect(p.avgResolveHours, 6);
    });
  });
}
