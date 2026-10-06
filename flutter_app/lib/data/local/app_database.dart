import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

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
  AppDatabase() : super(_openConnection());

  AppDatabase.forTesting(super.e);

  factory AppDatabase.memory({bool logStatements = false}) {
    return AppDatabase.forTesting(
      NativeDatabase.memory(logStatements: logStatements),
    );
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

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'trip_tracker.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

/// Global provider for the Drift AppDatabase
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});
