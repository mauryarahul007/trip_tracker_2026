import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';

/// v1 -> v2 must be additive: existing rows survive, new column is nullable.
void main() {
  test('upgrade 1 -> 2 keeps data and adds domain_json columns', () async {
    final db = AppDatabase.forTesting(NativeDatabase.memory(setup: (raw) {
      raw.execute('''
        CREATE TABLE trips (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL,
          end_date TEXT NOT NULL, base_currency TEXT NOT NULL, owner_id TEXT NOT NULL, join_code TEXT,
          destination TEXT, stops_json TEXT, checklist_json TEXT, notes_json TEXT, passes_json TEXT,
          fx_config_json TEXT, member_roles_json TEXT, simplify_debts INTEGER NOT NULL DEFAULT 1,
          archived INTEGER NOT NULL DEFAULT 0, frozen INTEGER NOT NULL DEFAULT 0, closed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT, updated_at TEXT);
        CREATE TABLE expenses (id TEXT NOT NULL PRIMARY KEY, trip_id TEXT NOT NULL, title TEXT NOT NULL,
          amount REAL NOT NULL, currency TEXT NOT NULL, category_id TEXT, paid_by_member_id TEXT NOT NULL,
          split_mode TEXT NOT NULL, split_data_json TEXT, date TEXT NOT NULL, receipt_url TEXT, notes TEXT,
          is_reimbursement INTEGER NOT NULL DEFAULT 0, reimbursement_to_member_id TEXT,
          archived INTEGER NOT NULL DEFAULT 0, recycled_at TEXT, payer_weights_json TEXT, exchange_rate REAL,
          dispute_status TEXT, dispute_note TEXT, disputed_by_member_id TEXT,
          settlement_confirmed INTEGER NOT NULL DEFAULT 0, settlement_confirmed_at TEXT, approval_status TEXT,
          approved_by_member_id TEXT, approved_at TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE trip_messages (id TEXT NOT NULL PRIMARY KEY, trip_id TEXT NOT NULL, user_id TEXT NOT NULL,
          sender_name TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL, expense_payload_json TEXT,
          created_at TEXT NOT NULL);
        INSERT INTO trips (id, name, start_date, end_date, base_currency, owner_id) VALUES ('t1','Goa','a','b','INR','u');
        PRAGMA user_version = 1;
      ''');
    }));
    final trips = await db.select(db.tripsTable).get();
    expect(trips.single.name, 'Goa');
    expect(trips.single.domainJson, isNull);
    for (final t in ['trips', 'expenses', 'trip_messages']) {
      final cols = await db.customSelect('PRAGMA table_info($t)').get();
      expect(cols.map((c) => c.read<String>('name')), contains('domain_json'), reason: t);
    }
    await db.close();
  });
}
