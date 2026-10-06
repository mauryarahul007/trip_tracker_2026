import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';
import 'package:trip_tracker/data/sync/outbox_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/domain/models/trip.dart';

void main() {
  late AppDatabase db;
  late OutboxStore outbox;
  late DriftTripRepository trips;
  late String id;

  setUp(() async {
    db = AppDatabase.memory();
    outbox = OutboxStore(db);
    trips = DriftTripRepository(db, outbox, () {});
    id = await trips.createTrip(name: 'Goa', startDate: '2026-10-01', endDate: '2026-10-09', baseCurrency: 'INR', ownerId: 'u1', creatorName: 'A');
    for (final i in await outbox.all()) {
      await outbox.markDone(i.id);
    }
  });
  tearDown(() => db.close());

  test('simplify debts: local first, queued as a column patch', () async {
    expect((await trips.watchTrip(id).first)!.simplifyDebts, isTrue);
    await trips.setSimplifyDebts(id, false);
    expect((await trips.watchTrip(id).first)!.simplifyDebts, isFalse);
    final q = (await outbox.all()).single;
    expect(q.type, OutboxType.updateTripState);
    expect(q.payload['patch'], {'simplify_debts': false});
  });

  test('approval threshold: set, then cleared with null or <= 0', () async {
    await trips.setApprovalThreshold(id, 500);
    expect((await trips.watchTrip(id).first)!.approvalThreshold, 500);
    await trips.setApprovalThreshold(id, 0);
    expect((await trips.watchTrip(id).first)!.approvalThreshold, isNull);
    final patches = [for (final i in await outbox.all()) i.payload['patch']];
    expect(patches, [
      {'approval_threshold': 500.0},
      {'approval_threshold': null},
    ]);
  });

  test('category order and exclusion defaults persist', () async {
    await trips.setCategoryOrder(id, ['b', 'a']);
    await trips.setSplitExclusionDefaults(id, {'cat-food': ['m1']});
    final t = (await trips.watchTrip(id).first)!;
    expect(t.categoryOrder, ['b', 'a']);
    expect(t.splitExclusionDefaults, {'cat-food': ['m1']});
  });

  test('FX config is written through the collab RPC path (any participant may)', () async {
    await trips.setFxConfig(id, const TripFxConfig(customRates: {'USD': 1.1}, markupPercent: 2));
    final t = (await trips.watchTrip(id).first)!;
    expect(t.fxConfig!.customRates, {'USD': 1.1});
    expect(t.fxConfig!.markupPercent, 2);
    final q = (await outbox.all()).single;
    expect(q.type, OutboxType.setTripCollabField);
    expect(q.payload['field'], 'fx_config');
    expect(q.payload['value'], {'customRates': {'USD': 1.1}, 'markupPercent': 2.0});
  });

  test('settings on a trip that no longer exists are ignored, not queued', () async {
    await trips.setSimplifyDebts('ghost', false);
    await trips.setFxConfig('ghost', const TripFxConfig());
    expect(await outbox.all(), isEmpty);
  });

  test('a pending settings change protects the trip from being overwritten by a pull (dirty id)', () async {
    await trips.setSimplifyDebts(id, false);
    final dirty = await outbox.dirtyIds();
    expect(dirty, contains(id));
  });
}
