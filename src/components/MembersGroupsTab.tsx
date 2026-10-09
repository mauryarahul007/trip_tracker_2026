import React from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import type { Group, Member, PreviousMemberSuggestion, MemberRole } from '../types';
import type { MemberBalance } from '../utils/settlement';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { fetchPreviousTripMembers, searchRemoteMemberSuggestions, lookupProfileByEmail } from '../services/tripApi';
import { IconCheck, IconEdit, IconTrash, IconMembers, IconTag, IconBell } from './Icons';
import { SwipeableRow } from './SwipeableRow';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { formatAmount } from '../utils/currency';
import { formatLastSeen } from '../utils/lastSeen';
import { useTripStore } from '../store/tripStore';
import { buildAutoGroupName } from '../utils/groupNaming';
import { shareTextOrWhatsApp } from '../utils/shareText';
import { triggerHaptic } from '../utils/haptics';

type Props = {
  showMembersRequiredNotice: boolean;
  dismissMembersRequiredNotice: () => void;

  activeTripMembers: Member[];
  visibleMembers: Member[];
  archivedMembers: Member[];
  balances: MemberBalance[];
  currencySymbol: string;
  onToggleArchiveMember: (id: string) => void;
  onSaveMember: (
    name: string,
    id: string | null,
    linkedUserId?: string | null,
    dates?: { joinDate?: string | null; leaveDate?: string | null },
    email?: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteMember: (member: Member) => void;

  visibleTripGroups: Group[];
  onSaveGroup: (name: string, memberIds: string[], id: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteGroup: (group: Group) => void;

  members: Record<string, Member>;
  isAdmin: boolean;
  tripOwnerId: string;
  adminMemberIds?: string[];
  memberRoles?: Record<string, MemberRole>;
  onSetMemberAdminRole?: (memberId: string, isAdmin: boolean) => Promise<void>;
  onSetMemberRole?: (memberId: string, role: MemberRole) => Promise<void>;
  currentUserId: string | null;
  // Bumped by the nav bar's FAB when it's tapped while this tab is active
  // (see NavTabs) -- any change opens the add-member popup, the value
  // itself is unused.
  addMemberSignal?: number;
  onlineUserIds?: string[];
  lastSeenByUserId?: Record<string, string>;
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
  memberRoles,
  onSetMemberAdminRole,
  onSetMemberRole,
  currentUserId,
  addMemberSignal,
  onlineUserIds,
  lastSeenByUserId,
}: Props) {
  const showLastSeen = useTripStore((s) => s.isFeatureEnabled('enableMemberLastSeen'));
  // enableMemberMoneyRow: a Remind button beside anyone (other than you) who
  // owes money, sharing a ready-made nudge through the phone's share sheet.
  const showMemberRemind = useTripStore((s) => s.isFeatureEnabled('enableMemberMoneyRow'));
  const tripName = useTripStore((s) => s.trips.find((t) => t.id === s.activeTripId)?.name);
  const dateRangeMembershipEnabled = useTripStore((s) => s.isFeatureEnabled('enableDateRangeMembership'));
  // Member Form State
  const [newMemberName, setNewMemberName] = React.useState('');
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [emailManuallyEdited, setEmailManuallyEdited] = React.useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = React.useState(false);
  const [resolvedProfile, setResolvedProfile] = React.useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [editingMember, setEditingMember] = React.useState<Member | null>(null);
  const [memberJoinDate, setMemberJoinDate] = React.useState('');
  const [memberLeaveDate, setMemberLeaveDate] = React.useState('');
  const [memberFormError, setMemberFormError] = React.useState('');
  const [isSavingMember, setIsSavingMember] = React.useState(false);
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

  // Real-time lookup of Supabase profiles matching entered Gmail
  React.useEffect(() => {
    const trimmed = newMemberEmail.trim().toLowerCase();
    if (!trimmed.endsWith('@gmail.com') || trimmed.length <= 10) {
      setResolvedProfile(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const profile = await lookupProfileByEmail(trimmed);
        setResolvedProfile(profile);
        if (profile?.id) {
          setSelectedLinkedUserId(profile.id);
        }
      } catch {
        // ignore
      } finally {
        setIsCheckingEmail(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newMemberEmail]);

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
  const [isSavingGroup, setIsSavingGroup] = React.useState(false);

  // Register group modal/form into browser history stack (WhatsApp hierarchical navigation)
  useHistoryBack(showAddGroup || Boolean(editingGroup), () => {
    setShowAddGroup(false);
    setEditingGroup(null);
    setGroupFormError('');
  });
  useEscapeKey(showAddGroup || Boolean(editingGroup), () => {
    setShowAddGroup(false);
    setEditingGroup(null);
    setGroupFormError('');
  });

  // Register member typeahead dropdown into browser history stack
  useHistoryBack(isDropdownOpen, () => {
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  });
  useEscapeKey(isDropdownOpen, () => {
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  });

  // Register member add/edit popup into browser history stack
  useHistoryBack(showAddForm, () => {
    setShowAddForm(false);
    setAddAnother(false);
    setEditingMember(null);
    setNewMemberName('');
    setNewMemberEmail('');
    setEmailManuallyEdited(false);
    setResolvedProfile(null);
    setSelectedLinkedUserId(null);
    setMemberFormError('');
  });
  useEscapeKey(showAddForm, () => {
    setShowAddForm(false);
    setAddAnother(false);
    setEditingMember(null);
    setNewMemberName('');
    setNewMemberEmail('');
    setEmailManuallyEdited(false);
    setResolvedProfile(null);
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
    setNewMemberEmail('');
    setEmailManuallyEdited(false);
    setResolvedProfile(null);
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
    if (isSavingMember) return;
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setMemberFormError('');
    setIsSavingMember(true);
    let res: { success: boolean; error?: string };
    const emailToUse = suggestion.email || `${suggestion.name.toLowerCase().replace(/[^a-z0-9._%+-]/g, '')}@gmail.com`;
    try {
      res = await onSaveMember(suggestion.name, null, suggestion.linkedUserId || null, undefined, emailToUse);
    } finally {
      setIsSavingMember(false);
    }
    if (res.success) {
      setNewMemberName('');
      setNewMemberEmail('');
      setEmailManuallyEdited(false);
      setResolvedProfile(null);
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

  const handleAddMemberLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newMemberName.trim();
    const emailTrimmed = newMemberEmail.trim().toLowerCase();

    if (!nameTrimmed) {
      setMemberFormError('Member name cannot be empty.');
      return;
    }

    if (!editingMember) {
      if (!emailTrimmed) {
        setMemberFormError('Gmail address is mandatory.');
        return;
      }
      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
      if (!gmailRegex.test(emailTrimmed)) {
        setMemberFormError('Only @gmail.com addresses are supported right now.');
        return;
      }
    } else if (emailTrimmed) {
      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
      if (!gmailRegex.test(emailTrimmed)) {
        setMemberFormError('Only @gmail.com addresses are supported right now.');
        return;
      }
    }

    if (isSavingMember || duplicateTripMember) {
      if (duplicateTripMember) setMemberFormError(`A member named "${duplicateTripMember.name}" is already in this trip.`);
      return;
    }

    setIsDropdownOpen(false);
    // If exact match exists in DB, automatically inherit their linkedUserId
    const linkedIdToUse =
      resolvedProfile?.id ||
      selectedLinkedUserId ||
      (matchingExistingPerson ? matchingExistingPerson.linkedUserId : null);

    setIsSavingMember(true);
    try {
      const res = await onSaveMember(
        nameTrimmed,
        editingMember ? editingMember.id : null,
        editingMember ? undefined : linkedIdToUse,
        editingMember && dateRangeMembershipEnabled
          ? { joinDate: memberJoinDate || null, leaveDate: memberLeaveDate || null }
          : undefined,
        editingMember ? (editingMember.email || emailTrimmed || null) : emailTrimmed
      );
      if (res.success) {
        setNewMemberName('');
        setNewMemberEmail('');
        setEmailManuallyEdited(false);
        setResolvedProfile(null);
        setSelectedLinkedUserId(null);
        setEditingMember(null);
        setMemberJoinDate('');
        setMemberLeaveDate('');
        setMemberFormError('');
        if (!addAnother) {
          setShowAddForm(false);
        } else {
          memberInputRef.current?.focus();
        }
      } else if (res.error) {
        setMemberFormError(res.error);
      }
    } catch {
      setMemberFormError('Something went wrong, please try again.');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleStartEditMemberLocal = (member: Member) => {
    setIsDropdownOpen(false);
    setEditingMember(member);
    setNewMemberName(member.name);
    setNewMemberEmail(member.email || '');
    setEmailManuallyEdited(Boolean(member.email));
    setResolvedProfile(null);
    setSelectedLinkedUserId(member.linkedUserId || null);
    setMemberJoinDate(member.joinDate || '');
    setMemberLeaveDate(member.leaveDate || '');
    setMemberFormError('');
    setAddAnother(false);
    setShowAddForm(true);
  };

  const handleCancelMemberEditLocal = () => {
    setIsDropdownOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setEmailManuallyEdited(false);
    setResolvedProfile(null);
    setSelectedLinkedUserId(null);
    setEditingMember(null);
    setMemberJoinDate('');
    setMemberLeaveDate('');
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
    if (isSavingGroup) return;
    const memberIds = Object.keys(selectedGroupMembers).filter((id) => selectedGroupMembers[id]);
    setIsSavingGroup(true);
    try {
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
    } catch {
      setGroupFormError('Something went wrong, please try again.');
    } finally {
      setIsSavingGroup(false);
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
  const memberFormRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (showAddForm) {
      const timer = setTimeout(() => {
        memberInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showAddForm]);

  // skipAutoFocus: the effect above already places initial focus on the
  // name input -- this hook only adds Tab-trapping and Escape-to-close.
  // Passing onEscape as undefined while the dropdown is open lets the
  // keydown event fall through to handleKeyDown's own Escape handler
  // (which just closes the dropdown) instead of closing the whole modal.
  useFocusTrap(memberFormRef, isAdmin && showAddForm, true, isDropdownOpen ? undefined : handleCancelMemberEditLocal);

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
      <div className="member-section-head">
        <h3 className="member-section-title">Trip Members</h3>
      </div>

      {isAdmin && showAddForm && createPortal(
        // Portal to <body> -- this tab's content lives inside .tab-pane,
        // which has its own mask-image (for the scroll-edge fade) that
        // also clips position:fixed descendants rendered inside it, so a
        // modal built inline here was rendering invisible above the fold.
        <div className="modal-overlay" onClick={handleCancelMemberEditLocal}>
        <form
          ref={memberFormRef}
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
            <label className="form-label" htmlFor="member-name">Name</label>
            <input
              id="member-name"
              ref={memberInputRef}
              type="text"
              required
              autoFocus
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
                const val = e.target.value;
                setNewMemberName(val);
                setSelectedLinkedUserId(null);
                if (!editingMember) {
                  setIsDropdownOpen(true);
                  setHighlightedIndex(-1);
                  if (!emailManuallyEdited) {
                    const sanitized = val.toLowerCase().replace(/[^a-z0-9._%+-]/g, '');
                    setNewMemberEmail(sanitized ? `${sanitized}@gmail.com` : '');
                  }
                }
              }}
              onKeyDown={handleKeyDown}
            />

            {!editingMember && isDropdownOpen && filteredSuggestions.length > 0 && (
              <div
                className="typeahead-dropdown glass-card compositor-blur"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  padding: '6px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  touchAction: 'pan-y',
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
                        <span className="u-hint">Click to add</span>
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

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label" htmlFor="member-gmail">
              Gmail Address {!editingMember && <span style={{ color: 'var(--color-danger)' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="member-gmail"
                type="email"
                required={!editingMember}
                className="input-field"
                placeholder="name@gmail.com"
                value={newMemberEmail}
                autoComplete="off"
                onChange={(e) => {
                  setEmailManuallyEdited(true);
                  setNewMemberEmail(e.target.value);
                }}
              />
              {isCheckingEmail && (
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Checking…
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Must be a @gmail.com address. Automatically links when they sign in with Google.
            </span>
            {resolvedProfile && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: 'var(--color-success, #22C55E)',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✓ Google Account found: {resolvedProfile.display_name || newMemberEmail}</span>
              </div>
            )}
          </div>
          {editingMember && dateRangeMembershipEnabled && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="member-join-date">Joins on</label>
                <input
                  id="member-join-date"
                  type="date"
                  className="input-field"
                  value={memberJoinDate}
                  max={memberLeaveDate || undefined}
                  onChange={(e) => setMemberJoinDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="member-leave-date">Leaves on</label>
                <input
                  id="member-leave-date"
                  type="date"
                  className="input-field"
                  value={memberLeaveDate}
                  min={memberJoinDate || undefined}
                  onChange={(e) => setMemberLeaveDate(e.target.value)}
                />
              </div>
            </div>
          )}
          {editingMember && dateRangeMembershipEnabled && (memberJoinDate || memberLeaveDate) && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              New expenses will default to excluding {editingMember.name} outside this range. Leave blank for the whole trip.
            </p>
          )}
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
              disabled={isSavingMember || Boolean(duplicateTripMember)}
            >
              {isSavingMember ? 'Saving…' : editingMember ? 'Update' : 'Add'}
            </button>
            <button type="button" className="secondary-btn" style={{ flex: 1, padding: '10px' }} onClick={handleCancelMemberEditLocal} disabled={isSavingMember}>Cancel</button>
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
            {isAdmin && (
              <button type="button" className="gradient-btn" style={{ marginTop: '12px' }} onClick={() => setShowAddForm(true)}>
                Add First Member
              </button>
            )}
          </div>
          <div className="ledger-rule" />
        </div>
      ) : (
        <div className="luggage-list">
          {visibleMembers.map((member) => {
            const balance = balances.find((b) => b.memberId === member.id)?.balance ?? 0;
            const owes = balance < -0.01;
            const effectiveRole = memberRoles?.[member.id] || (isMemberAdmin(member) ? 'organizer' : 'contributor');
            const roleLabel = effectiveRole === 'organizer' ? 'Organizer' : effectiveRole === 'viewer' ? 'Viewer' : 'Contributor';
            const moneyAmount =
              balance > 0.01
                ? formatAmount(balance, currencySymbol)
                : owes
                ? formatAmount(Math.abs(balance), currencySymbol)
                : 'Settled';
            const moneyDir = balance > 0.01 ? 'gets back' : owes ? 'owes' : '';
            const canPickRole = Boolean(isAdmin && onSetMemberRole && !isOriginalTripOwner(member));
            const delCheck = isAdmin ? checkCanDeleteMember(member) : null;
            const row = (
              <div key={member.id} className={`luggage-tag member-roster${owes ? ' lt-owe' : ''}${balance > 0.01 ? ' lt-owed' : ''}`}>
                <div className="lt-card">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="lt-initials" referrerPolicy="no-referrer" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="lt-initials" style={{ background: avatarColorForName(member.name) }}>{initial(member.name)}</div>
                  )}
                  <div className="lt-body">
                    <div className="member-roster-main">
                      <div className="member-roster-top">
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span className="lt-name">{member.name}</span>
                          {member.email && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                marginTop: '1px',
                              }}
                              title={member.linkedUserId ? 'Linked to Google account' : 'Pending Google account login'}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: member.linkedUserId ? 'var(--color-success, #22C55E)' : 'var(--text-muted)',
                                }}
                              />
                              {member.email}
                            </span>
                          )}
                        </div>
                        <div className="member-roster-money">
                          <span className="lt-amt">{moneyAmount}</span>
                          {moneyDir ? <span className="member-roster-dir">{moneyDir}</span> : null}
                        </div>
                        {showMemberRemind && owes && member.linkedUserId !== currentUserId && (
                          <button
                            type="button"
                            className="member-remind-btn hit-area"
                            aria-label={`Remind ${member.name} to settle`}
                            onClick={() => {
                              triggerHaptic('light');
                              void shareTextOrWhatsApp(
                                'Trip settlement reminder',
                                `Hey ${member.name}, a quick reminder: you owe ${formatAmount(Math.abs(balance), currencySymbol)} on our trip "${tripName || 'Trip'}". Open Trip Tracker to see the split and settle up.`,
                              );
                            }}
                          >
                            <IconBell size={16} />
                          </button>
                        )}
                        {isAdmin && (
                          <div className="member-row-desktop-actions">
                            <button
                              type="button"
                              className="member-icon-btn"
                              aria-label="Edit member"
                              title="Edit member"
                              onClick={() => handleStartEditMemberLocal(member)}
                            >
                              <IconEdit size={15} />
                            </button>
                            <button
                              type="button"
                              className="member-icon-btn"
                              style={{
                                color: delCheck?.allowed ? 'var(--color-danger)' : 'var(--text-muted)',
                                opacity: delCheck?.allowed ? 1 : 0.5,
                              }}
                              aria-label="Delete member"
                              title={delCheck?.allowed ? 'Delete member' : delCheck?.reason}
                              onClick={() => onDeleteMember(member)}
                            >
                              <IconTrash size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="member-roster-meta">
                          {canPickRole ? (
                            <select
                              className="member-role-select"
                              aria-label={`Set role for ${member.name}`}
                              value={effectiveRole}
                              onChange={(e) => onSetMemberRole!(member.id, e.target.value as MemberRole)}
                            >
                              <option value="organizer">Organizer</option>
                              <option value="contributor">Contributor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span>{roleLabel}</span>
                          )}
                          {isAdmin && onSetMemberAdminRole && !onSetMemberRole && !isMemberAdmin(member) && (
                            <button
                              type="button"
                              className="member-inline-action"
                              title="Make this member a Trip Admin"
                              onClick={() => onSetMemberAdminRole(member.id, true)}
                            >
                              Make admin
                            </button>
                          )}
                          {isAdmin && onSetMemberAdminRole && !onSetMemberRole && isMemberAdmin(member) && !isOriginalTripOwner(member) && tripAdminCount > 1 && (
                            <button
                              type="button"
                              className="member-inline-action"
                              title="Demote to Member"
                              onClick={() => onSetMemberAdminRole(member.id, false)}
                            >
                              Demote
                            </button>
                          )}
                          {currentUserId && member.linkedUserId === currentUserId && (
                            <span className="member-roster-chip">You</span>
                          )}
                          {!member.linkedUserId && (
                            <span className="member-roster-chip member-roster-chip-pending" title="Invited, hasn't joined via the trip code yet">
                              Pending
                            </span>
                          )}
                        </div>
                        {showLastSeen && member.linkedUserId && member.linkedUserId !== currentUserId && (
                          <div className="member-roster-seen">
                            {onlineUserIds?.includes(member.linkedUserId)
                              ? 'Online now'
                              : lastSeenByUserId?.[member.linkedUserId]
                                ? `Last seen ${formatLastSeen(lastSeenByUserId[member.linkedUserId])}`
                                : null}
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
      <div className="member-groups-section">
        <div className="member-section-head">
          <h3 className="member-section-title">Groups</h3>
          {isAdmin && !showAddGroup && visibleMembers.length > 0 && (
            <button type="button" className="member-section-action" onClick={() => setShowAddGroup(true)}>
              Create group
            </button>
          )}
        </div>

        {isAdmin && showAddGroup && (
          <form className="glass-card fade-in" onSubmit={handleCreateGroupLocal} style={{ marginBottom: '24px' }}>
            <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>{editingGroup ? 'Edit Group' : 'New Group'}</h4>

            <div className="form-group">
              <label className="form-label" htmlFor="group-name">Group Name</label>
              <input
                id="group-name"
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
              <span className="form-label">Group Members</span>
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
              <button type="submit" className="gradient-btn" style={{ flex: 1, padding: '10px' }} disabled={isSavingGroup}>
                {isSavingGroup ? 'Saving…' : editingGroup ? 'Update Group' : 'Save Group'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px' }}
                onClick={handleCancelGroupFormLocal}
                disabled={isSavingGroup}
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
              {isAdmin && visibleMembers.length > 0 && (
                <button type="button" className="member-section-action" style={{ marginTop: '8px' }} onClick={() => setShowAddGroup(true)}>
                  Create group
                </button>
              )}
            </div>
            <div className="ledger-rule" />
          </div>
        ) : (
          <div className="member-group-list">
            {visibleTripGroups.map((grp) => {
              const grpMemberNames = grp.memberIds
                .map((id) => members[id]?.name)
                .filter(Boolean)
                .join(', ');
              return (
                <div key={grp.id} className="member-group-card">
                  <div className="member-group-copy">
                    <h4 className="member-group-name">{grp.name}</h4>
                    <p className="member-group-members">{grpMemberNames || 'No members'}</p>
                  </div>
                  {isAdmin && (
                    <div className="member-group-actions">
                      <button
                        type="button"
                        className="member-inline-action"
                        onClick={() => handleStartEditGroupLocal(grp)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="member-inline-action member-inline-action-danger"
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
