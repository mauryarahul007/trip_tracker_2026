import type { Expense, MemberRole, Trip } from '../types';

/**
 * Returns the effective role for a member within a trip.
 * Defaults to 'organizer' for owner/admins, and 'contributor' for standard participants.
 */
export function getMemberRole(
  trip: Trip | null | undefined,
  memberId: string | null | undefined
): MemberRole {
  if (!trip || !memberId) return 'contributor';

  // Explicit role assignment takes priority
  if (trip.memberRoles && trip.memberRoles[memberId]) {
    return trip.memberRoles[memberId];
  }

  // Creator / owner or explicitly declared admin
  if (trip.adminMemberIds && trip.adminMemberIds.includes(memberId)) {
    return 'organizer';
  }

  // Fallback: First member in trip defaults to organizer if no adminMemberIds exist
  if (trip.memberIds && trip.memberIds.length > 0 && trip.memberIds[0] === memberId) {
    return 'organizer';
  }

  return 'contributor';
}

/**
 * Checks whether the current user / member has Viewer-only (read-only) permissions.
 */
export function isViewerRole(
  trip: Trip | null | undefined,
  memberId: string | null | undefined,
  isTripAdmin: boolean = false
): boolean {
  if (isTripAdmin) return false;
  if (!trip || !memberId) return false;
  return getMemberRole(trip, memberId) === 'viewer';
}

/**
 * Checks whether the user can add expenses to the trip.
 * Organizers & Contributors can add; Viewers cannot.
 */
export function canAddExpense(
  trip: Trip | null | undefined,
  memberId: string | null | undefined,
  isTripAdmin: boolean = false
): boolean {
  if (isTripAdmin) return true;
  if (!trip) return false;
  if (trip.closed || trip.frozen || trip.archived) return false;
  if (!memberId) return true; // Unclaimed or default state
  const role = getMemberRole(trip, memberId);
  return role === 'organizer' || role === 'contributor';
}

/**
 * Checks whether the user can edit or delete an existing expense.
 * Organizers can edit any expense; Contributors can edit their own; Viewers cannot edit.
 */
export function canEditExpense(
  expense: Expense | null | undefined,
  trip: Trip | null | undefined,
  memberId: string | null | undefined,
  userId: string | null | undefined,
  isTripAdmin: boolean = false
): boolean {
  if (isTripAdmin) return true;
  if (!trip || !expense) return false;
  if (trip.closed || trip.frozen || trip.archived) return false;
  if (!memberId) return true;

  const role = getMemberRole(trip, memberId);
  if (role === 'organizer') return true;
  if (role === 'viewer') return false;

  // Contributor: can edit if they created it or paid for it
  const isPayer = expense.paidBy === memberId;
  const isCreator = Boolean(userId && expense.createdByUserId === userId);
  return isPayer || isCreator;
}

/**
 * Checks whether the user can manage trip settings, members, and roles.
 */
export function canManageTrip(
  trip: Trip | null | undefined,
  memberId: string | null | undefined,
  isTripAdmin: boolean = false
): boolean {
  if (isTripAdmin) return true;
  if (!trip) return false;
  if (!memberId) return isTripAdmin;
  return getMemberRole(trip, memberId) === 'organizer';
}
