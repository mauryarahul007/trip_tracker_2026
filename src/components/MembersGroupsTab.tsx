import React from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import type { Group, Member, PreviousMemberSuggestion } from '../types';
import type { MemberBalance } from '../utils/settlement';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { fetchPreviousTripMembers, searchRemoteMemberSuggestions } from '../services/tripApi';
import { IconCheck, IconEdit, IconTrash, IconMembers, IconTag } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { useHistoryBack } from '../utils/useHistoryBack';
import { usePrivacyStore, formatMaskedAmount } from '../store/privacyStore';
import { buildAutoGroupName } from '../utils/groupNaming';

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
  // Bumped by the nav bar's FAB when it's tapped while this tab is active
  // (see NavTabs) -- any change opens the add-member popup, the value
  // itself is unused.
  addMemberSignal?: number;
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
  addMemberSignal,
}: Props) {
  const isBlindMode = usePrivacyStore((s) => s.isBlindMode);

  // Member Form State
  const [newMemberName, setNewMemberName] = React.useState('');
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [memberFormError, setMemberFormError] = React.useState('');
  // Add/edit member now renders as a popup instead of an always-inline
  // form -- the members list is what people open this tab to see, an
  // empty add-form pushing it below the fold every time was backwards.
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [addAnother, setAddAnother] = React.useState(false);
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
      // The original trip owner is ALWAYS an admin
      if (isOriginalTripOwner(member)) return true;
      if (adminMemberIds && adminMemberIds.length > 0) {
        return adminMemberIds.includes(member.id);
      }
      return false;
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

  // Merge all database members from Supabase previous members and local trip store members
  const allDatabaseMembers = React.useMemo(() => {
    const memberMap = new Map<string, PreviousMemberSuggestion>();

    // 1. From previousMembers (Supabase remote)
    previousMembers.forEach((pm) => {
      const norm = pm.name.trim().toLowerCase();
      if (norm) {
        memberMap.set(norm, pm);
      }
    });

    // 2. From all local members in trip store across all trips
    Object.values(members).forEach((m) => {
      const norm = m.name.trim().toLowerCase();
      if (!norm) return;
      const existing = memberMap.get(norm);
      if (!existing) {
        memberMap.set(norm, {
          name: m.name.trim(),
          linkedUserId: m.linkedUserId || null,
          avatarUrl: null,
        });
      } else if (!existing.linkedUserId && m.linkedUserId) {
        existing.linkedUserId = m.linkedUserId;
      }
    });

    return Array.from(memberMap.values());
  }, [previousMembers, members]);

  // Filter out members already in activeTripMembers (by linkedUserId or normalized name)
  const availablePreviousMembers = React.useMemo(() => {
    const currentNames = new Set(
      activeTripMembers
        .filter((m) => !editingMember || m.id !== editingMember.id)
        .map((m) => m.name.trim().toLowerCase())
    );
    const currentLinkedIds = new Set(
      activeTripMembers
        .filter((m) => !editingMember || m.id !== editingMember.id)
        .map((m) => m.linkedUserId)
        .filter((id): id is string => Boolean(id))
    );

    return allDatabaseMembers.filter((pm) => {
      const norm = pm.name.trim().toLowerCase();
      if (currentNames.has(norm)) return false;
      if (pm.linkedUserId && currentLinkedIds.has(pm.linkedUserId)) return false;
      return true;
    });
  }, [allDatabaseMembers, activeTripMembers, editingMember]);

  // Real-time check if entered name is already added to active trip
  const duplicateTripMember = React.useMemo(() => {
    const query = newMemberName.trim().toLowerCase();
    if (!query) return null;
    return activeTripMembers.find(
      (m) => m.name.trim().toLowerCase() === query && (!editingMember || m.id !== editingMember.id)
    );
  }, [newMemberName, activeTripMembers, editingMember]);

  // Real-time check if entered name matches an existing person in DB
  const matchingExistingPerson = React.useMemo(() => {
    const query = newMemberName.trim().toLowerCase();
    if (!query) return null;
    return availablePreviousMembers.find((pm) => pm.name.trim().toLowerCase() === query);
  }, [newMemberName, availablePreviousMembers]);

  // Fuse.js fuzzy index
  const fuse = React.useMemo(() => {
    return new Fuse(availablePreviousMembers, {
      keys: ['name'],
      threshold: 0.35,
      minMatchCharLength: 1,
    });
  }, [availablePreviousMembers]);

  // Top 6 fuzzy matched suggestions, only once user starts typing
  const filteredSuggestions = React.useMemo(() => {
    const query = newMemberName.trim();
    if (!query) {
      return [];
    }
    const fuzzyResults = fuse.search(query).map((res) => res.item);
    // If exact prefix/substring match exists, place it on top
    const exactMatches = availablePreviousMembers.filter((pm) =>
      pm.name.toLowerCase().includes(query.toLowerCase())
    );
    const combined = Array.from(new Set([...exactMatches, ...fuzzyResults]));
    return combined.slice(0, 6);
  }, [fuse, newMemberName, availablePreviousMembers]);

  // When search query is entered and matching suggestions drop below 5, trigger debounced Supabase query
  React.useEffect(() => {
    const query = newMemberName.trim();
    if (!query || query.length < 2 || !currentUserId) {
      return;
    }

    // Check how many local matches we have
    const localMatches = fuse.search(query).map((res) => res.item);
    if (localMatches.length >= 5) {
      return; // Already have 5+ local suggestions
    }

    const timer = setTimeout(async () => {
      try {
        const remoteResults = await searchRemoteMemberSuggestions(query, currentUserId);
        if (remoteResults.length > 0) {
          setPreviousMembers((prev) => {
            const map = new Map(prev.map((p) => [p.name.toLowerCase(), p]));
            let hasNew = false;
            remoteResults.forEach((item) => {
              const key = item.name.toLowerCase();
              if (!map.has(key)) {
                map.set(key, item);
                hasNew = true;
              } else if (!map.get(key)!.linkedUserId && item.linkedUserId) {
                map.set(key, item);
                hasNew = true;
              }
            });
            return hasNew ? Array.from(map.values()) : prev;
          });
        }
      } catch (err) {
        console.error('Remote suggestion search error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newMemberName, fuse, currentUserId]);

  // Group Form State
  const [showAddGroup, setShowAddGroup] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = React.useState<Record<string, boolean>>({});
  const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
  const [groupFormError, setGroupFormError] = React.useState('');
  const [isGroupNameAuto, setIsGroupNameAuto] = React.useState(true);

  // Register group modal/form into browser history stack (WhatsApp hierarchical navigation)
  useHistoryBack(showAddGroup || Boolean(editingGroup), () => {
    setShowAddGroup(false);
    setEditingGroup(null);
    setGroupFormError('');
  });

  // Register member add/edit popup into browser history stack
  useHistoryBack(showAddForm, () => {
    setShowAddForm(false);
    setAddAnother(false);
    setEditingMember(null);
    setNewMemberName('');
    setSelectedLinkedUserId(null);
    setMemberFormError('');
  });

  // FAB on this tab bumps this signal instead of adding an expense (see
  // NavTabs) -- open the popup fresh, blank, ready to type a name. Tracks
  // the last-seen value rather than a "skip the first run" flag -- under
  // StrictMode's dev-only double-invoke of mount effects, a flag that
  // flips itself off on the first call opens the popup on the SECOND
  // (still-mount) invocation instead of skipping it.
  const lastAddSignal = React.useRef(addMemberSignal ?? 0);
  React.useEffect(() => {
    if (addMemberSignal === undefined || addMemberSignal === lastAddSignal.current) return;
    lastAddSignal.current = addMemberSignal;
    setEditingMember(null);
    setNewMemberName('');
    setSelectedLinkedUserId(null);
    setMemberFormError('');
    setAddAnother(false);
    setShowAddForm(true);
  }, [addMemberSignal]);

  // Auto-generate group name based on selected members
  React.useEffect(() => {
    if (isGroupNameAuto) {
      const selectedNames = visibleMembers
        .filter((m) => selectedGroupMembers[m.id])
        .map((m) => m.name);
      setNewGroupName(buildAutoGroupName(selectedNames));
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
    if (duplicateTripMember) {
      setMemberFormError(`A member named "${duplicateTripMember.name}" is already in this trip.`);
      return;
    }

    setIsDropdownOpen(false);
    // If exact match exists in DB, automatically inherit their linkedUserId
    const linkedIdToUse =
      selectedLinkedUserId || (matchingExistingPerson ? matchingExistingPerson.linkedUserId : null);

    const res = await onSaveMember(
      newMemberName,
      editingMember ? editingMember.id : null,
      editingMember ? undefined : linkedIdToUse
    );
    if (res.success) {
      setNewMemberName('');
      setSelectedLinkedUserId(null);
      setEditingMember(null);
      setMemberFormError('');
      if (!addAnother) {
        setShowAddForm(false);
      } else {
        memberInputRef.current?.focus();
      }
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
    setAddAnother(false);
    setShowAddForm(true);
  };

  const handleCancelMemberEditLocal = () => {
    setIsDropdownOpen(false);
    setNewMemberName('');
    setSelectedLinkedUserId(null);
    setEditingMember(null);
    setMemberFormError('');
    setAddAnother(false);
    setShowAddForm(false);
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
    const autoName = buildAutoGroupName(selectedNames);

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
    if (showAddForm) {
      const timer = setTimeout(() => {
        memberInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showAddForm]);

  return (
    <div className="fade-in">
      {showMembersRequiredNotice && (
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: '16px', border: '1px dashed var(--color-warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px' }}>Please add a member before recording expenses.</span>
          <button
            type="button"
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            onClick={dismissMembersRequiredNotice}
          >
            &times;
          </button>
        </div>
      )}
      {/* 1. Add Members Section -- the bottom-nav FAB is the only entry
          point for adding a member, so no in-page trigger here. */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px' }}>Trip Members</h3>
      </div>

      {isAdmin && showAddForm && createPortal(
        // Portal to <body> -- this tab's content lives inside .tab-pane,
        // which has its own mask-image (for the scroll-edge fade) that
        // also clips position:fixed descendants rendered inside it, so a
        // modal built inline here was rendering invisible above the fold.
        <div className="modal-overlay" onClick={handleCancelMemberEditLocal}>
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-member-title"
          className="glass-card fade-in modal-sheet"
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleAddMemberLocal}
          style={{ marginBottom: '24px' }}
        >
          <h4 id="add-member-title" style={{ marginBottom: '14px', fontSize: '15px' }}>{editingMember ? 'Edit Member' : 'New Member'}</h4>
          <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label className="form-label">Name</label>
            <input
              ref={memberInputRef}
              type="text"
              required
              className="input-field"
              placeholder="Enter member name"
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
                  borderRadius: 'var(--border-radius-md)',
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
                        borderRadius: 'var(--border-radius-sm)',
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
                            decoding="async"
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

            {duplicateTripMember && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ⚠️ A member named "{duplicateTripMember.name}" is already in this trip.
              </div>
            )}

            {!duplicateTripMember && matchingExistingPerson && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'rgba(47, 111, 237, 0.1)',
                  border: '1px solid rgba(47, 111, 237, 0.25)',
                  color: 'var(--primary-accent)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ✨ Existing traveler found in database. Auto-linking identity.
              </div>
            )}
          </div>
          {memberFormError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '4px', marginBottom: '8px' }}>{memberFormError}</p>
          )}
          {!editingMember && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginTop: '4px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
              />
              Add another after this one
            </label>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="submit"
              className="gradient-btn"
              style={{ flex: 1, padding: '10px' }}
              disabled={Boolean(duplicateTripMember)}
            >
              {editingMember ? 'Update' : 'Add'}
            </button>
            <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={handleCancelMemberEditLocal}>Cancel</button>
          </div>
        </form>
        </div>,
        document.body
      )}

      {/* Members list */}
      {activeTripMembers.length === 0 ? (
        <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed', marginBottom: '32px' }}>
          <div className="ledger-rule" />
          <div className="ledger-empty-prompt">
            <span className="ledger-badge" aria-hidden="true">
              <IconMembers size={14} className="icon-sm" />
            </span>
            <p>No one's on this trip yet. Add the first member to start splitting costs.</p>
          </div>
          <div className="ledger-rule" />
        </div>
      ) : (
        <div className="luggage-list">
          {visibleMembers.map((member) => {
            const balance = balances.find((b) => b.memberId === member.id)?.balance ?? 0;
            const owes = balance < -0.01;
            const amtLabel =
              balance > 0.01
                ? `gets back ${formatMaskedAmount(balance, currencySymbol, isBlindMode)}`
                : owes
                ? `owes ${formatMaskedAmount(Math.abs(balance), currencySymbol, isBlindMode)}`
                : 'settled';
            const delCheck = isAdmin ? checkCanDeleteMember(member) : null;
            const row = (
              <div key={member.id} className={`luggage-tag${owes ? ' lt-owe' : ''}`}>
                <div className="lt-card">
                  <div className="lt-status" />
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="lt-initials" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                  ) : (
                    <div className="lt-initials" style={{ background: avatarColorForName(member.name) }}>{initial(member.name)}</div>
                  )}
                  <div className="lt-body">
                    {/* Top row: name gets the full row width (ellipsis if
                        needed) with badges pinned to the top-right corner
                        instead of sitting inline right after it — freeing
                        up the row for the name rather than squeezing both
                        into shared space. Actions move to their own row
                        below (with the amount) rather than sharing this
                        row too, for the same reason. */}
                    <div className="lt-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span className="lt-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {member.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isMemberAdmin(member) ? (
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
                        {!member.linkedUserId && (
                          <span className="member-badge member-badge-pending" title="Invited, hasn't joined via the trip code yet">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="lt-bottom-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <div className="lt-amt privacy-blur">{amtLabel}</div>
                      {isAdmin && (
                        <div className="lt-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {onSetMemberAdminRole && (
                            !isMemberAdmin(member) ? (
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  color: 'var(--primary-accent)',
                                  borderColor: 'rgba(47, 111, 237, 0.3)',
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
                          {/* Swipe (below) is the edit/delete entry point on
                              touch. Mouse/trackpad users have no swipe gesture,
                              so these stay as their fallback -- hidden on touch
                              via CSS, same (hover: hover) and (pointer: fine)
                              pattern as .cmd-k-hint. */}
                          <div className="member-row-desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              className="secondary-btn"
                              style={{ padding: '6px' }}
                              aria-label="Edit member"
                              title="Edit member"
                              onClick={() => handleStartEditMemberLocal(member)}
                            >
                              <IconEdit size={14} className="icon-sm" />
                            </button>
                            <button
                              className="secondary-btn"
                              style={{
                                padding: '6px',
                                color: delCheck?.allowed ? 'var(--color-danger)' : 'var(--text-muted)',
                                borderColor: delCheck?.allowed ? 'rgba(184,69,46,0.2)' : 'var(--border-color)',
                                opacity: delCheck?.allowed ? 1 : 0.5,
                              }}
                              aria-label="Delete member"
                              title={delCheck?.allowed ? 'Delete member' : delCheck?.reason}
                              onClick={() => onDeleteMember(member)}
                            >
                              <IconTrash size={14} className="icon-sm" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            // Swipe-left-delete / swipe-right-edit (via SwipeableRow below)
            // is the entry point on touch; non-admin rows skip the wrapper
            // entirely, same pattern as ExpenseList's ConditionalSwipe.
            if (!isAdmin) return row;
            return (
              <SwipeableRow
                key={member.id}
                plain
                onEdit={() => handleStartEditMemberLocal(member)}
                onDelete={delCheck?.allowed ? () => onDeleteMember(member) : undefined}
              >
                {row}
              </SwipeableRow>
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
          <div className="glass-card ledger-empty" style={{ borderStyle: 'dashed' }}>
            <div className="ledger-rule" />
            <div className="ledger-empty-prompt">
              <span className="ledger-badge ledger-badge-tilt-right" aria-hidden="true">
                <IconTag size={14} className="icon-sm" />
              </span>
              <p>No groups yet. Create one to split expenses across a few people in a single tap.</p>
            </div>
            <div className="ledger-rule" />
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
