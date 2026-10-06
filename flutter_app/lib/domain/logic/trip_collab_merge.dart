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

class MergedRoster {
  final List<Trip> trips;
  final Map<String, Member> members;
  final Map<String, Group> groups;
  const MergedRoster(this.trips, this.members, this.groups);
}

/// Port of `mergeTripRoster`: drops local members/groups the remote roster no
/// longer lists, overlays the remote ones, and applies the remote trip.
MergedRoster mergeTripRoster(
  List<Trip> trips,
  Map<String, Member> members,
  Map<String, Group> groups,
  String tripId,
  TripRoster roster,
  bool keepLocalCollab,
) {
  final local = trips.where((t) => t.id == tripId).firstOrNull;
  if (local == null) return MergedRoster(trips, members, groups);

  final remoteMemberIds = roster.trip.memberIds.toSet();
  final nextMembers = Map<String, Member>.from(members)
    ..removeWhere((id, _) => local.memberIds.contains(id) && !remoteMemberIds.contains(id))
    ..addAll(roster.members);

  final remoteGroupIds = roster.trip.groupIds.toSet();
  final nextGroups = Map<String, Group>.from(groups)
    ..removeWhere((id, _) => local.groupIds.contains(id) && !remoteGroupIds.contains(id))
    ..addAll(roster.groups);

  return MergedRoster(
    [for (final t in trips) t.id == tripId ? applyRemoteTrip(t, roster.trip, keepLocalCollab) : t],
    nextMembers,
    nextGroups,
  );
}
