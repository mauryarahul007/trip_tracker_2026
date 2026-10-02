import type { ChecklistItem, Group, Member, Trip, TripFxConfig, TripNote, TravelPass } from '../types';

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

/**
 * Paint a realtime trips UPDATE the way chat paints a new message: the
 * payload is the new list. A partial payload (replica identity not full)
 * leaves the local lists alone so a later refetch can fill them in.
 */
export function applyLiveCollabRow(local: Trip, row: Record<string, unknown>, keepLocalCollab: boolean): Trip {
  const next: Trip = { ...local };
  if (typeof row.name === 'string') next.name = row.name;
  if (typeof row.updated_at === 'string') {
    const updatedAt = new Date(row.updated_at).getTime();
    if (!Number.isNaN(updatedAt)) next.updatedAt = updatedAt;
  }
  if (keepLocalCollab) return next;
  if (Array.isArray(row.checklist)) next.checklist = row.checklist as ChecklistItem[];
  if (Array.isArray(row.notes)) next.notes = row.notes as TripNote[];
  if (Array.isArray(row.passes)) next.passes = row.passes as TravelPass[];
  if (row.fx_config && typeof row.fx_config === 'object' && !Array.isArray(row.fx_config)) {
    next.fxConfig = row.fx_config as TripFxConfig;
  }
  return next;
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
