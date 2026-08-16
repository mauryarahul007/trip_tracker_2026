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

  it('blocks admin deletion when only one admin exists or when no remaining admin is linked to Google', () => {
    const checkCanDeleteAdminWithGoogle = (trip: Trip, memberToDelete: Member) => {
      const isTargetAdmin = isMemberAdmin(trip, memberToDelete);
      if (!isTargetAdmin) return { allowed: true };

      const remainingAdmins = members.filter(
        (m) => m.id !== memberToDelete.id && isMemberAdmin(trip, m)
      );

      const remainingGoogleAdmins = remainingAdmins.filter((m) => Boolean(m.linkedUserId));

      if (remainingGoogleAdmins.length === 0) {
        return {
          allowed: false,
          error: 'Must retain at least one Google-linked Admin',
        };
      }
      return { allowed: true };
    };

    // Sole admin case: Rahul (linked) is only admin -> blocked
    const res1 = checkCanDeleteAdminWithGoogle(baseTrip, members[0]);
    expect(res1.allowed).toBe(false);
    expect(res1.error).toBe('Must retain at least one Google-linked Admin');

    // Two admins: Rahul (linked) and Sarah (unlinked) -> Rahul tries to delete himself -> blocked!
    const tripWithUnlinkedAdmin: Trip = {
      ...baseTrip,
      adminMemberIds: ['m-1', 'm-3'],
    };
    const res2 = checkCanDeleteAdminWithGoogle(tripWithUnlinkedAdmin, members[0]);
    expect(res2.allowed).toBe(false);
    expect(res2.error).toBe('Must retain at least one Google-linked Admin');

    // Two admins: Rahul (linked) and Alex (linked) -> Rahul tries to delete himself -> allowed!
    const tripWithTwoGoogleAdmins: Trip = {
      ...baseTrip,
      adminMemberIds: ['m-1', 'm-2'],
    };
    const res3 = checkCanDeleteAdminWithGoogle(tripWithTwoGoogleAdmins, members[0]);
    expect(res3.allowed).toBe(true);
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
