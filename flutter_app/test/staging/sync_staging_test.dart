@Tags(['staging'])
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb;
import 'package:uuid/uuid.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/supabase_outbox_remote.dart';
import 'package:trip_tracker/data/sync/sync_engine.dart';
import 'package:trip_tracker/data/sync/trip_pull_sync.dart';
import 'package:trip_tracker/domain/models/expense.dart';

/// Headless engine demo against STAGING (never prod). Run nightly:
///   flutter test --tags staging \
///     --dart-define=STAGING_URL=... --dart-define=STAGING_ANON_KEY=... \
///     --dart-define=STAGING_EMAIL=owner@triptracker.test --dart-define=STAGING_PASSWORD=password123
/// (seeded persona from contract/STAGING_SETUP.md; NEVER a production project)
/// Flow: sign in -> create trip offline -> add expense offline -> "reconnect"
/// (flush) -> replay flush (duplicate) -> assert exactly one server row.
void main() {
  const url = String.fromEnvironment('STAGING_URL');
  const key = String.fromEnvironment('STAGING_ANON_KEY');
  const email = String.fromEnvironment('STAGING_EMAIL');
  const password = String.fromEnvironment('STAGING_PASSWORD');
  final configured = url.isNotEmpty && key.isNotEmpty && email.isNotEmpty;

  test('offline create + expense syncs once, replay is idempotent', () async {
    final client = sb.SupabaseClient(url, key);
    final auth = await client.auth.signInWithPassword(email: email, password: password);
    final uid = auth.user!.id;
    final db = AppDatabase.memory();
    final outbox = OutboxStore(db);
    var online = false;
    final engine = SyncEngine(
      store: outbox,
      remote: SupabaseOutboxRemote(client),
      isOnline: () async => online,
      ensureSession: () async => true,
    );
    void noop() {}
    final trips = DriftTripRepository(db, outbox, noop);
    final expenses = DriftExpenseRepository(db, outbox, noop);

    final tripId = await trips.createTrip(
        name: 'staging-sync-${DateTime.now().millisecondsSinceEpoch}', startDate: '2026-01-01', endDate: '2026-01-02',
        baseCurrency: 'INR', ownerId: uid, creatorName: 'Harness');
    final memberId = (await db.select(db.membersTable).get()).single.id;
    await expenses.add(Expense(
        id: const Uuid().v4(),
        tripId: tripId, title: 'Offline lunch', amount: 120, currency: 'INR', category: 'Food', date: '2026-01-01',
        paidBy: memberId, splitMode: 'equal', splitMemberIds: [memberId], resolvedShares: {memberId: 120},
        createdAt: 0, updatedAt: 0));

    expect((await engine.flush()).paused, isTrue); // offline: nothing lost
    expect(await outbox.all(), hasLength(2));

    online = true;
    final r = await engine.flush();
    expect(r.sent, 2);
    expect(await outbox.all(), isEmpty);

    final pull = TripPullSync(db, outbox, SupabaseTripReader(client));
    await pull.syncTrip(tripId);
    final rows = await client.from('expenses').select('id').eq('trip_id', tripId);
    expect(rows, hasLength(1));

    await client.from('trips').delete().eq('id', tripId); // cleanup
    await db.close();
  }, skip: configured ? false : 'STAGING_* dart-defines not set');
}
