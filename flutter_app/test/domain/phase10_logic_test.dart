import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:trip_tracker/core/telemetry/growth_telemetry.dart';
import 'package:trip_tracker/domain/logic/bug_report.dart';
import 'package:trip_tracker/domain/logic/pass_reminders.dart';
import 'package:trip_tracker/domain/logic/pii_scrub.dart';
import 'package:trip_tracker/domain/logic/push_routing.dart';
import 'package:trip_tracker/domain/logic/version_gate.dart';
import 'package:trip_tracker/domain/models/travel_pass.dart';

TravelPass pass(String type, String? start, {String id = 'p1'}) =>
    TravelPass(id: id, tripId: 't1', type: type, title: 'AI 101', startDateTime: start, createdAt: 0, updatedAt: 0);

void main() {
  group('routeForPush', () {
    const id = '8b5cf6e2-1111-2222-3333-444455556666';
    test('trusts only our own trip tab routes', () {
      expect(
        routeForPush({'type': 'expense_added', 'tripId': id, 'route': '/trip/$id/expenses'}),
        '/trip/$id/expenses',
      );
      expect(routeForPush({'type': 'chat_message', 'tripId': id, 'route': 'https://evil.example/x'}), '/trip/$id/chat');
      expect(routeForPush({'type': 'chat_message', 'tripId': id, 'route': '/trip/../../admin'}), '/trip/$id/chat');
    });
    test('rebuilds from type, goes home for deleted trips and unknowns', () {
      expect(routeForPush({'type': 'settlement_reminder', 'tripId': id}), '/trip/$id/ledger');
      expect(routeForPush({'type': 'member_joined', 'tripId': id}), '/trip/$id/members');
      expect(routeForPush({'type': 'trip_deleted', 'tripId': id}), '/');
      expect(routeForPush({'type': 'lifecycle_nudge'}), '/');
      expect(routeForPush(const {}), isNull);
    });
  });

  group('planPassReminders', () {
    final now = DateTime(2026, 10, 6, 12);
    test('flight gets 24h and 3h, stay only 24h, ids stable', () {
      final dep = DateTime(2026, 10, 10, 18).toIso8601String();
      final f = planPassReminders(pass('flight', dep), 'Goa', now);
      expect(f.map((r) => r.fireAt), [DateTime(2026, 10, 9, 18), DateTime(2026, 10, 10, 15)]);
      expect(f.first.body, 'Goa: AI 101 departs in 24 hours');
      expect(f.last.body, 'Goa: AI 101 departs in 3 hours');
      expect(planPassReminders(pass('stay', dep), 'Goa', now), hasLength(1));
      expect(planPassReminders(pass('flight', dep), 'Goa', now).map((r) => r.id), f.map((r) => r.id));
      expect(f.first.id, isNot(f.last.id));
    });
    test('skips past, imminent and undated passes', () {
      expect(planPassReminders(pass('flight', null), 'Goa', now), isEmpty);
      expect(planPassReminders(pass('flight', DateTime(2026, 10, 6, 13).toIso8601String()), 'Goa', now), isEmpty);
      expect(
        planPassReminders(pass('flight', DateTime(2026, 10, 7, 11).toIso8601String()), 'Goa', now).single.body,
        contains('in 3 hours'),
      );
    });
    test('quiet hours move a reminder to the end of the window, never past departure', () {
      final dep = DateTime(2026, 10, 10, 2); // 24h before = 02:00 on the 9th, inside 22:00-07:00
      final moved = planPassReminders(pass('stay', dep.toIso8601String()), 'Goa', now, quietEnabled: true);
      expect(moved.single.fireAt, DateTime(2026, 10, 9, 7));
      final tight = DateTime(2026, 10, 7, 1); // window end (07:00) would be after departure
      final kept = planPassReminders(pass('flight', tight.toIso8601String()), 'Goa', now, quietEnabled: true);
      expect(kept.map((r) => r.fireAt), contains(DateTime(2026, 10, 6, 22)));
    });
  });

  group('decideVersionGate (fail-open table)', () {
    Map<String, Object?> g({bool maint = false, bool upgrade = false, bool rec = true}) => {
      'maintenance_mode': maint,
      'maintenance_message': 'Back at 5',
      'upgrade_required': upgrade,
      'is_supported': !upgrade,
      'is_recommended': rec,
      'store_url': 'https://store/x',
      'recommended_version': '2.0.0',
    };
    test('below min, below recommended, ok, maintenance', () {
      expect(decideVersionGate(g(upgrade: true)).status, GateStatus.hard);
      expect(decideVersionGate(g(rec: false)).status, GateStatus.soft);
      expect(decideVersionGate(g()).status, GateStatus.ok);
      final m = decideVersionGate(g(maint: true, upgrade: true));
      expect(m.status, GateStatus.maintenance);
      expect(m.message, 'Back at 5');
    });
    test('anything unreadable is ok', () {
      expect(decideVersionGate(null).status, GateStatus.ok);
      expect(decideVersionGate('boom').status, GateStatus.ok);
      expect(decideVersionGate(<String, Object?>{}).status, GateStatus.ok);
      expect(decideVersionGate({'upgrade_required': 'yes'}).status, GateStatus.ok);
    });
  });

  group('scrubPii', () {
    test('removes emails, tokens, bearer headers and phone numbers', () {
      final out = scrubPii(
        'user a.b+c@gmail.com called +91 98765 43210 with Bearer abcdefghijklmnop1234 and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig_value_here',
      );
      expect(out, isNot(contains('gmail')));
      expect(out, isNot(contains('98765')));
      expect(out, isNot(contains('abcdefghijklmnop')));
      expect(out, isNot(contains('eyJ')));
      expect(out, contains('[email]'));
    });
    test('leaves ordinary text and short numbers alone', () {
      expect(scrubPii('Synced 3 items for trip Goa in 120 ms'), 'Synced 3 items for trip Goa in 120 ms');
    });
  });

  group('bug reporting', () {
    test('fingerprint matches the web hash', () {
      expect(bugFingerprint(title: 'Sync Failed', category: 'offline-sync', route: 'settings/report-bug'), 'fp_rapkp6');
      expect(bugFingerprint(title: 'x', category: 'general', stackTrace: 'Error: boom\n at a'), 'fp_4qux3b');
      expect(
        bugFingerprint(
          title: 'A much longer title to overflow the 32 bit hash several times over',
          category: 'ui-ux',
          route: '#/trip',
        ),
        'fp_kfbj8y',
      );
    });
    test('auto-report gate dedupes, rate limits and ignores network noise', () {
      var t = DateTime(2026, 1, 1);
      final gate = AutoReportGate(maxPerSession: 2, minGap: const Duration(seconds: 30), now: () => t);
      expect(gate.allow('Bad state: boom'), isTrue);
      expect(gate.allow('Bad state: boom'), isFalse); // duplicate
      expect(gate.allow('Other error'), isFalse); // too soon
      t = t.add(const Duration(seconds: 31));
      expect(gate.allow('Other error'), isTrue);
      t = t.add(const Duration(minutes: 5));
      expect(gate.allow('Third error'), isFalse); // session cap
      expect(AutoReportGate().allow('SocketException: Failed host lookup'), isFalse);
      expect(AutoReportGate().allow(''), isFalse);
    });
  });

  group('GrowthTelemetry', () {
    test('app_open once per UTC day; other events once per session; off sends nothing', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final sent = <String>[];
      var now = DateTime.utc(2026, 10, 6, 10);
      final t = GrowthTelemetry(send: (u, e) async => sent.add('$u:$e'), prefs: prefs, now: () => now);
      t.track(GrowthEvent.syncFail);
      expect(sent, isEmpty); // not configured
      t.configure(on: true, userId: 'u1');
      t.configure(on: true, userId: 'u1'); // idempotent
      expect(sent, ['u1:app_open']);
      t.track(GrowthEvent.syncFail);
      t.track(GrowthEvent.syncFail);
      t.track(GrowthEvent.flushOk);
      expect(sent, ['u1:app_open', 'u1:sync_fail', 'u1:flush_ok']);
      t.configure(on: false, userId: 'u1');
      t.track(GrowthEvent.queueStuck);
      expect(sent, hasLength(3));
      now = now.add(const Duration(hours: 1));
      t.configure(on: true, userId: 'u1');
      expect(sent, hasLength(3)); // same UTC day
      now = now.add(const Duration(days: 1));
      t.configure(on: false, userId: null);
      t.configure(on: true, userId: 'u1');
      expect(sent.last, 'u1:app_open');
    });
    test('queue_stuck only after 10 online minutes with pending work', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final sent = <String>[];
      var now = DateTime.utc(2026, 10, 6, 10);
      final t = GrowthTelemetry(send: (u, e) async => sent.add(e), prefs: prefs, now: () => now)
        ..configure(on: true, userId: 'u1');
      t.onQueue(pending: 2, online: true);
      now = now.add(const Duration(minutes: 9));
      t.onQueue(pending: 2, online: true);
      expect(sent, ['app_open']);
      now = now.add(const Duration(minutes: 2));
      t.onQueue(pending: 2, online: true);
      expect(sent, ['app_open', 'queue_stuck']);
    });
  });
}
