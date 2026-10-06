import 'checklist_item.dart';
import 'trip_note.dart';
import 'travel_pass.dart';

class TripStop {
  final String id;
  final String name;
  final double? lat;
  final double? lng;

  const TripStop({
    required this.id,
    required this.name,
    this.lat,
    this.lng,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      };

  factory TripStop.fromJson(Map<String, dynamic> json) => TripStop(
        id: json['id'] as String,
        name: json['name'] as String,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}

class TripFxConfig {
  final Map<String, double> customRates;
  final double markupPercent;

  const TripFxConfig({
    this.customRates = const {},
    this.markupPercent = 0.0,
  });

  Map<String, dynamic> toJson() => {
        'customRates': customRates,
        'markupPercent': markupPercent,
      };

  factory TripFxConfig.fromJson(Map<String, dynamic> json) => TripFxConfig(
        customRates: (json['customRates'] as Map<String, dynamic>?)?.map(
              (k, v) => MapEntry(k, (v as num).toDouble()),
            ) ??
            const {},
        markupPercent: (json['markupPercent'] as num?)?.toDouble() ?? 0.0,
      );
}

class Trip {
  final String id;
  final String name;
  final String startDate;
  final String endDate;
  final String baseCurrency;
  final String? destination;
  final String ownerId;
  final String joinCode;
  final List<String> memberIds;
  final List<String> groupIds;
  final List<String> adminMemberIds;
  final Map<String, String> memberRoles; // memberId -> 'organizer' | 'contributor' | 'viewer'
  final Map<String, List<String>> splitExclusionDefaults;
  final List<String>? categoryOrder;
  final bool simplifyDebts;
  final bool archived;
  final bool frozen;
  final bool closed;
  final List<TripStop> stops;
  final List<ChecklistItem> checklist;
  final List<TripNote> notes;
  final List<TravelPass> passes;
  final TripFxConfig? fxConfig;
  final int expenseCount;
  final String? shareToken;
  final bool shareEnabled;
  final String? shareExpiresAt;
  final int shareViewCount;
  final double? approvalThreshold;
  final String? coverImageUrl;
  final int createdAt;
  final int updatedAt;

  const Trip({
    required this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.baseCurrency,
    this.destination,
    required this.ownerId,
    required this.joinCode,
    this.memberIds = const [],
    this.groupIds = const [],
    this.adminMemberIds = const [],
    this.memberRoles = const {},
    this.splitExclusionDefaults = const {},
    this.categoryOrder,
    this.simplifyDebts = true,
    this.archived = false,
    this.frozen = false,
    this.closed = false,
    this.stops = const [],
    this.checklist = const [],
    this.notes = const [],
    this.passes = const [],
    this.fxConfig,
    this.expenseCount = 0,
    this.shareToken,
    this.shareEnabled = false,
    this.shareExpiresAt,
    this.shareViewCount = 0,
    this.approvalThreshold,
    this.coverImageUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  Trip copyWith({
    String? id,
    String? name,
    String? startDate,
    String? endDate,
    String? baseCurrency,
    String? destination,
    String? ownerId,
    String? joinCode,
    List<String>? memberIds,
    List<String>? groupIds,
    List<String>? adminMemberIds,
    Map<String, String>? memberRoles,
    Map<String, List<String>>? splitExclusionDefaults,
    List<String>? categoryOrder,
    bool? simplifyDebts,
    bool? archived,
    bool? frozen,
    bool? closed,
    List<TripStop>? stops,
    List<ChecklistItem>? checklist,
    List<TripNote>? notes,
    List<TravelPass>? passes,
    TripFxConfig? fxConfig,
    int? expenseCount,
    String? shareToken,
    bool? shareEnabled,
    String? shareExpiresAt,
    int? shareViewCount,
    double? approvalThreshold,
    String? coverImageUrl,
    int? createdAt,
    int? updatedAt,
  }) {
    return Trip(
      id: id ?? this.id,
      name: name ?? this.name,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      baseCurrency: baseCurrency ?? this.baseCurrency,
      destination: destination ?? this.destination,
      ownerId: ownerId ?? this.ownerId,
      joinCode: joinCode ?? this.joinCode,
      memberIds: memberIds ?? this.memberIds,
      groupIds: groupIds ?? this.groupIds,
      adminMemberIds: adminMemberIds ?? this.adminMemberIds,
      memberRoles: memberRoles ?? this.memberRoles,
      splitExclusionDefaults: splitExclusionDefaults ?? this.splitExclusionDefaults,
      categoryOrder: categoryOrder ?? this.categoryOrder,
      simplifyDebts: simplifyDebts ?? this.simplifyDebts,
      archived: archived ?? this.archived,
      frozen: frozen ?? this.frozen,
      closed: closed ?? this.closed,
      stops: stops ?? this.stops,
      checklist: checklist ?? this.checklist,
      notes: notes ?? this.notes,
      passes: passes ?? this.passes,
      fxConfig: fxConfig ?? this.fxConfig,
      expenseCount: expenseCount ?? this.expenseCount,
      shareToken: shareToken ?? this.shareToken,
      shareEnabled: shareEnabled ?? this.shareEnabled,
      shareExpiresAt: shareExpiresAt ?? this.shareExpiresAt,
      shareViewCount: shareViewCount ?? this.shareViewCount,
      approvalThreshold: approvalThreshold ?? this.approvalThreshold,
      coverImageUrl: coverImageUrl ?? this.coverImageUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'startDate': startDate,
      'endDate': endDate,
      'baseCurrency': baseCurrency,
      if (destination != null) 'destination': destination,
      'ownerId': ownerId,
      'joinCode': joinCode,
      'memberIds': memberIds,
      'groupIds': groupIds,
      'adminMemberIds': adminMemberIds,
      'memberRoles': memberRoles,
      'splitExclusionDefaults': splitExclusionDefaults,
      if (categoryOrder != null) 'categoryOrder': categoryOrder,
      'simplifyDebts': simplifyDebts,
      'archived': archived,
      'frozen': frozen,
      'closed': closed,
      'stops': stops.map((s) => s.toJson()).toList(),
      'checklist': checklist.map((c) => c.toJson()).toList(),
      'notes': notes.map((n) => n.toJson()).toList(),
      'passes': passes.map((p) => p.toJson()).toList(),
      if (fxConfig != null) 'fxConfig': fxConfig!.toJson(),
      'expenseCount': expenseCount,
      if (shareToken != null) 'shareToken': shareToken,
      'shareEnabled': shareEnabled,
      if (shareExpiresAt != null) 'shareExpiresAt': shareExpiresAt,
      'shareViewCount': shareViewCount,
      if (approvalThreshold != null) 'approvalThreshold': approvalThreshold,
      if (coverImageUrl != null) 'coverImageUrl': coverImageUrl,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'] as String,
      name: json['name'] as String,
      startDate: json['startDate'] as String? ?? '',
      endDate: json['endDate'] as String? ?? '',
      baseCurrency: json['baseCurrency'] as String? ?? 'INR',
      destination: json['destination'] as String?,
      ownerId: json['ownerId'] as String? ?? '',
      joinCode: json['joinCode'] as String? ?? '',
      memberIds: (json['memberIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      groupIds: (json['groupIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      adminMemberIds: (json['adminMemberIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      memberRoles: (json['memberRoles'] as Map<String, dynamic>?)?.map((k, v) => MapEntry(k, v.toString())) ?? const {},
      splitExclusionDefaults: (json['splitExclusionDefaults'] as Map<String, dynamic>?)?.map(
            (k, v) => MapEntry(k, (v as List<dynamic>).map((e) => e.toString()).toList()),
          ) ??
          const {},
      categoryOrder: (json['categoryOrder'] as List<dynamic>?)?.map((e) => e.toString()).toList(),
      simplifyDebts: json['simplifyDebts'] as bool? ?? true,
      archived: json['archived'] as bool? ?? false,
      frozen: json['frozen'] as bool? ?? false,
      closed: json['closed'] as bool? ?? false,
      stops: (json['stops'] as List<dynamic>?)?.map((e) => TripStop.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      checklist: (json['checklist'] as List<dynamic>?)?.map((e) => ChecklistItem.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      notes: (json['notes'] as List<dynamic>?)?.map((e) => TripNote.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      passes: (json['passes'] as List<dynamic>?)?.map((e) => TravelPass.fromJson(e as Map<String, dynamic>)).toList() ?? const [],
      fxConfig: json['fxConfig'] != null ? TripFxConfig.fromJson(json['fxConfig'] as Map<String, dynamic>) : null,
      expenseCount: (json['expenseCount'] as num?)?.toInt() ?? 0,
      shareToken: json['shareToken'] as String?,
      shareEnabled: json['shareEnabled'] as bool? ?? false,
      shareExpiresAt: json['shareExpiresAt'] as String?,
      shareViewCount: (json['shareViewCount'] as num?)?.toInt() ?? 0,
      approvalThreshold: (json['approvalThreshold'] as num?)?.toDouble(),
      coverImageUrl: json['coverImageUrl'] as String?,
      createdAt: (json['createdAt'] is String)
          ? DateTime.tryParse(json['createdAt'] as String)?.millisecondsSinceEpoch ?? 0
          : (json['createdAt'] as num?)?.toInt() ?? 0,
      updatedAt: (json['updatedAt'] is String)
          ? DateTime.tryParse(json['updatedAt'] as String)?.millisecondsSinceEpoch ?? 0
          : (json['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }
}
