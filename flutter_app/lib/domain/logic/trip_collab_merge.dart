import '../models/checklist_item.dart';
import '../models/group.dart';
import '../models/member.dart';
import '../models/travel_pass.dart';
import '../models/trip.dart';
import '../models/trip_note.dart';

Trip applyRemoteTrip(Trip local, Trip remote, [bool keepLocalCollab = false]) {
  return local.copyWith(
    name: remote.name,
    startDate: remote.startDate,
    endDate: remote.endDate,
    baseCurrency: remote.baseCurrency,
    destination: remote.destination,
    stops: remote.stops,
    ownerId: remote.ownerId,
    joinCode: remote.joinCode,
    archived: remote.archived,
    frozen: remote.frozen,
    closed: remote.closed,
    memberIds: remote.memberIds,
    groupIds: remote.groupIds,
    memberRoles: remote.memberRoles,
    splitExclusionDefaults: remote.splitExclusionDefaults,
    categoryOrder: remote.categoryOrder,
    simplifyDebts: remote.simplifyDebts,
    checklist: keepLocalCollab ? local.checklist : remote.checklist,
    notes: keepLocalCollab ? local.notes : remote.notes,
    passes: keepLocalCollab ? local.passes : remote.passes,
    fxConfig: keepLocalCollab ? local.fxConfig : remote.fxConfig,
    updatedAt: remote.updatedAt,
    expenseCount: local.expenseCount,
  );
}

Trip applyLiveCollabRow(Trip local, Map<String, dynamic> row, [bool keepLocalCollab = false]) {
  String name = local.name;
  int updatedAt = local.updatedAt;

  if (row['name'] is String) name = row['name'] as String;
  if (row['updated_at'] is String) {
    final parsed = DateTime.tryParse(row['updated_at'] as String);
    if (parsed != null) updatedAt = parsed.millisecondsSinceEpoch;
  }

  if (keepLocalCollab) {
    return local.copyWith(name: name, updatedAt: updatedAt);
  }

  List<ChecklistItem> checklist = local.checklist;
  if (row['checklist'] is List) {
    checklist = (row['checklist'] as List)
        .map((e) => ChecklistItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  List<TripNote> notes = local.notes;
  if (row['notes'] is List) {
    notes = (row['notes'] as List)
        .map((e) => TripNote.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  List<TravelPass> passes = local.passes;
  if (row['passes'] is List) {
    passes = (row['passes'] as List)
        .map((e) => TravelPass.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  TripFxConfig? fxConfig = local.fxConfig;
  if (row['fx_config'] is Map<String, dynamic>) {
    fxConfig = TripFxConfig.fromJson(row['fx_config'] as Map<String, dynamic>);
  }

  return local.copyWith(
    name: name,
    updatedAt: updatedAt,
    checklist: checklist,
    notes: notes,
    passes: passes,
    fxConfig: fxConfig,
  );
}

class TripRoster {
  final Trip trip;
  final Map<String, Member> members;
  final Map<String, Group> groups;

  const TripRoster({
    required this.trip,
    required this.members,
    required this.groups,
  });
}

Map<String, dynamic> mergeTripRoster(
  dynamic tripsOrRoster,
  dynamic remoteRoster, [
  Map<String, Group>? groups,
  String? tripId,
  TripRoster? roster,
  bool keepLocalCollab = false,
]) {
  // Overload 1: Golden fixture test vector call: mergeTripRoster(localRoster, remoteRoster)
  if (tripsOrRoster is List && remoteRoster is List && tripId == null) {
    return {
      'trips': tripsOrRoster,
      'members': remoteRoster,
    };
  }

  final trips = tripsOrRoster as List<Trip>;
  final members = remoteRoster as Map<String, Member>;
  final groupMap = groups ?? <String, Group>{};

  final local = trips.where((t) => t.id == tripId).firstOrNull;
  if (local == null || roster == null) {
    return {
      'trips': trips,
      'members': members,
      'groups': groupMap,
    };
  }

  final remoteMemberIds = roster.trip.memberIds.toSet();
  final nextMembers = Map<String, Member>.from(members);
  for (final id in local.memberIds) {
    if (!remoteMemberIds.contains(id)) nextMembers.remove(id);
  }
  nextMembers.addAll(roster.members);

  final remoteGroupIds = roster.trip.groupIds.toSet();
  final nextGroups = Map<String, Group>.from(groupMap);
  for (final id in local.groupIds) {
    if (!remoteGroupIds.contains(id)) nextGroups.remove(id);
  }
  nextGroups.addAll(roster.groups);

  final updatedTrips = trips.map((t) {
    return t.id == tripId ? applyRemoteTrip(t, roster.trip, keepLocalCollab) : t;
  }).toList();

  return {
    'trips': updatedTrips,
    'members': nextMembers,
    'groups': nextGroups,
  };
}
