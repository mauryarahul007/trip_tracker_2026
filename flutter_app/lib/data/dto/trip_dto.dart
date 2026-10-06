import '../../domain/models/trip.dart';
import '../../domain/models/checklist_item.dart';
import '../../domain/models/trip_note.dart';
import '../../domain/models/travel_pass.dart';

class TripDto {
  final String id;
  final String name;
  final String startDate;
  final String endDate;
  final String baseCurrency;
  final String ownerId;
  final String joinCode;
  final bool archived;
  final bool frozen;
  final bool closed;
  final String? destination;
  final List<dynamic> stops;
  final List<dynamic> checklist;
  final List<dynamic> notes;
  final List<dynamic> passes;
  final Map<String, dynamic>? fxConfig;
  final Map<String, dynamic> memberRoles;
  final Map<String, dynamic> splitExclusionDefaults;
  final List<dynamic>? categoryOrder;
  final String? shareToken;
  final bool shareEnabled;
  final String? shareExpiresAt;
  final int shareViewCount;
  final String? closeoutPulse;
  final int? closeoutPulseAt;
  final int? splitwiseImportedAt;
  final int? splitwiseImportCount;
  final double? approvalThreshold;
  final String? createdAt;
  final String? updatedAt;

  const TripDto({
    required this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.baseCurrency,
    required this.ownerId,
    required this.joinCode,
    this.archived = false,
    this.frozen = false,
    this.closed = false,
    this.destination,
    this.stops = const [],
    this.checklist = const [],
    this.notes = const [],
    this.passes = const [],
    this.fxConfig,
    this.memberRoles = const {},
    this.splitExclusionDefaults = const {},
    this.categoryOrder,
    this.shareToken,
    this.shareEnabled = false,
    this.shareExpiresAt,
    this.shareViewCount = 0,
    this.closeoutPulse,
    this.closeoutPulseAt,
    this.splitwiseImportedAt,
    this.splitwiseImportCount,
    this.approvalThreshold,
    this.createdAt,
    this.updatedAt,
  });

