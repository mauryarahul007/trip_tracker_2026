import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'connection/connection.dart';
import 'tables.dart';

part 'app_database.g.dart';

@DriftDatabase(
  tables: [
    TripsTable,
    MembersTable,
    GroupsTable,
    GroupMembersTable,
    CategoriesTable,
    ExpensesTable,
    TripMessagesTable,
    NotificationsTable,
    OutboxTable,
    SyncMetaTable,
    SettingsKvTable,
    OfflineReceiptsTable,
    FeatureFlagsTable,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(openAppConnection());

  AppDatabase.forTesting(super.e);

  factory AppDatabase.memory({bool logStatements = false}) {
    return AppDatabase.forTesting(openMemoryConnection(logStatements: logStatements));
  }

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) async {
      await m.createAll();
    },
    onUpgrade: (m, from, to) async {
      // Additive only; never destructive.
      if (from < 2) {
        await m.addColumn(tripsTable, tripsTable.domainJson);
        await m.addColumn(expensesTable, expensesTable.domainJson);
        await m.addColumn(tripMessagesTable, tripMessagesTable.domainJson);
      }
    },
  );
}

/// Global provider for the Drift AppDatabase
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});
