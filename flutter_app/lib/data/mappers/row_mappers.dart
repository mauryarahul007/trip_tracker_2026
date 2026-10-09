import '../../domain/models/category.dart';
import '../../domain/models/expense.dart';
import '../../domain/models/group.dart';
import '../../domain/models/member.dart';
import '../../domain/models/trip.dart';
import '../../domain/models/trip_message.dart';

// Ports of `mapTrip/mapMember/mapGroup/mapCategory/mapExpense` in
// src/services/tripApi.ts. NOTE: these follow the REAL column names
// (`category`, `paid_by`, `split_member_ids`, `is_settlement`, `deleted_at`),
// not the simplified names in API_CONTRACT.md §2.4.

int _ms(Object? v) => v == null ? 0 : (DateTime.tryParse(v.toString())?.millisecondsSinceEpoch ?? 0);
int? _msOrNull(Object? v) => v == null ? null : DateTime.tryParse(v.toString())?.millisecondsSinceEpoch;
Map<String, dynamic>? _map(Object? v) => v is Map ? Map<String, dynamic>.from(v) : null;

Trip tripFromRow(Map<String, dynamic> r, {List<String> memberIds = const [], List<String> groupIds = const []}) {
  return Trip.fromJson({
    'id': r['id'],
    'name': r['name'],
    'startDate': r['start_date'],
    'endDate': r['end_date'],
    'baseCurrency': r['base_currency'],
    'destination': r['destination'],
    'ownerId': r['owner_id'],
    'joinCode': r['join_code'],
    'memberIds': memberIds,
    'groupIds': groupIds,
    'archived': r['archived'] ?? false,
    'frozen': r['frozen'] ?? false,
    'closed': r['closed'] ?? false,
    'stops': r['stops'] is List ? r['stops'] : const <dynamic>[],
    'checklist': r['checklist'] is List ? r['checklist'] : const <dynamic>[],
    'notes': r['notes'] is List ? r['notes'] : const <dynamic>[],
    'passes': r['passes'] is List ? r['passes'] : const <dynamic>[],
    'fxConfig': _map(r['fx_config']),
    'memberRoles': _map(r['member_roles']),
    'splitExclusionDefaults': _map(r['split_exclusion_defaults']),
    'categoryOrder': r['category_order'] is List ? r['category_order'] : null,
    'simplifyDebts': r['simplify_debts'] == null ? true : r['simplify_debts'] == true,
    'shareToken': r['share_token'],
    'shareEnabled': r['share_enabled'] == true,
    'shareExpiresAt': r['share_expires_at'],
    'shareViewCount': (r['share_view_count'] as num?)?.toInt() ?? 0,
    'approvalThreshold': (r['approval_threshold'] as num?)?.toDouble(),
    'createdAt': _ms(r['created_at']),
    'updatedAt': _ms(r['updated_at']),
  });
}

Member memberFromRow(Map<String, dynamic> r) => Member(
  id: r['id'] as String,
  name: r['name'] as String? ?? '',
  email: r['email'] as String?,
  tripId: r['trip_id'] as String?,
  archived: r['archived'] == true,
  linkedUserId: r['linked_user_id'] as String?,
  avatarUrl: _map(r['profile'])?['avatar_url'] as String?,
  joinDate: r['join_date'] as String?,
  leaveDate: r['leave_date'] as String?,
);

Group groupFromRow(Map<String, dynamic> r, List<String> memberIds) => Group(
  id: r['id'] as String,
  tripId: r['trip_id'] as String?,
  name: r['name'] as String? ?? '',
  memberIds: memberIds,
);

Category categoryFromRow(Map<String, dynamic> r) => Category(
  id: r['id'] as String,
  tripId: r['trip_id'] as String?,
  name: r['name'] as String? ?? '',
  icon: r['icon'] as String?,
  isCustom: r['is_custom'] != false,
);

Expense expenseFromRow(Map<String, dynamic> r) {
  Map<String, dynamic>? shares(Object? v) => _map(v);
  return Expense.fromJson({
    'id': r['id'],
    'tripId': r['trip_id'],
    'title': r['title'],
    'amount': (r['amount'] as num?)?.toDouble() ?? 0.0, // numeric may arrive as num
    'currency': r['currency'],
    'category': r['category'],
    'date': r['date'],
    'paidBy': r['paid_by'],
    'paidByShares': shares(r['paid_by_shares']),
    'splitMode': r['split_mode'],
    'splitMemberIds': r['split_member_ids'] is List ? r['split_member_ids'] : const <dynamic>[],
    'splitConfig': shares(r['split_config']),
    'itemizedConfig': _map(r['itemized_config']),
    'resolvedShares': shares(r['resolved_shares']) ?? const {},
    'receiptPath': r['receipt_path'],
    'photoPaths': r['photo_paths'],
    'disputedAt': _msOrNull(r['disputed_at']),
    'disputedByUserId': r['disputed_by_user_id'],
    'disputeNote': r['dispute_note'],
    'isSettlement': r['is_settlement'] == true,
    'settlementConfirmedAt': _msOrNull(r['settlement_confirmed_at']),
    'settlementConfirmedByUserId': r['settlement_confirmed_by_user_id'],
    'approvalStatus': r['approval_status'] ?? 'confirmed',
    'approvedByUserId': r['approved_by_user_id'],
    'createdByUserId': r['created_by_user_id'],
    'location': _map(r['location']),
    'deletedAt': _msOrNull(r['deleted_at']),
    'deletedByUserId': r['deleted_by_user_id'],
    'createdAt': _ms(r['created_at']),
    'updatedAt': _ms(r['updated_at']),
  });
}

/// Arguments for `upsert_expense_v1` (migration 0115).
Map<String, dynamic> expenseToUpsertArgs(Expense e) => {
  'p_id': e.id,
  'p_trip_id': e.tripId,
  'p_title': e.title,
  'p_amount': e.amount,
  'p_currency': e.currency,
  'p_category': e.category,
  'p_date': e.date,
  'p_paid_by': e.paidBy,
  'p_split_mode': e.splitMode,
  'p_split_member_ids': e.splitMemberIds,
  'p_split_config': e.splitConfig,
  'p_resolved_shares': e.resolvedShares,
  'p_receipt_path': e.receiptPath,
  'p_paid_by_shares': e.paidByShares,
  'p_itemized_config': e.itemizedConfig?.toJson(),
  'p_location': e.location == null ? null : {'lat': e.location!.lat, 'lng': e.location!.lng},
  'p_approval_status': e.approvalStatus,
};

/// Real `trip_messages` row (member_id/body/kind/payload) -> domain.
TripMessage messageFromRow(Map<String, dynamic> r) => TripMessage.fromJson({
  'id': r['id'],
  'tripId': r['trip_id'],
  'memberId': r['member_id'],
  'body': r['body'],
  'eventKind': r['kind'],
  'payload': _map(r['payload']),
  'createdAt': _ms(r['created_at']),
  'editedAt': _msOrNull(r['edited_at']),
  'deletedAt': _msOrNull(r['deleted_at']),
  'replyToId': r['reply_to_id'],
  'reactions': r['reactions'] is Map ? r['reactions'] : <String, dynamic>{},
  'isPinned': r['is_pinned'] == true,
});
