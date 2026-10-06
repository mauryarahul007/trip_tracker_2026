class ExpenseLocation {
  final double lat;
  final double lng;
  final String? placeName;
  final String? pendingName;
  final bool? locationUnresolved;

  const ExpenseLocation({
    required this.lat,
    required this.lng,
    this.placeName,
    this.pendingName,
    this.locationUnresolved,
  });

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    if (placeName != null) 'placeName': placeName,
    if (pendingName != null) 'pendingName': pendingName,
    if (locationUnresolved != null) 'locationUnresolved': locationUnresolved,
  };

  factory ExpenseLocation.fromJson(Map<String, dynamic> json) => ExpenseLocation(
    lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
    lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
    placeName: json['placeName'] as String?,
    pendingName: json['pendingName'] as String?,
    locationUnresolved: json['locationUnresolved'] as bool?,
  );
}

class ReceiptItem {
  final String id;
  final String name;
  final double amount;
  final List<String> assignedMemberIds;

  const ReceiptItem({required this.id, required this.name, required this.amount, this.assignedMemberIds = const []});

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'amount': amount, 'assignedMemberIds': assignedMemberIds};

  factory ReceiptItem.fromJson(Map<String, dynamic> json) => ReceiptItem(
    id: json['id'] as String,
    name: json['name'] as String,
    amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
    assignedMemberIds: (json['assignedMemberIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
  );
}

class ItemizedReceiptConfig {
  final List<ReceiptItem> items;
  final double? tax;
  final double? tip;
  final double? discount;

  const ItemizedReceiptConfig({this.items = const [], this.tax, this.tip, this.discount});

  Map<String, dynamic> toJson() => {
    'items': items.map((i) => i.toJson()).toList(),
    if (tax != null) 'tax': tax,
    if (tip != null) 'tip': tip,
    if (discount != null) 'discount': discount,
  };

  factory ItemizedReceiptConfig.fromJson(Map<String, dynamic> json) => ItemizedReceiptConfig(
    items:
        (json['items'] as List<dynamic>?)?.map((e) => ReceiptItem.fromJson(e as Map<String, dynamic>)).toList() ??
        const [],
    tax: (json['tax'] as num?)?.toDouble(),
    tip: (json['tip'] as num?)?.toDouble(),
    discount: (json['discount'] as num?)?.toDouble(),
  );
}

class Expense {
  final String id;
  final String tripId;
  final String title;
  final double amount;
  final String currency;
  final String category;
  final String date;
  final String paidBy; // Primary payer memberId
  final Map<String, double>? paidByShares;
  final String splitMode; // 'equal' | 'equalUnit' | 'custom' | 'exact' | 'percentage' | 'itemized'
  final List<String> splitMemberIds;
  final Map<String, double>? splitConfig;
  final ItemizedReceiptConfig? itemizedConfig;
  final Map<String, double> resolvedShares;
  final String? receiptImage;
  final String? receiptPath;
  final List<String>? photoPaths;
  final int? disputedAt;
  final String? disputedByUserId;
  final String? disputeNote;
  final bool isSettlement;
  final int? settlementConfirmedAt;
  final String? settlementConfirmedByUserId;
  final String approvalStatus; // 'confirmed' | 'pending_approval'
  final String? approvedByUserId;
  final String? createdByUserId;
  final ExpenseLocation? location;
  final int? deletedAt;
  final String? deletedByUserId;
  final int createdAt;
  final int updatedAt;

  const Expense({
    required this.id,
    required this.tripId,
    required this.title,
    required this.amount,
    required this.currency,
    required this.category,
    required this.date,
    required this.paidBy,
    this.paidByShares,
    required this.splitMode,
    this.splitMemberIds = const [],
    this.splitConfig,
    this.itemizedConfig,
    this.resolvedShares = const {},
    this.receiptImage,
    this.receiptPath,
    this.photoPaths,
    this.disputedAt,
    this.disputedByUserId,
    this.disputeNote,
    this.isSettlement = false,
    this.settlementConfirmedAt,
    this.settlementConfirmedByUserId,
    this.approvalStatus = 'confirmed',
    this.approvedByUserId,
    this.createdByUserId,
    this.location,
    this.deletedAt,
    this.deletedByUserId,
    required this.createdAt,
    required this.updatedAt,
  });

  Expense copyWith({
    String? id,
    String? tripId,
    String? title,
    double? amount,
    String? currency,
    String? category,
    String? date,
    String? paidBy,
    Map<String, double>? paidByShares,
    String? splitMode,
    List<String>? splitMemberIds,
    Map<String, double>? splitConfig,
    ItemizedReceiptConfig? itemizedConfig,
    Map<String, double>? resolvedShares,
    String? receiptImage,
    String? receiptPath,
    List<String>? photoPaths,
    int? disputedAt,
    String? disputedByUserId,
    String? disputeNote,
    bool? isSettlement,
    int? settlementConfirmedAt,
    String? settlementConfirmedByUserId,
    String? approvalStatus,
    String? approvedByUserId,
    String? createdByUserId,
    ExpenseLocation? location,
    int? deletedAt,
    String? deletedByUserId,
    bool clearDeleted = false,
    bool clearDispute = false,
    int? createdAt,
    int? updatedAt,
  }) {
    return Expense(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      title: title ?? this.title,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      category: category ?? this.category,
      date: date ?? this.date,
      paidBy: paidBy ?? this.paidBy,
      paidByShares: paidByShares ?? this.paidByShares,
      splitMode: splitMode ?? this.splitMode,
      splitMemberIds: splitMemberIds ?? this.splitMemberIds,
      splitConfig: splitConfig ?? this.splitConfig,
      itemizedConfig: itemizedConfig ?? this.itemizedConfig,
      resolvedShares: resolvedShares ?? this.resolvedShares,
      receiptImage: receiptImage ?? this.receiptImage,
      receiptPath: receiptPath ?? this.receiptPath,
      photoPaths: photoPaths ?? this.photoPaths,
      disputedAt: clearDispute ? null : (disputedAt ?? this.disputedAt),
      disputedByUserId: clearDispute ? null : (disputedByUserId ?? this.disputedByUserId),
      disputeNote: clearDispute ? null : (disputeNote ?? this.disputeNote),
      isSettlement: isSettlement ?? this.isSettlement,
      settlementConfirmedAt: settlementConfirmedAt ?? this.settlementConfirmedAt,
      settlementConfirmedByUserId: settlementConfirmedByUserId ?? this.settlementConfirmedByUserId,
      approvalStatus: approvalStatus ?? this.approvalStatus,
      approvedByUserId: approvedByUserId ?? this.approvedByUserId,
      createdByUserId: createdByUserId ?? this.createdByUserId,
      location: location ?? this.location,
      deletedAt: clearDeleted ? null : (deletedAt ?? this.deletedAt),
      deletedByUserId: clearDeleted ? null : (deletedByUserId ?? this.deletedByUserId),
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tripId': tripId,
      'title': title,
      'amount': amount,
      'currency': currency,
      'category': category,
      'date': date,
      'paidBy': paidBy,
      if (paidByShares != null) 'paidByShares': paidByShares,
      'splitMode': splitMode,
      'splitMemberIds': splitMemberIds,
      if (splitConfig != null) 'splitConfig': splitConfig,
      if (itemizedConfig != null) 'itemizedConfig': itemizedConfig!.toJson(),
      'resolvedShares': resolvedShares,
      if (receiptImage != null) 'receiptImage': receiptImage,
      if (receiptPath != null) 'receiptPath': receiptPath,
      if (photoPaths != null) 'photoPaths': photoPaths,
      if (disputedAt != null) 'disputedAt': disputedAt,
      if (disputedByUserId != null) 'disputedByUserId': disputedByUserId,
      if (disputeNote != null) 'disputeNote': disputeNote,
      'isSettlement': isSettlement,
      if (settlementConfirmedAt != null) 'settlementConfirmedAt': settlementConfirmedAt,
      if (settlementConfirmedByUserId != null) 'settlementConfirmedByUserId': settlementConfirmedByUserId,
      'approvalStatus': approvalStatus,
      if (approvedByUserId != null) 'approvedByUserId': approvedByUserId,
      if (createdByUserId != null) 'createdByUserId': createdByUserId,
      if (location != null) 'location': location!.toJson(),
      if (deletedAt != null) 'deletedAt': deletedAt,
      if (deletedByUserId != null) 'deletedByUserId': deletedByUserId,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'] as String,
      tripId: (json['tripId'] ?? json['trip_id'] ?? '') as String,
      title: json['title'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'INR',
      category: (json['category'] ?? json['categoryId'] ?? json['category_id'] ?? 'Misc') as String,
      date: json['date'] as String? ?? '',
      paidBy:
          (json['paidBy'] ?? json['paidByMemberId'] ?? json['paid_by'] ?? json['paid_by_member_id'] ?? '') as String,
      paidByShares: (json['paidByShares'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, (v as num).toDouble())),
      splitMode: (json['splitMode'] ?? json['split_mode'] ?? 'equal') as String,
      splitMemberIds: (json['splitMemberIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      splitConfig: (json['splitConfig'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, (v as num).toDouble())),
      itemizedConfig: json['itemizedConfig'] != null
          ? ItemizedReceiptConfig.fromJson(json['itemizedConfig'] as Map<String, dynamic>)
          : null,
      resolvedShares:
          (json['resolvedShares'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, (v as num).toDouble())) ??
          const {},
      receiptImage: json['receiptImage'] as String?,
      receiptPath: (json['receiptPath'] ?? json['receiptUrl'] ?? json['receipt_url']) as String?,
      photoPaths: (json['photoPaths'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      disputedAt: (json['disputedAt'] is String)
          ? DateTime.tryParse(json['disputedAt'] as String)?.millisecondsSinceEpoch
          : (json['disputedAt'] as num?)?.toInt(),
      disputedByUserId: json['disputedByUserId'] as String?,
      disputeNote: json['disputeNote'] as String?,
      isSettlement: (json['isSettlement'] ?? json['isReimbursement'] ?? json['is_settlement']) as bool? ?? false,
      settlementConfirmedAt: (json['settlementConfirmedAt'] is String)
          ? DateTime.tryParse(json['settlementConfirmedAt'] as String)?.millisecondsSinceEpoch
          : (json['settlementConfirmedAt'] as num?)?.toInt(),
      settlementConfirmedByUserId: json['settlementConfirmedByUserId'] as String?,
      approvalStatus: (json['approvalStatus'] ?? json['approval_status'] ?? 'confirmed') as String,
      approvedByUserId: json['approvedByUserId'] as String?,
      createdByUserId: (json['createdByUserId'] ?? json['created_by_user_id']) as String?,
      location: json['location'] != null ? ExpenseLocation.fromJson(json['location'] as Map<String, dynamic>) : null,
      deletedAt: (json['deletedAt'] is String)
          ? DateTime.tryParse(json['deletedAt'] as String)?.millisecondsSinceEpoch
          : (json['deletedAt'] as num?)?.toInt(),
      deletedByUserId: json['deletedByUserId'] as String?,
      createdAt: (json['createdAt'] is String)
          ? DateTime.tryParse(json['createdAt'] as String)?.millisecondsSinceEpoch ?? 0
          : (json['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (json['updatedAt'] is String)
          ? DateTime.tryParse(json['updatedAt'] as String)?.millisecondsSinceEpoch ?? 0
          : (json['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }
}
