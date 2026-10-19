import 'package:drift/drift.dart';
import 'package:drift/wasm.dart';

/// Needs `web/sqlite3.wasm` and `web/drift_worker.js` (versions must match the
/// `sqlite3` / `drift` packages in pubspec.lock; see web/README note).
QueryExecutor openAppConnection() {
  return LazyDatabase(() async {
    final result = await WasmDatabase.open(
      databaseName: 'trip_tracker',
      sqlite3Uri: Uri.parse('sqlite3.wasm'),
      driftWorkerUri: Uri.parse('drift_worker.js'),
    );
    return result.resolvedExecutor;
  });
}

QueryExecutor openMemoryConnection({bool logStatements = false}) =>
    throw UnsupportedError('In-memory database is only available on native (tests).');
