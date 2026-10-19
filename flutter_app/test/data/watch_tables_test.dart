import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/local/entity_codec.dart';
import 'package:trip_tracker/data/mappers/row_mappers.dart';
import 'package:trip_tracker/data/repositories/drift_repositories.dart';

void main() {
  test('watchTables re-emits after each write (the old SELECT 1 watcher emitted once)', () async {
    // The in-memory DB is left open: close() waits on drift's stream bookkeeping and hangs here.
    final db = AppDatabase.memory();
    var n = 0;
    final seen = <int>[];
    final sub = watchTables(db, {db.tripsTable}, () async => ++n).listen(seen.add);
    await Future<void>.delayed(const Duration(milliseconds: 100));
    for (var i = 0; i < 2; i++) {
      final trip = tripFromRow({
        'id': 't$i',
        'name': 'n',
        'owner_id': 'u',
        'created_at': '2026-01-01T00:00:00Z',
        'updated_at': '2026-01-01T00:00:00Z',
      });
      await db.into(db.tripsTable).insertOnConflictUpdate(tripToCompanion(trip));
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    await sub.cancel();
    expect(seen, [1, 2, 3]);
  });
}