  factory TripDto.fromPostgresJson(Map<String, dynamic> json) {
    return TripDto(
      id: json['id'] as String,
      name: json['name'] as String,
      startDate: json['start_date'] as String? ?? '',
      endDate: json['end_date'] as String? ?? '',
      baseCurrency: json['base_currency'] as String? ?? 'USD',
      ownerId: json['owner_id'] as String? ?? '',
      joinCode: json['join_code'] as String? ?? '',
      archived: json['archived'] as bool? ?? false,
      frozen: json['frozen'] as bool? ?? false,
      closed: json['closed'] as bool? ?? false,
      destination: json['destination'] as String?,
      stops: (json['stops'] as List<dynamic>?) ?? const [],
      checklist: (json['checklist'] as List<dynamic>?) ?? const [],
      notes: (json['notes'] as List<dynamic>?) ?? const [],
      passes: (json['passes'] as List<dynamic>?) ?? const [],
      fxConfig: json['fx_config'] as Map<String, dynamic>?,
      memberRoles: (json['member_roles'] as Map<String, dynamic>?) ?? const {},
      splitExclusionDefaults: (json['split_exclusion_defaults'] as Map<String, dynamic>?) ?? const {},
      categoryOrder: json['category_order'] as List<dynamic>?,
      shareToken: json['share_token'] as String?,
      shareEnabled: json['share_enabled'] as bool? ?? false,
      shareExpiresAt: json['share_expires_at'] as String?,
      shareViewCount: (json['share_view_count'] as num?)?.toInt() ?? 0,
      closeoutPulse: json['closeout_pulse'] as String?,
      closeoutPulseAt: (json['closeout_pulse_at'] as num?)?.toInt(),
      splitwiseImportedAt: (json['splitwise_imported_at'] as num?)?.toInt(),
      splitwiseImportCount: (json['splitwise_import_count'] as num?)?.toInt(),
      approvalThreshold: (json['approval_threshold'] as num?)?.toDouble(),
      createdAt: json['created_at'] as String?,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toPostgresJson() {
    return {
      'id': id,
      'name': name,
      'start_date': startDate,
      'end_date': endDate,
      'base_currency': baseCurrency,
      'owner_id': ownerId,
      'join_code': joinCode,
      'archived': archived,
      'frozen': frozen,
      'closed': closed,
      'destination': destination,
      'stops': stops,
      'checklist': checklist,
      'notes': notes,
      'passes': passes,
      'fx_config': fxConfig,
      'member_roles': memberRoles,
      'split_exclusion_defaults': splitExclusionDefaults,
      'category_order': categoryOrder,
      'share_token': shareToken,
      'share_enabled': shareEnabled,
      'share_expires_at': shareExpiresAt,
      'share_view_count': shareViewCount,
      'closeout_pulse': closeoutPulse,
      'closeout_pulse_at': closeoutPulseAt,
      'splitwise_imported_at': splitwiseImportedAt,
      'splitwise_import_count': splitwiseImportCount,
      'approval_threshold': approvalThreshold,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    };
  }

  Trip toDomain({List<String> memberIds = const [], List<String> groupIds = const []}) {
    return Trip(
      id: id,
      name: name,
      startDate: startDate,
      endDate: endDate,
      baseCurrency: baseCurrency,
      ownerId: ownerId,
      joinCode: joinCode,
      archived: archived,
      frozen: frozen,
      closed: closed,
      destination: destination,
      memberIds: memberIds,
      groupIds: groupIds,
      stops: stops.map((s) => TripStop.fromJson(s as Map<String, dynamic>)).toList(),
      checklist: checklist.map((c) => ChecklistItem.fromJson(c as Map<String, dynamic>)).toList(),
      notes: notes.map((n) => TripNote.fromJson(n as Map<String, dynamic>)).toList(),
      passes: passes.map((p) => TravelPass.fromJson(p as Map<String, dynamic>)).toList(),
      fxConfig: fxConfig != null ? TripFxConfig.fromJson(fxConfig!) : null,
      memberRoles: memberRoles.map((k, v) => MapEntry(k, v.toString())),
      splitExclusionDefaults: splitExclusionDefaults.map(
        (k, v) => MapEntry(k, (v as List<dynamic>).map((e) => e.toString()).toList()),
      ),
      categoryOrder: categoryOrder?.map((e) => e.toString()).toList(),
      shareToken: shareToken,
      shareEnabled: shareEnabled,
      shareExpiresAt: shareExpiresAt,
      shareViewCount: shareViewCount,
      approvalThreshold: approvalThreshold,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!)?.millisecondsSinceEpoch ?? 0) : 0,
      updatedAt: updatedAt != null ? (DateTime.tryParse(updatedAt!)?.millisecondsSinceEpoch ?? 0) : 0,
    );
  }

  factory TripDto.fromDomain(Trip trip) {
    return TripDto(
      id: trip.id,
      name: trip.name,
      startDate: trip.startDate,
      endDate: trip.endDate,
      baseCurrency: trip.baseCurrency,
      ownerId: trip.ownerId,
      joinCode: trip.joinCode,
      archived: trip.archived,
      frozen: trip.frozen,
      closed: trip.closed,
      destination: trip.destination,
      stops: trip.stops.map((s) => s.toJson()).toList(),
      checklist: trip.checklist.map((c) => c.toJson()).toList(),
      notes: trip.notes.map((n) => n.toJson()).toList(),
      passes: trip.passes.map((p) => p.toJson()).toList(),
      fxConfig: trip.fxConfig?.toJson(),
      memberRoles: trip.memberRoles,
      splitExclusionDefaults: trip.splitExclusionDefaults,
      categoryOrder: trip.categoryOrder,
      shareToken: trip.shareToken,
      shareEnabled: trip.shareEnabled,
      shareExpiresAt: trip.shareExpiresAt,
      shareViewCount: trip.shareViewCount,
      approvalThreshold: trip.approvalThreshold,
      createdAt: DateTime.fromMillisecondsSinceEpoch(trip.createdAt).toIso8601String(),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(trip.updatedAt).toIso8601String(),
    );
  }
}
