import React from 'react';
import Fuse from 'fuse.js';
import type { Group, Member, PreviousMemberSuggestion } from '../types';
import type { MemberBalance } from '../utils/settlement';
import { initial } from '../utils/initials';
import { fetchPreviousTripMembers } from '../services/tripApi';
import { IconCheck, IconEdit, IconTrash } from './Icons';

type Props = {
  showMembersRequiredNotice: boolean;
  dismissMembersRequiredNotice: () => void;

  activeTripMembers: Member[];
  visibleMembers: Member[];
  archivedMembers: Member[];
  balances: MemberBalance[];
  currencySymbol: string;
  onToggleArchiveMember: (id: string) => void;
  onSaveMember: (name: string, id: string | null, linkedUserId?: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteMember: (member: Member) => void;

  visibleTripGroups: Group[];
  onSaveGroup: (name: string, memberIds: string[], id: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteGroup: (group: Group) => void;

  members: Record<string, Member>;
  isAdmin: boolean;
  tripOwnerId: string;
  adminMemberIds?: string[];
  onSetMemberAdminRole?: (memberId: string, isAdmin: boolean) => Promise<void>;
  currentUserId: string | null;
};

export function MembersGroupsTab({
  showMembersRequiredNotice,
  dismissMembersRequiredNotice,
  activeTripMembers,
  visibleMembers,
  archivedMembers,
  balances,
  currencySymbol,
  onToggleArchiveMember,
  onSaveMember,
  onDeleteMember,
  visibleTripGroups,
  onSaveGroup,
  onDeleteGroup,
  members,
  isAdmin,
  tripOwnerId,
  adminMemberIds,
  onSetMemberAdminRole,
  currentUserId,
}: Props) {
  // Member Form State
  const [newMemberName, setNewMemberName] = React.useState('');
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [memberFormError, setMemberFormError] = React.useState('');
  const [previousMembers, setPreviousMembers] = React.useState<PreviousMemberSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);
  const [selectedLinkedUserId, setSelectedLinkedUserId] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Load previous members associated with this user
  React.useEffect(() => {
    if (!currentUserId) {
      setPreviousMembers([]);
      return;
    }
    let isMounted = true;
    fetchPreviousTripMembers(currentUserId)
      .then((data) => {
        if (isMounted) {
          setPreviousMembers(data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch previous members:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // Determine if a member is the primary trip creator/owner
  const isOriginalTripOwner = React.useCallback(
    (member: Member): boolean => {
      if (tripOwnerId && member.linkedUserId) {
        return member.linkedUserId === tripOwnerId;
      }
      return activeTripMembers[0]?.id === member.id;
    },
    [tripOwnerId, activeTripMembers]
  );

  // Determine if a given member has Trip Admin rights
  const isMemberAdmin = React.useCallback(
    (member: Member): boolean => {
      if (adminMemberIds && adminMemberIds.length > 0) {
        return adminMemberIds.includes(member.id);
      }
      return isOriginalTripOwner(member);
    },
    [adminMemberIds, isOriginalTripOwner]
  );

  const tripAdminCount = React.useMemo(() => {
    return activeTripMembers.filter((m) => isMemberAdmin(m)).length;
  }, [activeTripMembers, isMemberAdmin]);

  // Check whether an admin can be deleted (must retain at least 1 Google-linked Admin; secondary admins cannot delete owner)
  const checkCanDeleteMember = React.useCallback(
    (member: Member): { allowed: boolean; reason?: string } => {
      if (!isMemberAdmin(member)) {
        return { allowed: true };
      }

      const isOwner = isOriginalTripOwner(member);
      const isCurrentUserOwner = currentUserId && tripOwnerId && currentUserId === tripOwnerId;

      // Secondary admins cannot delete the original trip creator
      if (isOwner && !isCurrentUserOwner) {
        return {
          allowed: false,
          reason: `Cannot delete "${member.name}". Only the original Trip Owner can manage their account.`,
        };
      }

      const remainingAdmins = activeTripMembers.filter(
        (m) => m.id !== member.id && isMemberAdmin(m)
      );

      const remainingGoogleAdmins = remainingAdmins.filter((m) => Boolean(m.linkedUserId));

      if (remainingGoogleAdmins.length === 0) {
        if (remainingAdmins.length > 0) {
          return {
            allowed: false,
            reason: `Cannot delete "${member.name}". A trip must retain at least one Admin linked to a Google account. The other admin is not linked to Google.`,
          };
        }
        return {
          allowed: false,
          reason: `Cannot delete "${member.name}". A trip must retain at least one Admin linked to a Google account. Please promote a Google-linked member to Admin first.`,
        };
      }

      return { allowed: true };
    },
    [isMemberAdmin, isOriginalTripOwner, activeTripMembers, currentUserId, tripOwnerId]
  );

  // Click outside to dismiss typeahead dropdown
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out members already in activeTripMembers (by linkedUserId or normalized name)
  const availablePreviousMembers = React.useMemo(() => {
    const currentNames = new Set(activeTripMembers.map((m) => m.name.trim().toLowerCase()));
    const currentLinkedIds = new Set(
      activeTripMembers.map((m) => m.linkedUserId).filter((id): id is string => Boolean(id))
    );

    return previousMembers.filter((pm) => {
      const norm = pm.name.trim().toLowerCase();
      if (currentNames.has(norm)) return false;
      if (pm.linkedUserId && currentLinkedIds.has(pm.linkedUserId)) return false;
      return true;
    });
  }, [previousMembers, activeTripMembers]);

  // Fuse.js fuzzy index
  const fuse = React.useMemo(() => {
    return new Fuse(availablePreviousMembers, {
      keys: ['name'],
      threshold: 0.35,
      minMatchCharLength: 1,
    });
  }, [availablePreviousMembers]);

  // Top 5 fuzzy matched suggestions or recent members
  const filteredSuggestions = React.useMemo(() => {
    const query = newMemberName.trim();
    if (!query) {
      return availablePreviousMembers.slice(0, 5);
    }
    return fuse.search(query).map((res) => res.item).slice(0, 5);
  }, [fuse, newMemberName, availablePreviousMembers]);

  // Group Form State
  const [showAddGroup, setShowAddGroup] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = React.useState<Record<string, boolean>>({});
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [groupFormError, setGroupFormError] = React.useState('');
  const [isGroupNameAuto, setIsGroupNameAuto] = React.useState(true);

  // Auto-generate group name based on selected members
  React.useEffect(() => {
    if (isGroupNameAuto) {
      const selectedNames = visibleMembers
        .filter((m) => selectedGroupMembers[m.id])
        .map((m) => m.name);

      let autoName = '';
      if (selectedNames.length === 1) {
        autoName = selectedNames[0];
      } else if (selectedNames.length === 2) {
        autoName = `${selectedNames[0]} & ${selectedNames[1]}`;
      } else if (selectedNames.length > 2) {
        autoName = `${selectedNames.slice(0, -1).join(', ')} & ${selectedNames[selectedNames.length - 1]}`;
      }
      setNewGroupName(autoName);
    }
  }, [selectedGroupMembers, isGroupNameAuto, visibleMembers]);

  // Handlers
  const handleSelectSuggestion = async (suggestion: PreviousMemberSuggestion) => {
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setMemberFormError('');
    const res = await onSaveMember(suggestion.name, null, suggestion.linkedUserId || null);
    if (res.success) {
      setNewMemberName('');
      setSelectedLinkedUserId(null);
      setMemberFormError('');
    } else if (res.error) {
      setMemberFormError(res.error);
    }
  };

  const handleAddMemberLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    const res = await onSaveMember(
      newMemberName,
      editingMember ? editingMember.id : null,
      editingMember ? undefined : selectedLinkedUserId
    );
    if (res.success) {
      setNewMemberName('');
      setSelectedLinkedUserId(null);
      setEditingMember(null);
      setMemberFormError('');
    } else if (res.error) {
      setMemberFormError(res.error);
    }
  };

  const handleStartEditMemberLocal = (member: Member) => {
    setIsDropdownOpen(false);
    setEditingMember(member);
    setNewMemberName(member.name);
    setSelectedLinkedUserId(null);
    setMemberFormError('');
  };

  const handleCancelMemberEditLocal = () => {
    setIsDropdownOpen(false);
    setNewMemberName('');
    setSelectedLinkedUserId(null);
    setEditingMember(null);
    setMemberFormError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleCreateGroupLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    const memberIds = Object.keys(selectedGroupMembers).filter((id) => selectedGroupMembers[id]);
    const res = await onSaveGroup(newGroupName, memberIds, editingGroup ? editingGroup.id : null);
    if (res.success) {
      setNewGroupName('');
      setSelectedGroupMembers({});
      setEditingGroup(null);
      setGroupFormError('');
      setIsGroupNameAuto(true);
      setShowAddGroup(false);
    } else if (res.error) {
      setGroupFormError(res.error);
    }
  };

  const handleStartEditGroupLocal = (group: Group) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    const checkedMap: Record<string, boolean> = {};
    group.memberIds.forEach((id) => {
      checkedMap[id] = true;
    });
    setSelectedGroupMembers(checkedMap);

    const selectedNames = visibleMembers
      .filter((m) => checkedMap[m.id])
      .map((m) => m.name);
    let autoName = '';
    if (selectedNames.length === 1) autoName = selectedNames[0];
    else if (selectedNames.length === 2) autoName = `${selectedNames[0]} & ${selectedNames[1]}`;
    else if (selectedNames.length > 2) autoName = `${selectedNames.slice(0, -1).join(', ')} & ${selectedNames[selectedNames.length - 1]}`;

    setIsGroupNameAuto(group.name === autoName);
    setGroupFormError('');
    setShowAddGroup(true);
  };

  const handleCancelGroupFormLocal = () => {
    setNewGroupName('');
    setSelectedGroupMembers({});
    setEditingGroup(null);
    setGroupFormError('');
    setIsGroupNameAuto(true);
    setShowAddGroup(false);
  };

  const otherGroupMemberIds = new Set<string>();
  visibleTripGroups.forEach((grp) => {
    if (grp.id !== (editingGroup ? editingGroup.id : null)) {
      grp.memberIds.forEach((id) => otherGroupMemberIds.add(id));
    }
  });

  const availableMembers = visibleMembers.filter((m) => !otherGroupMemberIds.has(m.id));

  const memberInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingMember) {
      const timer = setTimeout(() => {
        memberInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingMember]);

  return (
    <div className="fade-in">
      {showMembersRequiredNotice && (
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '16px', border: '1px dashed var(--color-warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px' }}>Please add a member before recording expenses.</span>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            onClick={dismissMembersRequiredNotice}
          >
            &times;
          </button>
        </div>
      )}
      {/* 1. Add Members Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px' }}>Trip Members</h3>
      </div>

      {isAdmin ? (
        <form className="glass-card fade-in" onSubmit={handleAddMemberLocal} style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingMember ? 'Edit Member' : 'New Member'}</h4>
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label className="form-label">Name</label>
            <input
              ref={memberInputRef}
              type="text"
              required
              className="input-field"
              placeholder="Enter full name"
              value={newMemberName}
              autoComplete="off"
              onFocus={() => {
                if (!editingMember && filteredSuggestions.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setNewMemberName(e.target.value);
                setSelectedLinkedUserId(null);
                if (!editingMember) {
                  setIsDropdownOpen(true);
                  setHighlightedIndex(-1);
                }
              }}
              onKeyDown={handleKeyDown}
            />

            {!editingMember && isDropdownOpen && filteredSuggestions.length > 0 && (
              <div
                className="typeahead-dropdown glass-card"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  padding: '6px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  background: 'var(--card-bg, rgba(28, 42, 56, 0.95))',
                  borderRadius: '10px',
                }}
              >
                <div
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {newMemberName.trim() ? 'Suggested Past Members' : 'Recent Members'}
                </div>
                {filteredSuggestions.map((suggestion, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={`${suggestion.name}-${suggestion.linkedUserId || idx}`}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: isHighlighted ? 'var(--hover-bg, rgba(255, 255, 255, 0.08))' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {suggestion.avatarUrl ? (
                          <img
                            src={suggestion.avatarUrl}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--color-primary), #4facfe)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {initial(suggestion.name)}
                          </div>
                        )}
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {suggestion.name}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {suggestion.linkedUserId ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: '12px',
                              background: 'rgba(66, 133, 244, 0.15)',
                              color: '#4285f4',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Friend will automatically see this trip when they log into Google"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            Linked
                          </span>
                        ) : null}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to add</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {memberFormError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>{memberFormError}</p>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>
              {editingMember ? 'Update' : 'Add'}
            </button>
            {editingMember && (
              <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={handleCancelMemberEditLocal}>Cancel</button>
            )}
          </div>
        </form>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Only the trip admin can add, edit, or remove members and groups.
        </p>
      )}

      {/* Members list */}
      {activeTripMembers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '24px', borderStyle: 'dashed', marginBottom: '32px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No one's on this trip yet. Add the first member to start splitting costs.</p>
        </div>
      ) : (
        <div className="luggage-list">
          {visibleMembers.map((member) => {
            const balance = balances.find((b) => b.memberId === member.id)?.balance ?? 0;
            const owes = balance < -0.01;
            const amtLabel =
              balance > 0.01
                ? `owed ${currencySymbol}${balance.toFixed(2)}`
                : owes
                ? `owes ${currencySymbol}${Math.abs(balance).toFixed(2)}`
                : 'settled';
            return (
              <div key={member.id} className={`luggage-tag${owes ? ' lt-owe' : ''}`}>
                <div className="lt-hardware">
                  <div className="lt-hole" />
                  <div className="lt-string" />
                </div>
                <div className="lt-card">
                  <div className="lt-status" />
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="lt-initials" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="lt-initials">{initial(member.name)}</div>
                  )}
                  <div className="lt-body">
                    <div className="lt-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', whiteSpace: 'normal', overflow: 'visible' }}>
                      {member.name}
                      {isOriginalTripOwner(member) ? (
                        <span className="member-badge member-badge-admin" title="Trip Creator & Owner">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                          </svg>
                          Owner
                        </span>
                      ) : isMemberAdmin(member) ? (
                        <span className="member-badge member-badge-admin" title="Trip Admin">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                          </svg>
                          Admin
                        </span>
                      ) : (
                        <span className="member-badge member-badge-you" style={{ color: 'var(--text-muted)' }}>
                          Member
                        </span>
                      )}
                      {currentUserId && member.linkedUserId === currentUserId && (
                        <span className="member-badge member-badge-you">You</span>
                      )}
                    </div>
                    <div className="lt-amt">{amtLabel}</div>
                  </div>
                  {isAdmin && (
                    <div className="lt-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {onSetMemberAdminRole && (
                        !isMemberAdmin(member) ? (
                          member.linkedUserId ? (
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                color: 'var(--primary-accent)',
                                borderColor: 'rgba(31, 110, 104, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Make this member a Trip Admin"
                              onClick={() => onSetMemberAdminRole(member.id, true)}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                              </svg>
                              Make Admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="secondary-btn"
                              disabled
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                borderColor: 'var(--border-color)',
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Member must join with a Google account to be made an Admin"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                              </svg>
                              Make Admin
                            </button>
                          )
                        ) : !isOriginalTripOwner(member) && tripAdminCount > 1 ? (
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              borderColor: 'var(--border-color)',
                            }}
                            title="Demote to Member"
                            onClick={() => onSetMemberAdminRole(member.id, false)}
                          >
                            Demote
                          </button>
                        ) : null
                      )}
                      <button
                        className="secondary-btn"
                        style={{ padding: '6px' }}
                        aria-label="Edit member"
                        title="Edit member"
                        onClick={() => handleStartEditMemberLocal(member)}
                      >
                        <IconEdit size={14} className="icon-sm" />
                      </button>
                      {(() => {
                        const delCheck = checkCanDeleteMember(member);
                        return (
                          <button
                            className="secondary-btn"
                            style={{
                              padding: '6px',
                              color: delCheck.allowed ? 'var(--color-danger)' : 'var(--text-muted)',
                              borderColor: delCheck.allowed ? 'rgba(184,69,46,0.2)' : 'var(--border-color)',
                              opacity: delCheck.allowed ? 1 : 0.5,
                            }}
                            aria-label="Delete member"
                            title={delCheck.allowed ? 'Delete member' : delCheck.reason}
                            onClick={() => onDeleteMember(member)}
                          >
                            <IconTrash size={14} className="icon-sm" />
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Archived Members */}
          {archivedMembers.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Archived ({archivedMembers.length})
              </h4>
              {archivedMembers.map((member) => (
                <div key={member.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', opacity: 0.5 }}>
                  <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>{member.name}</span>
                  {isAdmin && (
                    <button
                      className="secondary-btn"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => onToggleArchiveMember(member.id)}
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Group Management Section */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px' }}>Member Groups</h3>
          {isAdmin && !showAddGroup && visibleMembers.length > 0 && (
            <button className="gradient-btn" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setShowAddGroup(true)}>
              + Create Group
            </button>
          )}
        </div>

        {isAdmin && showAddGroup && (
          <form className="glass-card fade-in" onSubmit={handleCreateGroupLocal} style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingGroup ? 'Edit Group' : 'New Group'}</h4>

            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Couple A & B or Family"
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  setIsGroupNameAuto(false);
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Group Members</label>
              {availableMembers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  All active members are already assigned to other groups.
                </p>
              ) : (
                <div className="member-grid">
                  {availableMembers.map((m) => {
                    const isChecked = !!selectedGroupMembers[m.id];
                    return (
                      <div
                        key={m.id}
                        role="button"
                        tabIndex={0}
                        className="member-card"
                        style={isChecked ? { borderColor: 'var(--color-success)', background: 'rgba(44,122,75,0.07)' } : undefined}
                        aria-pressed={isChecked}
                        onClick={() => setSelectedGroupMembers({ ...selectedGroupMembers, [m.id]: !isChecked })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedGroupMembers({ ...selectedGroupMembers, [m.id]: !isChecked });
                          }
                        }}
                      >
                        <div className="member-avatar">
                          {initial(m.name)}
                          {isChecked && (
                            <span className="member-check-badge">
                              <IconCheck size={10} className="icon-sm" />
                            </span>
                          )}
                        </div>
                        <span className="member-name">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {groupFormError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '4px' }}>{groupFormError}</p>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }}>
                {editingGroup ? 'Update Group' : 'Save Group'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={handleCancelGroupFormLocal}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Groups list */}
        {visibleTripGroups.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '24px', borderStyle: 'dashed' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              No groups yet. Create one to split expenses across a few people in a single tap.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleTripGroups.map((grp) => {
              const grpMemberNames = grp.memberIds
                .map((id) => members[id]?.name)
                .filter(Boolean)
                .join(', ');
              return (
                <div key={grp.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{grp.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Members: {grpMemberNames || 'None'}
                    </p>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => handleStartEditGroupLocal(grp)}
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                        onClick={() => onDeleteGroup(grp)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
