import 'package:drift/drift.dart';

@DataClassName('TripEntry')
class TripsTable extends Table {
  @override
  String get tableName => 'trips';

  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get startDate => text().named('start_date')();
  TextColumn get endDate => text().named('end_date')();
  TextColumn get baseCurrency => text().named('base_currency')();
  TextColumn get ownerId => text().named('owner_id')();
  TextColumn get joinCode => text().named('join_code').nullable()();
  TextColumn get destination => text().nullable()();
  TextColumn get stopsJson => text().named('stops_json').nullable()();
  TextColumn get checklistJson => text().named('checklist_json').nullable()();
  TextColumn get notesJson => text().named('notes_json').nullable()();
  TextColumn get passesJson => text().named('passes_json').nullable()();
  TextColumn get fxConfigJson => text().named('fx_config_json').nullable()();
  TextColumn get memberRolesJson => text().named('member_roles_json').nullable()();
  BoolColumn get simplifyDebts => boolean().named('simplify_debts').withDefault(const Constant(true))();
  BoolColumn get archived => boolean().withDefault(const Constant(false))();
  BoolColumn get frozen => boolean().withDefault(const Constant(false))();
  BoolColumn get closed => boolean().withDefault(const Constant(false))();
  TextColumn get createdAt => text().named('created_at').nullable()();
  TextColumn get updatedAt => text().named('updated_at').nullable()();

  /// Full-fidelity domain `Trip.toJson()` (schema v2); columns above are for querying.
  TextColumn get domainJson => text().named('domain_json').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('MemberEntry')
class MembersTable extends Table {
  @override
  String get tableName => 'members';

  TextColumn get id => text()();
  TextColumn get tripId => text().named('trip_id')();
  TextColumn get name => text()();
  TextColumn get linkedUserId => text().named('linked_user_id').nullable()();
  BoolColumn get archived => boolean().withDefault(const Constant(false))();
  TextColumn get joinDate => text().named('join_date').nullable()();
  TextColumn get leaveDate => text().named('leave_date').nullable()();
  TextColumn get createdAt => text().named('created_at').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('GroupEntry')
class GroupsTable extends Table {
  @override
  String get tableName => 'groups';

  TextColumn get id => text()();
  TextColumn get tripId => text().named('trip_id')();
  TextColumn get name => text()();
  TextColumn get createdAt => text().named('created_at').nullable()();
  TextColumn get updatedAt => text().named('updated_at').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('GroupMemberEntry')
class GroupMembersTable extends Table {
  @override
  String get tableName => 'group_members';

  TextColumn get groupId => text().named('group_id')();
  TextColumn get memberId => text().named('member_id')();

  @override
  Set<Column> get primaryKey => {groupId, memberId};
}

@DataClassName('CategoryEntry')
class CategoriesTable extends Table {
  @override
  String get tableName => 'categories';

  TextColumn get id => text()();
  TextColumn get tripId => text().named('trip_id').nullable()();
  TextColumn get name => text()();
  TextColumn get icon => text().nullable()();
  BoolColumn get isCustom => boolean().named('is_custom').withDefault(const Constant(false))();
  TextColumn get createdAt => text().named('created_at').nullable()();
  TextColumn get updatedAt => text().named('updated_at').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ExpenseEntry')
class ExpensesTable extends Table {
  @override
  String get tableName => 'expenses';

  TextColumn get id => text()();
  TextColumn get tripId => text().named('trip_id')();
  TextColumn get title => text()();
  RealColumn get amount => real()();
  TextColumn get currency => text()();
  TextColumn get categoryId => text().named('category_id').nullable()();
  TextColumn get paidByMemberId => text().named('paid_by_member_id')();
  TextColumn get splitMode => text().named('split_mode')();
  TextColumn get splitDataJson => text().named('split_data_json').nullable()();
  TextColumn get date => text()();
  TextColumn get receiptUrl => text().named('receipt_url').nullable()();
  TextColumn get notes => text().nullable()();
  BoolColumn get isReimbursement => boolean().named('is_reimbursement').withDefault(const Constant(false))();
  TextColumn get reimbursementToMemberId => text().named('reimbursement_to_member_id').nullable()();
  BoolColumn get archived => boolean().withDefault(const Constant(false))();
  TextColumn get recycledAt => text().named('recycled_at').nullable()();
  TextColumn get payerWeightsJson => text().named('payer_weights_json').nullable()();
  RealColumn get exchangeRate => real().named('exchange_rate').nullable()();
  TextColumn get disputeStatus => text().named('dispute_status').nullable()();
  TextColumn get disputeNote => text().named('dispute_note').nullable()();
  TextColumn get disputedByMemberId => text().named('disputed_by_member_id').nullable()();
  BoolColumn get settlementConfirmed => boolean().named('settlement_confirmed').withDefault(const Constant(false))();
  TextColumn get settlementConfirmedAt => text().named('settlement_confirmed_at').nullable()();
  TextColumn get approvalStatus => text().named('approval_status').nullable()();
  TextColumn get approvedByMemberId => text().named('approved_by_member_id').nullable()();
  TextColumn get approvedAt => text().named('approved_at').nullable()();
  TextColumn get createdAt => text().named('created_at').nullable()();
  TextColumn get updatedAt => text().named('updated_at').nullable()();

