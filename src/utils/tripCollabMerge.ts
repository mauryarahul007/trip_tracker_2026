import type { Group, Member, Trip } from '../types';

export interface TripRoster {
  trip: Trip;
  members: Record<string, Member>;
  groups: Record<string, Group>;
}

/**
 * Overlay a freshly fetched trip onto the local copy.
 * While a checklist / notes / pass / FX write is still in flight, keep those
 * local arrays so a peer refresh cannot wipe the edit that has not landed yet.
 */
export function applyRemoteTrip(local: Trip, remote: Trip, keepLocalCollab: boolean): Trip {
  return {
    ...local,
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
  };
}

export function mergeTripRoster(
  trips: Trip[],
  members: Record<string, Member>,
  groups: Record<string, Group>,
  tripId: string,
  roster: TripRoster,
  keepLocalCollab: boolean
): { trips: Trip[]; members: Record<string, Member>; groups: Record<string, Group> } {
  const local = trips.find((t) => t.id === tripId);
  if (!local) return { trips, members, groups };

  const remoteMemberIds = new Set(roster.trip.memberIds);
  const nextMembers = { ...members };
  for (const id of local.memberIds) {
    if (!remoteMemberIds.has(id)) delete nextMembers[id];
  }
  Object.assign(nextMembers, roster.members);

  const remoteGroupIds = new Set(roster.trip.groupIds);
  const nextGroups = { ...groups };
  for (const id of local.groupIds) {
    if (!remoteGroupIds.has(id)) delete nextGroups[id];
  }
  Object.assign(nextGroups, roster.groups);

  return {
    trips: trips.map((t) => (t.id === tripId ? applyRemoteTrip(t, roster.trip, keepLocalCollab) : t)),
    members: nextMembers,
    groups: nextGroups,
  };
}
