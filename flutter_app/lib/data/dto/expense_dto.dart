import '../../domain/models/expense.dart';

class ExpenseDto {
  final String id;
  final String tripId;
  final String title;
  final double amount;
  final String currency;
  final String categoryId;
  final String paidByMemberId;
  final String splitMode;
  final Map<String, dynamic> splitData;
  final String date;
  final String? receiptUrl;
  final String? notes;
  final bool isReimbursement;
  final String? reimbursementToMemberId;
  final bool archived;
  final String? recycledAt;
  final Map<String, dynamic>? payerWeights;
  final double? exchangeRate;
  final String? disputeStatus;
  final String? disputeNote;
  final String? disputedByMemberId;
  final bool settlementConfirmed;
  final String? settlementConfirmedAt;
  final String? approvalStatus;
  final String? approvedByMemberId;
  final String? approvedAt;
  final String? createdAt;
  final String? updatedAt;

  const ExpenseDto({
    required this.id,
    required this.tripId,
    required this.title,
    required this.amount,
    required this.currency,
    required this.categoryId,
    required this.paidByMemberId,
    required this.splitMode,
    this.splitData = const {},
    required this.date,
    this.receiptUrl,
    this.notes,
    this.isReimbursement = false,
    this.reimbursementToMemberId,
    this.archived = false,
    this.recycledAt,
    this.payerWeights,
    this.exchangeRate,
    this.disputeStatus,
    this.disputeNote,
    this.disputedByMemberId,
    this.settlementConfirmed = false,
    this.settlementConfirmedAt,
    this.approvalStatus,
    this.approvedByMemberId,
    this.approvedAt,
    this.createdAt,
    this.updatedAt,
  });

  factory ExpenseDto.fromPostgresJson(Map<String, dynamic> json) {
    return ExpenseDto(
      id: json['id'] as String,
      tripId: (json['trip_id'] ?? json['tripId'] ?? '') as String,
      title: json['title'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'USD',
      categoryId: (json['category_id'] ?? json['category'] ?? json['categoryId'] ?? 'Misc') as String,
      paidByMemberId: (json['paid_by_member_id'] ?? json['paid_by'] ?? json['paidBy'] ?? json['paidByMemberId'] ?? '') as String,
      splitMode: (json['split_mode'] ?? json['splitMode'] ?? 'equal') as String,
      splitData: (json['split_data'] ?? json['splitConfig'] ?? json['split_config']) as Map<String, dynamic>? ?? const {},
      date: json['date'] as String? ?? '',
      receiptUrl: (json['receipt_url'] ?? json['receipt_path'] ?? json['receiptPath']) as String?,
      notes: json['notes'] as String?,
      isReimbursement: (json['is_reimbursement'] ?? json['is_settlement'] ?? json['isSettlement']) as bool? ?? false,
      reimbursementToMemberId: (json['reimbursement_to_member_id'] ?? json['reimbursementToMemberId']) as String?,
      archived: (json['archived'] ?? (json['deleted_at'] != null)) as bool? ?? false,
      recycledAt: (json['recycled_at'] ?? json['deleted_at']) as String?,
      payerWeights: (json['payer_weights'] ?? json['paid_by_shares']) as Map<String, dynamic>?,
      exchangeRate: (json['exchange_rate'] ?? json['exchangeRate']) as double?,
      disputeStatus: (json['dispute_status'] ?? (json['disputed_at'] != null ? 'flagged' : null)) as String?,
      disputeNote: (json['dispute_note'] ?? json['disputeNote']) as String?,
      disputedByMemberId: (json['disputed_by_member_id'] ?? json['disputed_by_user_id']) as String?,
      settlementConfirmed: (json['settlement_confirmed'] ?? (json['settlement_confirmed_at'] != null)) as bool? ?? false,
      settlementConfirmedAt: json['settlement_confirmed_at'] as String?,
      approvalStatus: (json['approval_status'] ?? json['approvalStatus']) as String?,
      approvedByMemberId: (json['approved_by_member_id'] ?? json['approved_by_user_id']) as String?,
      approvedAt: json['approved_at'] as String?,
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toPostgresJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'title': title,
      'amount': amount,
      'currency': currency,
      'category_id': categoryId,
      'paid_by_member_id': paidByMemberId,
      'split_mode': splitMode,
      'split_data': splitData,
      'date': date,
      'receipt_url': receiptUrl,
      'notes': notes,
      'is_reimbursement': isReimbursement,
      'reimbursement_to_member_id': reimbursementToMemberId,
      'archived': archived,
      'recycled_at': recycledAt,
      'payer_weights': payerWeights,
      'exchange_rate': exchangeRate,
      'dispute_status': disputeStatus,
      'dispute_note': disputeNote,
      'disputed_by_member_id': disputedByMemberId,
      'settlement_confirmed': settlementConfirmed,
      'settlement_confirmed_at': settlementConfirmedAt,
      'approval_status': approvalStatus,
      'approved_by_member_id': approvedByMemberId,
      'approved_at': approvedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    };
  }

  Expense toDomain({
    List<String> splitMemberIds = const [],
    Map<String, double> resolvedShares = const {},
    String? createdByUserId,
  }) {
    return Expense(
      id: id,
      tripId: tripId,
      title: title,
      amount: amount,
      currency: currency,
      category: categoryId,
      date: date,
      paidBy: paidByMemberId,
      paidByShares: payerWeights?.map((k, v) => MapEntry(k, (v as num).toDouble())),
      splitMode: splitMode,
      splitMemberIds: splitMemberIds,
      splitConfig: splitData.map((k, v) => MapEntry(k, (v as num).toDouble())),
      resolvedShares: resolvedShares,
      receiptPath: receiptUrl,
      isSettlement: isReimbursement,
      settlementConfirmedAt: settlementConfirmedAt != null ? DateTime.tryParse(settlementConfirmedAt!)?.millisecondsSinceEpoch : null,
      approvalStatus: approvalStatus ?? 'confirmed',
      createdByUserId: createdByUserId,
      deletedAt: recycledAt != null ? DateTime.tryParse(recycledAt!)?.millisecondsSinceEpoch : null,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!)?.millisecondsSinceEpoch ?? 0) : 0,
      updatedAt: updatedAt != null ? (DateTime.tryParse(updatedAt!)?.millisecondsSinceEpoch ?? 0) : 0,
    );
  }

  factory ExpenseDto.fromDomain(Expense expense) {
    return ExpenseDto(
      id: expense.id,
      tripId: expense.tripId,
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      categoryId: expense.category,
      paidByMemberId: expense.paidBy,
      splitMode: expense.splitMode,
      splitData: expense.splitConfig ?? const {},
      date: expense.date,
      receiptUrl: expense.receiptPath,
      isReimbursement: expense.isSettlement,
      archived: expense.deletedAt != null,
      recycledAt: expense.deletedAt != null ? DateTime.fromMillisecondsSinceEpoch(expense.deletedAt!).toIso8601String() : null,
      payerWeights: expense.paidByShares,
      disputeNote: expense.disputeNote,
      disputedByMemberId: expense.disputedByUserId,
      settlementConfirmed: expense.settlementConfirmedAt != null,
      settlementConfirmedAt: expense.settlementConfirmedAt != null ? DateTime.fromMillisecondsSinceEpoch(expense.settlementConfirmedAt!).toIso8601String() : null,
      approvalStatus: expense.approvalStatus,
      approvedByMemberId: expense.approvedByUserId,
      createdAt: DateTime.fromMillisecondsSinceEpoch(expense.createdAt).toIso8601String(),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(expense.updatedAt).toIso8601String(),
    );
  }
}
