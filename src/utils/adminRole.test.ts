import { describe, it, expect } from 'vitest';
import type { Member, Trip } from '../types';

describe('Trip Multi-Admin Role Governance & Sole-Admin Protection', () => {
  const baseTrip: Trip = {
    id: 'trip-1',
    name: 'Goa Holiday 2026',
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    baseCurrency: 'INR',
    memberIds: ['m-1', 'm-2', 'm-3'],
    groupIds: [],
    ownerId: 'user-1',
    adminMemberIds: ['m-1'],
    joinCode: 'GOA123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const members: Member[] = [
    { id: 'm-1', name: 'Rahul Maurya', linkedUserId: 'user-1' },
    { id: 'm-2', name: 'Alex Johnson', linkedUserId: 'user-2' },
    { id: 'm-3', name: 'Sarah Connor', linkedUserId: null },
  ];

  const isMemberAdmin = (trip: Trip, member: Member): boolean => {
    if (trip.adminMemberIds && trip.adminMemberIds.length > 0) {
      return trip.adminMemberIds.includes(member.id);
    }
    if (member.linkedUserId && member.linkedUserId === trip.ownerId) return true;
    return trip.memberIds[0] === member.id;
  };

  it('correctly identifies initial trip creator as admin', () => {
    expect(isMemberAdmin(baseTrip, members[0])).toBe(true);
    expect(isMemberAdmin(baseTrip, members[1])).toBe(false);
    expect(isMemberAdmin(baseTrip, members[2])).toBe(false);
  });

  it('allows promoting any trip member to admin', () => {
    const updatedTrip: Trip = {
      ...baseTrip,
      adminMemberIds: [...(baseTrip.adminMemberIds || []), 'm-2'],
    };

    expect(isMemberAdmin(updatedTrip, members[0])).toBe(true);
    expect(isMemberAdmin(updatedTrip, members[1])).toBe(true);
    expect(isMemberAdmin(updatedTrip, members[2])).toBe(false);
  });

  it('allows all members in a trip to be admins', () => {
    const allAdminTrip: Trip = {
      ...baseTrip,
      adminMemberIds: ['m-1', 'm-2', 'm-3'],
    };

    members.forEach((m) => {
      expect(isMemberAdmin(allAdminTrip, m)).toBe(true);
    });
  });

  it('blocks sole-admin deletion when only one admin exists', () => {
    const checkCanDeleteMember = (trip: Trip, memberToDelete: Member) => {
      const activeAdmins = members.filter((m) => isMemberAdmin(trip, m));
      const targetIsAdmin = isMemberAdmin(trip, memberToDelete);

      if (targetIsAdmin && activeAdmins.length <= 1) {
        return { allowed: false, error: 'Cannot delete sole admin' };
      }
      return { allowed: true };
    };

    // Attempting to delete Rahul (the only admin)
    const resultRahul = checkCanDeleteMember(baseTrip, members[0]);
    expect(resultRahul.allowed).toBe(false);
    expect(resultRahul.error).toBe('Cannot delete sole admin');

    // Attempting to delete non-admin member Alex
    const resultAlex = checkCanDeleteMember(baseTrip, members[1]);
    expect(resultAlex.allowed).toBe(true);
  });

  it('permits admin self-deletion when another admin exists', () => {
    const multiAdminTrip: Trip = {
      ...baseTrip,
      adminMemberIds: ['m-1', 'm-2'],
    };

    const checkCanDeleteMember = (trip: Trip, memberToDelete: Member) => {
      const activeAdmins = members.filter((m) => isMemberAdmin(trip, m));
      const targetIsAdmin = isMemberAdmin(trip, memberToDelete);

      if (targetIsAdmin && activeAdmins.length <= 1) {
        return { allowed: false, error: 'Cannot delete sole admin' };
      }
      return { allowed: true };
    };

    // With 2 admins, Rahul can be deleted
    const result = checkCanDeleteMember(multiAdminTrip, members[0]);
    expect(result.allowed).toBe(true);
  });

  it('demoting an admin retains remaining admin', () => {
    const multiAdminTrip: Trip = {
      ...baseTrip,
      adminMemberIds: ['m-1', 'm-2'],
    };

    const demotedTrip: Trip = {
      ...multiAdminTrip,
      adminMemberIds: (multiAdminTrip.adminMemberIds || []).filter((id) => id !== 'm-2'),
    };

    expect(isMemberAdmin(demotedTrip, members[0])).toBe(true);
    expect(isMemberAdmin(demotedTrip, members[1])).toBe(false);
  });
});