  /// Full-fidelity domain `Expense.toJson()` (schema v2); columns above are for querying.
  TextColumn get domainJson => text().named('domain_json').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('TripMessageEntry')
class TripMessagesTable extends Table {
  @override
  String get tableName => 'trip_messages';

  TextColumn get id => text()();
  TextColumn get tripId => text().named('trip_id')();
  TextColumn get userId => text().named('user_id')();
  TextColumn get senderName => text().named('sender_name')();
  TextColumn get kind => text()();
  TextColumn get message => text()();
  TextColumn get expensePayloadJson => text().named('expense_payload_json').nullable()();
  TextColumn get createdAt => text().named('created_at')();

  /// Full-fidelity domain `TripMessage.toJson()` (schema v2). Legacy columns
  /// map: user_id <- memberId, message <- body, sender_name unused ('').
  TextColumn get domainJson => text().named('domain_json').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('NotificationEntry')
class NotificationsTable extends Table {
  @override
  String get tableName => 'notifications';

  TextColumn get id => text()();
  TextColumn get userId => text().named('user_id')();
  TextColumn get tripId => text().named('trip_id').nullable()();
  TextColumn get title => text()();
  TextColumn get body => text()();
  TextColumn get dataJson => text().named('data_json').nullable()();
  BoolColumn get read => boolean().withDefault(const Constant(false))();
  TextColumn get createdAt => text().named('created_at')();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OutboxEntry')
class OutboxTable extends Table {
  @override
  String get tableName => 'outbox_mutations';

  TextColumn get id => text()();
  TextColumn get itemType => text().named('item_type')();
  TextColumn get tripId => text().named('trip_id').nullable()();
  TextColumn get payloadJson => text().named('payload_json')();
  TextColumn get idempotencyKey => text().named('idempotency_key')();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('pending'))(); // pending, in_flight, failed, poison
  TextColumn get lastError => text().named('last_error').nullable()();
  TextColumn get createdAt => text().named('created_at')();
  TextColumn get lastAttemptedAt => text().named('last_attempted_at').nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('SyncMetaEntry')
class SyncMetaTable extends Table {
  @override
  String get tableName => 'sync_meta';

  TextColumn get key => text()();
  TextColumn get value => text()();
  TextColumn get updatedAt => text().named('updated_at')();

  @override
  Set<Column> get primaryKey => {key};
}

@DataClassName('SettingsKvEntry')
class SettingsKvTable extends Table {
  @override
  String get tableName => 'settings_kv';

  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

@DataClassName('OfflineReceiptEntry')
class OfflineReceiptsTable extends Table {
  @override
  String get tableName => 'offline_receipts';

  TextColumn get expenseId => text().named('expense_id')();
  TextColumn get localFilePath => text().named('local_file_path')();
  TextColumn get mimeType => text().named('mime_type')();
  BoolColumn get uploaded => boolean().withDefault(const Constant(false))();
  TextColumn get remoteUrl => text().named('remote_url').nullable()();
  TextColumn get createdAt => text().named('created_at')();

  @override
  Set<Column> get primaryKey => {expenseId};
}

@DataClassName('FeatureFlagEntry')
class FeatureFlagsTable extends Table {
  @override
  String get tableName => 'feature_flags';

  TextColumn get key => text()();
  BoolColumn get enabled => boolean()();
  TextColumn get valueJson => text().named('value_json').nullable()();
  TextColumn get updatedAt => text().named('updated_at')();

  @override
  Set<Column> get primaryKey => {key};
}
