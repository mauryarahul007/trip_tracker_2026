import React, { useEffect, useState, useMemo } from 'react';
import { useTripStore, getTripNotificationRecipients } from './store/tripStore';
import { useAuthStore } from './store/authStore';
import { calculateSettlements } from './utils/settlement';
import type { Expense, Trip, Group, Member } from './types';
import { exportTripToCSV } from './utils/csvExport';

import { getCurrencySymbol } from './utils/currency';
import { isMissingSupabaseEnv } from './services/supabaseClient';
import { sendPushNotification } from './services/pushApi';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { TripsListScreen } from './components/TripsListScreen';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { BalancesSettlements } from './components/BalancesSettlements';
import { MembersGroupsTab } from './components/MembersGroupsTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { ExpenseReviewModal } from './components/ExpenseReviewModal';
import { UndoToasts } from './components/UndoToasts';
import { NavTabs } from './components/NavTabs';
import { ShareTripModal } from './components/ShareTripModal';
import { NotificationsPanel } from './components/NotificationsPanel';
import { NotificationsBellButton } from './components/NotificationsBellButton';
import { FitHeading } from './components/FitHeading';
import { IconCalendar, IconChevronLeft, IconShare, IconPlus } from './components/Icons';
import { formatDateRange } from './utils/dateRange';
import { useScrollLock } from './utils/useScrollLock';
import { useHistoryBack } from './utils/useHistoryBack';




export default function App() {
  const {
    trips,
    activeTripId,
    members,
    groups,
    expenses,
    categories,
    initialized,
    storageError,
    initialize,
    clearStorageError,
    createTrip,
    updateTrip,
    selectTrip,
    archiveTrip,
    deleteTrip,
    addMember,
    toggleArchiveMember,
    updateMember,
    deleteMember,
    setMemberAdminRole,
    createGroup,
    updateGroup,
    deleteGroup,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
    exportDatabase,
    importDatabase,
    clearDatabase,
    loadDemoTrip,
  } = useTripStore();

  const userEmail = useAuthStore((s) => s.session?.user.email ?? null);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const signOut = useAuthStore((s) => s.signOut);

  // Navigation tabs: 'expenses' | 'members' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'analytics' | 'settings'>('expenses');

  // Appearance — 'system' follows the OS; 'light'/'dark' pin the "night
  // flight" variant explicitly. Persisted locally; it's a display
  // preference, not trip data, so it stays out of the IndexedDB store.
  type ThemePref = 'light' | 'dark' | 'system';
  const [themePref, setThemePref] = useState<ThemePref>(() => {
    const stored = localStorage.getItem('theme-pref');
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (themePref === 'system') {
      delete root.dataset.theme;
      root.style.colorScheme = 'light dark';
    } else {
      root.dataset.theme = themePref;
      root.style.colorScheme = themePref;
    }
    localStorage.setItem('theme-pref', themePref);
  }, [themePref]);

  // Form states - Trips
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState('INR');

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };



  // Form states - Groups
  // Form states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [selectedReviewExpense, setSelectedReviewExpense] = useState<Expense | null>(null);
  // Queue of expense ids still to review after "Review N affected expenses"
  // (a member was removed) — save/cancel on the open form advances to the
  // next id instead of just closing, so the whole batch can be worked
  // through in one pass instead of hunting each one down individually.
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);

  // Expense list search & filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('');
  const [expenseFilterMember, setExpenseFilterMember] = useState('');
  const [expenseFilterDateFrom, setExpenseFilterDateFrom] = useState('');
  const [expenseFilterDateTo, setExpenseFilterDateTo] = useState('');



  // Undo delete toast state
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<Expense | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<Trip | null>(null);
  const [tripUndoTimer, setTripUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<Group | null>(null);
  const [groupUndoTimer, setGroupUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // JSON Import state
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Confirm dialog (replaces window.confirm)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  // Share trip modal
  const [showShareTrip, setShowShareTrip] = useState(false);
  const [showMembersRequiredNotice, setShowMembersRequiredNotice] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  // Lock background scroll when any modal is active
  useScrollLock(Boolean(showShareTrip || selectedReviewExpense || confirmRequest || showGlobalSettings || showAddExpense));

  const syncQueue = useTripStore((s) => s.syncQueue);
  const sessionExpired = useTripStore((s) => s.sessionExpired);
  const lastBackendSyncedAt = useTripStore((s) => s.lastBackendSyncedAt);
  const lastModifiedAt = useTripStore((s) => s.lastModifiedAt);
  const processQueue = useTripStore((s) => s.processQueue);

  // Load state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Track browser connectivity for the backend sync status pill
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const visibleTrips = useMemo(
    () => trips.filter((t) => t.id !== pendingDeleteTrip?.id && !t.archived),
    [trips, pendingDeleteTrip]
  );
  const archivedTrips = useMemo(() => trips.filter((t) => t.archived), [trips]);
  const activeTrip = useMemo(() => trips.find((t) => t.id === activeTripId), [trips, activeTripId]);
  const editingExpense = useMemo(() => expenses.find((e) => e.id === editingExpenseId) || null, [expenses, editingExpenseId]);

  // Reset expense filters when switching trips
  useEffect(() => {
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterMember('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
  }, [activeTripId]);

  // Track scroll on active tab-pane with directional hysteresis for smooth fluid header morphing
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    let lastScrollTop = 0;
    let ticking = false;

    const handleScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('tab-pane')) {
        return;
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollTop = target.scrollTop;

          if (currentScrollTop <= 15) {
            // Reached the top of the scroll container: always expand
            setIsHeaderScrolled(false);
          } else if (currentScrollTop > 45 && !isHeaderScrolled) {
            // Scrolled down past threshold: smoothly collapse into compact glass mode
            setIsHeaderScrolled(true);
          } else if (currentScrollTop < lastScrollTop - 25 && isHeaderScrolled && currentScrollTop < 120) {
            // Scrolling up near top of page: expand early for a natural fluid feel
            setIsHeaderScrolled(false);
          }

          lastScrollTop = Math.max(0, currentScrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [isHeaderScrolled]);

  useEffect(() => {
    setIsHeaderScrolled(false);
  }, [activeTripId, activeTab]);

  const activeTripExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.tripId === activeTripId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [expenses, activeTripId]);

  // Device <-> backend sync status for the header pill
  type SyncStatus = 'offline' | 'session-expired' | 'out-of-sync' | 'synced';
  const syncStatus: SyncStatus = useMemo(() => {
    if (sessionExpired) return 'session-expired';
    if (syncQueue.length > 0) return 'out-of-sync';
    if (!isOnline) return 'offline';
    if (lastBackendSyncedAt !== null && lastModifiedAt > lastBackendSyncedAt) return 'out-of-sync';
    return 'synced';
  }, [isOnline, sessionExpired, syncQueue.length, lastModifiedAt, lastBackendSyncedAt]);

  const syncStatusLabel = useMemo(() => {
    if (syncStatus === 'session-expired') return 'Session expired';
    if (syncStatus === 'out-of-sync') return `Out of sync (${syncQueue.length})`;
    if (syncStatus === 'offline') return 'Offline';
    if (!lastBackendSyncedAt) return 'Synced';
    const diffMins = Math.floor((Date.now() - lastBackendSyncedAt) / 60000);
    if (diffMins < 1) return 'Synced just now';
    if (diffMins < 60) return `Synced ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Synced ${diffHours}h ago`;
    return 'Synced yesterday';
  }, [syncStatus, syncQueue.length, lastBackendSyncedAt]);

  // Auto-sync pending offline queue whenever network connectivity is restored
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, syncQueue.length, processQueue]);

  const handleSyncClick = () => {
    if (syncStatus === 'session-expired') {
      signOut();
      return;
    }
    if (!isOnline) return;
    processQueue();
  };


  // Search + category/member filters, applied only to the visible expense list
  const filteredExpenses = useMemo(() => {
    return activeTripExpenses.filter((e) => {
      if (expenseSearch.trim() && !e.title.toLowerCase().includes(expenseSearch.trim().toLowerCase())) return false;
      if (expenseFilterCategory && e.category !== expenseFilterCategory) return false;
      if (expenseFilterMember && e.paidBy !== expenseFilterMember && !e.splitMemberIds.includes(expenseFilterMember)) return false;
      if (expenseFilterDateFrom && e.date < expenseFilterDateFrom) return false;
      if (expenseFilterDateTo && e.date > expenseFilterDateTo) return false;
      return true;
    });
  }, [activeTripExpenses, expenseSearch, expenseFilterCategory, expenseFilterMember, expenseFilterDateFrom, expenseFilterDateTo]);

  const hasActiveExpenseFilters = useMemo(() => {
    return !!(expenseSearch || expenseFilterCategory || expenseFilterMember || expenseFilterDateFrom || expenseFilterDateTo);
  }, [expenseSearch, expenseFilterCategory, expenseFilterMember, expenseFilterDateFrom, expenseFilterDateTo]);

  const clearExpenseFilters = () => {
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterMember('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
  };

  // Get active trip members and groups
  const activeTripMembers = useMemo(() => {
    return activeTrip
      ? activeTrip.memberIds.map((id) => members[id]).filter(Boolean)
      : [];
  }, [activeTrip, members]);

  const visibleMembers = useMemo(() => activeTripMembers.filter((m) => !m.archived), [activeTripMembers]);
  const archivedMembers = useMemo(() => activeTripMembers.filter((m) => m.archived), [activeTripMembers]);

  const activeTripGroups = useMemo(() => {
    return activeTrip
      ? (activeTrip.groupIds || []).map((id) => groups[id]).filter(Boolean)
      : [];
  }, [activeTrip, groups]);

  const visibleTripGroups = useMemo(() => {
    return activeTripGroups.filter((g) => g.id !== pendingDeleteGroup?.id);
  }, [activeTripGroups, pendingDeleteGroup]);

  // Permission model: admin = trip creator or any member with admin role.
  // Participant = the member they've claimed via /join (own-expenses only,
  // can only settle transfers they're the payer or payee of).
  const isAdmin = useMemo(() => {
    if (!activeTrip) return false;
    if (userId && activeTrip.ownerId === userId) return true;
    if (userId) {
      const myMember = activeTripMembers.find((m) => m.linkedUserId === userId);
      if (myMember && activeTrip.adminMemberIds && activeTrip.adminMemberIds.includes(myMember.id)) {
        return true;
      }
    }
    // In guest/offline mode or when no admin list is defined yet
    if (!userId && (!activeTrip.adminMemberIds || activeTrip.adminMemberIds.length === 0)) {
      return true;
    }
    return false;
  }, [activeTrip, userId, activeTripMembers]);
  const myMemberId = useMemo(() => activeTripMembers.find((m) => m.linkedUserId === userId)?.id ?? null, [activeTripMembers, userId]);



  // Settlements and Net balances calculation
  const { balances, transfers } = useMemo(() => {
    return activeTrip
      ? calculateSettlements(activeTrip, members, expenses, visibleTripGroups)
      : { balances: [], transfers: [] };
  }, [activeTrip, members, expenses, visibleTripGroups]);

  // Filters out settlements to keep expense analytics clean
  const nonSettlementExpenses = useMemo(() => {
    return activeTripExpenses.filter((e) => !e.title.startsWith('Settlement:'));
  }, [activeTripExpenses]);

  const totalSpent = useMemo(() => {
    return nonSettlementExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [nonSettlementExpenses]);

  // Category breakdown calculations
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    categories.forEach((cat) => {
      totals[cat.id] = 0;
    });
    nonSettlementExpenses.forEach((exp) => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });
    return totals;
  }, [categories, nonSettlementExpenses]);

  const CATEGORY_COLORS: Record<string, string> = {
    'cat-food': '#6366f1', // Indigo
    'cat-stay': '#3b82f6', // Blue
    'cat-travel': '#db2777', // Pink — was cyan, too close to Stay's blue on the wheel
    'cat-activities': '#10b981', // Emerald
    'cat-shopping': '#f59e0b', // Amber
    'cat-misc': '#8b5cf6', // Violet
  };
  const getCatColor = (id: string, _idx: number) => {
    if (CATEGORY_COLORS[id]) return CATEGORY_COLORS[id];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  };

  const categoryData = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat ? cat.name : 'Other',
          icon: cat?.icon || '🏷️',
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTotals, categories, totalSpent]);

  // Member spend calculations
  const memberSpentMap = useMemo(() => {
    const spentMap: Record<string, number> = {};
    visibleMembers.forEach((m) => {
      spentMap[m.id] = 0;
    });
    nonSettlementExpenses.forEach((exp) => {
      if (spentMap[exp.paidBy] !== undefined) {
        spentMap[exp.paidBy] += exp.amount;
      }
    });
    return spentMap;
  }, [visibleMembers, nonSettlementExpenses]);

  const memberSpentList = useMemo(() => {
    return visibleMembers.map((m) => ({
      id: m.id,
      name: m.name,
      amount: memberSpentMap[m.id] || 0,
      percentage: totalSpent > 0 ? ((memberSpentMap[m.id] || 0) / totalSpent) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [visibleMembers, memberSpentMap, totalSpent]);

  const biggestSpender = useMemo(() => {
    return memberSpentList[0] && memberSpentList[0].amount > 0 ? memberSpentList[0].name : 'N/A';
  }, [memberSpentList]);

  const averageCost = useMemo(() => {
    return visibleMembers.length > 0 ? totalSpent / visibleMembers.length : 0;
  }, [visibleMembers.length, totalSpent]);

  // Daily spend timeline calculations
  const dailySpendData = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    nonSettlementExpenses.forEach((exp) => {
      const dateStr = exp.date;
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + exp.amount;
    });

    const sortedDates = Object.keys(dailyTotals).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sortedDates.map((dateStr) => {
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      return {
        rawDate: dateStr,
        dateLabel: formattedDate,
        amount: dailyTotals[dateStr] || 0,
      };
    });
  }, [nonSettlementExpenses]);





  // Form submissions
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName || !newTripStart || !newTripEnd) return;
    if (editingTripId) {
      await updateTrip(editingTripId, newTripName, newTripStart, newTripEnd);
    } else {
      await createTrip(newTripName, newTripStart, newTripEnd, newTripCurrency);
    }
    setNewTripName('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setEditingTripId(null);
    setShowAddTrip(false);
  };

  const handleStartEditTrip = (trip: Trip) => {
    setEditingTripId(trip.id);
    setNewTripName(trip.name);
    setNewTripStart(trip.startDate);
    setNewTripEnd(trip.endDate);
    setShowAddTrip(true);
  };

  const handleCancelTripForm = () => {
    setEditingTripId(null);
    setNewTripName('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setShowAddTrip(false);
  };

  const handleSaveMember = async (name: string, id: string | null, linkedUserId?: string | null): Promise<{ success: boolean; error?: string }> => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return { success: false, error: 'Name cannot be empty.' };

    const nameLower = nameTrimmed.toLowerCase();
    const isDuplicateMember = activeTripMembers.some(
      (m) => (m.name.toLowerCase() === nameLower || (linkedUserId && m.linkedUserId === linkedUserId)) && m.id !== id
    );
    const isDuplicateGroup = activeTripGroups.some(
      (g) => g.name.toLowerCase() === nameLower
    );

    if (isDuplicateMember || isDuplicateGroup) {
      return { success: false, error: 'A member or group with this name already exists on this trip.' };
    }

    if (id) {
      await updateMember(id, nameTrimmed);
    } else {
      await addMember(nameTrimmed, linkedUserId);
      // Only fires for members added directly with a known account (e.g.
      // picked from a "people you've traveled with before" suggestion) —
      // a bare placeholder member has no linked user to notify yet, and
      // gets covered separately once they actually join via the trip code
      // (JoinTripScreen's own member_joined notification already covers
      // telling the existing members about *that* case).
      if (linkedUserId && activeTripId) {
        sendPushNotification(
          [linkedUserId],
          activeTrip?.name || 'Trip Tracker',
          'member_added',
          undefined,
          activeTripId
        );

        // Everyone else already on the trip should hear about the new
        // member too, not just the person who added them.
        const existingRecipients = getTripNotificationRecipients(trips, members, activeTripId, userId || '').filter(
          (recipientId) => recipientId !== linkedUserId
        );
        sendPushNotification(
          existingRecipients,
          activeTrip?.name || 'Trip Tracker',
          'member_added_notice',
          { memberName: nameTrimmed },
          activeTripId
        );
      }
    }
    setShowMembersRequiredNotice(false);
    return { success: true };
  };

  const handleDeleteMember = (member: Member) => {
    // Check if target is the original trip owner and current user is not the owner
    const isOwner = (activeTrip?.ownerId && member.linkedUserId === activeTrip.ownerId) || (!activeTrip?.ownerId && activeTripMembers[0]?.id === member.id);
    if (isOwner && userId && activeTrip?.ownerId && userId !== activeTrip.ownerId) {
      setConfirmRequest({
        title: 'Cannot delete Trip Owner',
        message: `"${member.name}" is the creator and owner of this trip. Secondary admins cannot delete the trip owner.`,
        confirmLabel: 'Understood',
        danger: false,
        onConfirm: () => {},
      });
      return;
    }

    // Check if this member is an admin on the active trip
    const isTargetAdmin =
      activeTrip?.adminMemberIds && activeTrip.adminMemberIds.length > 0
        ? activeTrip.adminMemberIds.includes(member.id)
        : member.linkedUserId === activeTrip?.ownerId || activeTripMembers[0]?.id === member.id;

    if (isTargetAdmin) {
      const remainingAdmins = activeTripMembers.filter((m) => {
        if (m.id === member.id) return false;
        return activeTrip?.adminMemberIds && activeTrip.adminMemberIds.length > 0
          ? activeTrip.adminMemberIds.includes(m.id)
          : m.linkedUserId === activeTrip?.ownerId || activeTripMembers[0]?.id === m.id;
      });

      const remainingGoogleAdmins = remainingAdmins.filter((m) => Boolean(m.linkedUserId));

      if (remainingGoogleAdmins.length === 0) {
        let msg = `"${member.name}" cannot be deleted because a trip must retain at least one Admin linked to a Google account.`;
        if (remainingAdmins.length > 0) {
          msg += ` The other admin ("${remainingAdmins[0].name}") is not linked to a Google account. Please link their Google account or promote a Google-linked member to Admin before removing this admin.`;
        } else {
          msg += ` Please promote a Google-linked member to Admin before removing this admin.`;
        }

        setConfirmRequest({
          title: 'Google-linked Admin required',
          message: msg,
          confirmLabel: 'Understood',
          danger: false,
          onConfirm: () => {},
        });
        return;
      }
    }

    const hasTransactions = activeTripExpenses.some(
      (e) => 
        e.paidBy === member.id || 
        e.paidBy === member.name || 
        e.splitMemberIds.includes(member.id) ||
        e.splitMemberIds.includes(member.name)
    );

    let message = `Are you sure you want to permanently delete member "${member.name}"?`;
    if (hasTransactions) {
      message = `This member has recorded transaction entries. Deleting them will redistribute their expenses and split shares equally among the other remaining members of this trip. Are you sure you want to proceed?`;
    }

    setConfirmRequest({
      title: 'Delete member',
      message,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => deleteMember(member.id),
    });
  };

  const handleAddCategory = async (name: string, icon: string) => {
    await addCategory(name, icon);
  };

  const handleDeleteCategory = async (categoryId: string, replacementCategoryId: string | null) => {
    if (replacementCategoryId) {
      // Find all expenses in the active trip using the deleted category and update them to replacement category
      const affectedExpenses = expenses.filter((e) => e.tripId === activeTripId && e.category === categoryId);
      for (const exp of affectedExpenses) {
        await updateExpense(exp.id, {
          title: exp.title,
          amount: exp.amount,
          currency: exp.currency,
          category: replacementCategoryId,
          date: exp.date,
          paidBy: exp.paidBy,
          splitMode: exp.splitMode,
          splitMemberIds: exp.splitMemberIds,
          splitConfig: exp.splitConfig,
        });
      }
    }
    await deleteCategory(categoryId);
  };

  const handleSaveGroup = async (name: string, memberIds: string[], id: string | null): Promise<{ success: boolean; error?: string }> => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return { success: false, error: 'Group name cannot be empty.' };
    if (memberIds.length === 0) return { success: false, error: 'Please select at least one member to add to the group.' };

    const nameLower = nameTrimmed.toLowerCase();
    const isDuplicateMember = activeTripMembers.some(
      (m) => m.name.toLowerCase() === nameLower
    );
    const isDuplicateGroup = activeTripGroups.some(
      (g) => g.name.toLowerCase() === nameLower && g.id !== id
    );

    if (isDuplicateMember || isDuplicateGroup) {
      return { success: false, error: 'A member or group with this name already exists on this trip.' };
    }

    if (id) {
      await updateGroup(id, nameTrimmed, memberIds);
    } else {
      await createGroup(nameTrimmed, memberIds);
    }
    return { success: true };
  };

  const handleSaveExpense = async (expenseData: {
    title: string;
    amount: number;
    category: string;
    date: string;
    paidBy: string;
    splitMode: 'equal' | 'custom' | 'exact' | 'percentage';
    splitMemberIds: string[];
    splitConfig?: Record<string, number>;
    receiptImage?: string;
    location?: import('./types').ExpenseLocation | null;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!activeTripId) return { success: false, error: 'No active trip' };
    try {
      const expensePayload = {
        title: expenseData.title,
        amount: expenseData.amount,
        currency: activeTrip?.baseCurrency || 'INR',
        category: expenseData.category,
        date: expenseData.date,
        paidBy: expenseData.paidBy,
        splitMode: expenseData.splitMode,
        splitMemberIds: expenseData.splitMemberIds,
        splitConfig: expenseData.splitConfig,
        receiptImage: expenseData.receiptImage,
        location: expenseData.location,
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expensePayload);
      } else {
        await addExpense(expensePayload);
      }
      advanceReviewQueueOrClose();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save expense.' };
    }
  };

  const handleCancelExpenseForm = () => {
    advanceReviewQueueOrClose();
  };

  // Moves to the next expense in the affected-by-a-removed-member review
  // queue (if one is running), or just closes the form like before.
  const advanceReviewQueueOrClose = () => {
    if (reviewQueue.length === 0) {
      setEditingExpenseId(null);
      setShowAddExpense(false);
      return;
    }
    const [nextId, ...rest] = reviewQueue;
    setReviewQueue(rest);
    setEditingExpenseId(nextId);
    setShowAddExpense(true);
  };

  const handleOpenAddExpense = () => {
    if (visibleMembers.length === 0) {
      setShowMembersRequiredNotice(true);
      setActiveTab('members');
      return;
    }
    setReviewQueue([]);
    setEditingExpenseId(null);
    setShowAddExpense(true);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setReviewQueue([]);
    setEditingExpenseId(exp.id);
    setShowAddExpense(true);
  };

  // Entry point for the "Review N affected expenses" banner — opens the
  // first expense a removed member touched and queues the rest so save/
  // cancel walks through them one after another.
  const handleReviewAffectedExpenses = (expenseIds: string[]) => {
    if (expenseIds.length === 0) return;
    const [firstId, ...rest] = expenseIds;
    setReviewQueue(rest);
    setEditingExpenseId(firstId);
    setShowAddExpense(true);
  };

  const UNDO_DURATION_MS = 2000;

  // Undo-delete: stage the expense, start a 2-second timer
  const handleDeleteExpense = (exp: Expense) => {
    // Cancel any prior pending deletion first
    if (undoTimer) clearTimeout(undoTimer);
    setPendingDeleteExpense(exp);
    const timer = setTimeout(() => {
      deleteExpense(exp.id);
      setPendingDeleteExpense(null);
    }, UNDO_DURATION_MS);
    setUndoTimer(timer);
  };

  const handleUndoDelete = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
    setPendingDeleteExpense(null);
  };

  // Deleting a trip takes everyone's members and expenses with it, so it
  // gets a deliberate confirm step in front of the undo-toast staging below
  // — the toast is a grace period for a slip, not the only safety net.
  const handleDeleteTrip = (trip: Trip) => {
    setConfirmRequest({
      title: 'Delete trip',
      message: `Delete "${trip.name}" and all of its members and expenses? You'll have a few seconds to undo right after.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        if (tripUndoTimer) clearTimeout(tripUndoTimer);
        setPendingDeleteTrip(trip);
        const timer = setTimeout(() => {
          deleteTrip(trip.id);
          setPendingDeleteTrip(null);
        }, UNDO_DURATION_MS);
        setTripUndoTimer(timer);
      },
    });
  };

  const handleUndoDeleteTrip = () => {
    if (tripUndoTimer) clearTimeout(tripUndoTimer);
    setTripUndoTimer(null);
    setPendingDeleteTrip(null);
  };

  const handleArchiveTrip = (trip: Trip) => {
    archiveTrip(trip.id, true);
  };

  const handleRestoreTrip = (trip: Trip) => {
    archiveTrip(trip.id, false);
  };

  // Undo-delete: stage the group, start a 2-second timer
  const handleDeleteGroup = (group: Group) => {
    if (groupUndoTimer) clearTimeout(groupUndoTimer);
    setPendingDeleteGroup(group);
    const timer = setTimeout(() => {
      deleteGroup(group.id);
      setPendingDeleteGroup(null);
    }, UNDO_DURATION_MS);
    setGroupUndoTimer(timer);
  };

  const handleUndoDeleteGroup = () => {
    if (groupUndoTimer) clearTimeout(groupUndoTimer);
    setGroupUndoTimer(null);
    setPendingDeleteGroup(null);
  };



  // Record a settlement transfer. fromId/toId are the real member ids that
  // record the ledger entry; fromLabel/toLabel are what the user picked the
  // transfer between (a member name, or a group name for merged settlements).
  const handleSettle = (fromId: string, toId: string, amount: number, fromLabel: string, toLabel: string) => {
    const fromMember = members[fromId];
    const toMember = members[toId];
    if (!fromMember || !toMember || !activeTrip || !(amount > 0)) return;

    const currencySymbol = getCurrencySymbol(activeTrip.baseCurrency);
    const payerNote = fromLabel !== fromMember.name ? ` (paid by ${fromMember.name})` : '';
    const receiverNote = toLabel !== toMember.name ? ` (received by ${toMember.name})` : '';
    setConfirmRequest({
      title: 'Confirm settlement',
      message: `Mark transfer: ${fromLabel} pays ${toLabel} ${currencySymbol}${amount.toFixed(2)}${payerNote}${receiverNote} as settled?`,
      confirmLabel: 'Mark Settled',
      onConfirm: () => {
        addExpense({
          title: `Settlement: ${fromLabel} ➔ ${toLabel}`,
          amount: amount,
          currency: activeTrip.baseCurrency,
          category: 'cat-misc',
          date: new Date().toISOString().split('T')[0],
          paidBy: fromId, // paid by debtor
          splitMode: 'exact',
          splitMemberIds: [toId], // split 100% to creditor
          splitConfig: { [toId]: amount }
        });
      },
    });
  };

  const handleFilterByMember = (memberId: string) => {
    setExpenseFilterMember(memberId);
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
    setActiveTab('expenses');
  };

  const handleImport = async () => {
    if (!importJson) return;
    const success = await importDatabase(importJson);
    if (success) {
      setImportStatus('success');
      setImportJson('');
      setTimeout(() => {
        setImportStatus('idle');
        setShowImportArea(false);
      }, 2000);
    } else {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const triggerExport = () => {
    const json = exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-tracker-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerCsvExport = () => {
    if (!activeTrip) return;
    const csv = exportTripToCSV(activeTrip, members, expenses, visibleTripGroups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-tracker-export-${activeTrip.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearDatabase = () => {
    setConfirmRequest({
      title: 'Clear All Data',
      message: 'This will permanently delete all trips, members, groups, and expenses. This action cannot be undone. Are you sure you want to proceed?',
      confirmLabel: 'Clear All',
      danger: true,
      onConfirm: async () => {
        await clearDatabase();
        setConfirmRequest(null);
      },
    });
  };

  const handleLoadDemoTrip = async () => {
    await loadDemoTrip();
    setActiveTab('expenses');
  };

  // Wire swipe-back gesture, hardware/OS back button, and the browser Back
  // button to close whichever screen/modal is open, deepest first (WhatsApp LIFO navigation stack).
  useHistoryBack(!!activeTripId, () => selectTrip(null));
  useHistoryBack(!!activeTripId && activeTab !== 'expenses', () => setActiveTab('expenses'));
  useHistoryBack(showAddTrip, handleCancelTripForm);
  useHistoryBack(showAddExpense, handleCancelExpenseForm);
  useHistoryBack(!!selectedReviewExpense, () => setSelectedReviewExpense(null));
  useHistoryBack(showShareTrip, () => setShowShareTrip(false));
  useHistoryBack(showGlobalSettings, () => setShowGlobalSettings(false));
  useHistoryBack(!!confirmRequest, () => setConfirmRequest(null));

  // Loading view
  if (!initialized) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-family-title)', marginBottom: '16px' }}>Trip Tracker 2026</h2>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(15, 23, 42, 0.05)',
            borderTopColor: 'var(--primary-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (isMissingSupabaseEnv) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '460px', width: '100%', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--color-danger-soft, rgba(239, 68, 68, 0.12))',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '20px', marginBottom: '12px' }}>
            Missing API Credentials
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
            To run Trip Tracker locally, you must copy <code>.env.example</code> to <code>.env</code> in the project root and fill in your Supabase credentials:
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.03)',
            padding: '12px 14px',
            borderRadius: '8px',
            textAlign: 'left',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflowX: 'auto',
            marginBottom: '20px',
            border: '1.5px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}>
            VITE_SUPABASE_URL=https://your-project.supabase.co
            {"\n"}VITE_SUPABASE_ANON_KEY=your-anon-key
          </pre>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            After saving the <code>.env</code> file, restart your local development server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Storage Toast Alert */}
      {storageError && isOnline && (
        <div className="toast-alert">
          <div>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Storage Error</strong>
            <span style={{ fontSize: '13px', opacity: 0.9 }}>{storageError}</span>
          </div>
          <button className="toast-close" onClick={clearStorageError}>&times;</button>
        </div>
      )}

      {/* Screen 1: Trips List */}
      {!activeTripId ? (
        <TripsListScreen
          trips={visibleTrips}
          members={members}
          showAddTrip={showAddTrip}
          setShowAddTrip={setShowAddTrip}
          newTripName={newTripName}
          setNewTripName={setNewTripName}
          newTripStart={newTripStart}
          setNewTripStart={setNewTripStart}
          newTripEnd={newTripEnd}
          setNewTripEnd={setNewTripEnd}
          newTripCurrency={newTripCurrency}
          setNewTripCurrency={setNewTripCurrency}
          editingTripId={editingTripId}
          onCreateTrip={handleCreateTrip}
          onCancelTripForm={handleCancelTripForm}
          onStartEditTrip={handleStartEditTrip}
          onSelectTrip={(id) => selectTrip(id)}
          onDeleteTrip={handleDeleteTrip}
          onArchiveTrip={handleArchiveTrip}
          onOpenSettings={() => setShowGlobalSettings(true)}
        />
      ) : (
        /* Screen 2: Active Trip Dashboard */
        <div className="trip-dashboard-container fade-in">
          <header className={`app-header trip-dashboard-header ${isHeaderScrolled ? 'is-scrolled' : ''}`}>
            <div className="app-header-top">
              <div className="app-title-group">
                <span className="app-eyebrow">
                  <IconCalendar size={12} className="icon-sm" />
                  {formatDateRange(activeTrip?.startDate || '', activeTrip?.endDate || '')}
                </span>
                <div className="app-title-row">
                  <FitHeading
                    text={activeTrip?.name || ''}
                    className="app-logo"
                    style={{ color: '#F2ECDC' }}
                    maxFontSize={22}
                    minFontSize={14}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <NotificationsBellButton />
                <button
                  data-action="share"
                  className="secondary-btn"
                  style={{ padding: '7px 12px', fontSize: '12px', color: '#F2ECDC', borderColor: 'rgba(242,236,220,0.28)', background: 'rgba(242,236,220,0.06)' }}
                  onClick={() => setShowShareTrip(true)}
                >
                  <IconShare size={14} className="icon-sm" /> Share
                </button>
                <button
                  data-action="trips-back"
                  className="secondary-btn"
                  style={{ padding: '7px 12px', fontSize: '12px', color: '#F2ECDC', borderColor: 'rgba(242,236,220,0.28)', background: 'rgba(242,236,220,0.06)' }}
                  onClick={() => selectTrip(null)}
                >
                  <IconChevronLeft size={14} className="icon-sm" /> Trips
                </button>
              </div>
            </div>
            <div className="app-header-stats">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span>{visibleMembers.length} member{visibleMembers.length === 1 ? '' : 's'}</span>
                <span>{activeTripExpenses.length} expense{activeTripExpenses.length === 1 ? '' : 's'}</span>
              </div>
              <button
                type="button"
                data-action="sync"
                className="sync-header-pill"
                onClick={handleSyncClick}
                disabled={syncStatus === 'offline'}
                title={
                  syncStatus === 'offline'
                    ? 'No connection — changes are saved on this device and will sync once you\'re back online.'
                    : syncStatus === 'session-expired'
                    ? 'Your session expired. Tap to sign in again.'
                    : syncStatus === 'out-of-sync'
                    ? 'Local changes not yet synced with the server. Tap to sync now.'
                    : `Last synced: ${syncStatusLabel}`
                }
                aria-label="Backend Sync Status"
              >
                <span className={`sync-badge-dot ${syncStatus}`} />
                <span>{syncStatusLabel}</span>
              </button>
            </div>
          </header>


          <main className="app-main">
            {/* View Switching Tab Content */}
            <div className="tab-pane" style={{ display: activeTab === 'expenses' ? 'block' : 'none' }}>
              <div className="fade-in">
                <ExpenseList
                  trip={activeTrip}
                  members={members}
                  categories={categories}
                  activeTripMembers={activeTripMembers}
                  activeTripExpenseCount={activeTripExpenses.length}
                  activeTripExpenses={activeTripExpenses}
                  onReviewAffected={handleReviewAffectedExpenses}
                  filteredExpenses={filteredExpenses}
                  pendingDeleteId={pendingDeleteExpense?.id}
                  hasActiveFilters={hasActiveExpenseFilters}
                  search={expenseSearch}
                  setSearch={setExpenseSearch}
                  filterCategory={expenseFilterCategory}
                  setFilterCategory={setExpenseFilterCategory}
                  filterMember={expenseFilterMember}
                  setFilterMember={setExpenseFilterMember}
                  filterDateFrom={expenseFilterDateFrom}
                  setFilterDateFrom={setExpenseFilterDateFrom}
                  filterDateTo={expenseFilterDateTo}
                  setFilterDateTo={setExpenseFilterDateTo}
                  onClearFilters={clearExpenseFilters}
                  onReview={setSelectedReviewExpense}
                  onEdit={handleStartEditExpense}
                  onDelete={handleDeleteExpense}
                  isAdmin={isAdmin}
                  userId={userId}
                  myMemberId={myMemberId}
                />

                {activeTrip && visibleMembers.length > 0 && (
                  <BalancesSettlements
                    trip={activeTrip}
                    balances={balances}
                    groups={visibleTripGroups}
                    transfers={transfers}
                    activeTripExpenses={activeTripExpenses}
                    topCategoryName={categoryData[0]?.name}
                    topCategoryPercentage={categoryData[0]?.percentage}
                    onMemberClick={handleFilterByMember}
                    onSettle={handleSettle}
                    isAdmin={isAdmin}
                    myMemberId={myMemberId}
                    members={members}
                  />
                )}
              </div>
            </div>

            <div className="tab-pane" style={{ display: activeTab === 'members' ? 'block' : 'none' }}>
              <MembersGroupsTab
                showMembersRequiredNotice={showMembersRequiredNotice}
                dismissMembersRequiredNotice={() => setShowMembersRequiredNotice(false)}
                activeTripMembers={activeTripMembers}
                visibleMembers={visibleMembers}
                archivedMembers={archivedMembers}
                balances={balances}
                currencySymbol={activeTrip ? getCurrencySymbol(activeTrip.baseCurrency) : ''}
                onToggleArchiveMember={toggleArchiveMember}
                onSaveMember={handleSaveMember}
                onDeleteMember={handleDeleteMember}
                visibleTripGroups={visibleTripGroups}
                onSaveGroup={handleSaveGroup}
                onDeleteGroup={handleDeleteGroup}
                members={members}
                isAdmin={isAdmin}
                tripOwnerId={activeTrip?.ownerId ?? ''}
                adminMemberIds={activeTrip?.adminMemberIds}
                onSetMemberAdminRole={setMemberAdminRole}
                currentUserId={userId}
              />
            </div>

            <div className="tab-pane" style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
              <AnalyticsTab
                trip={activeTrip}
                totalSpent={totalSpent}
                averageCost={averageCost}
                biggestSpender={biggestSpender}
                hasExpenses={nonSettlementExpenses.length > 0}
                categoryData={categoryData}
                getCatColor={getCatColor}
                memberSpentList={memberSpentList}
                dailySpendData={dailySpendData}
                expenses={activeTripExpenses}
                categories={categories}
              />
            </div>

            <div className="tab-pane" style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
              <SettingsTab
                categories={categories}
                activeTripExpenses={activeTripExpenses}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleAddCategory}
                onExportCsv={triggerCsvExport}
                isAdmin={isAdmin}
                themePref={themePref}
                setThemePref={setThemePref}
                onExportJson={triggerExport}
                showImportArea={showImportArea}
                setShowImportArea={setShowImportArea}
                importJson={importJson}
                setImportJson={setImportJson}
                importStatus={importStatus}
                onImport={handleImport}
                onClearDatabase={handleClearDatabase}
                onLoadDemoTrip={handleLoadDemoTrip}
                archivedTrips={archivedTrips}
                onRestoreTrip={handleRestoreTrip}
                onDeleteTrip={handleDeleteTrip}
                userEmail={userEmail}
                onSignOut={signOut}
                pwaInstallable={!!deferredPrompt}
                onInstallApp={handleInstallApp}
                onRequestConfirm={setConfirmRequest}
              />
            </div>

            {activeTab === 'expenses' && (
              <button
                type="button"
                className="fab-add-expense"
                onClick={handleOpenAddExpense}
                aria-label="Add Expense"
                title="Add Expense"
              >
                <IconPlus size={24} />
              </button>
            )}
          </main>

          <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}

      {showAddExpense && (
        <ExpenseForm
          // The review queue swaps editingExpenseId while the form stays
          // mounted (same conditional render slot) — without a key tied to
          // it, ExpenseForm's fields are seeded from editingExpense only
          // once via useState initializers, so they'd keep showing the
          // previous queue item's data instead of resetting for the next one.
          key={editingExpenseId || 'new'}
          trip={activeTrip}
          visibleMembers={visibleMembers}
          visibleTripGroups={visibleTripGroups}
          categories={categories}
          editingExpense={editingExpense}
          onSave={handleSaveExpense}
          onCancel={handleCancelExpenseForm}
        />
      )}

      {showShareTrip && activeTrip && (
        <ShareTripModal trip={activeTrip} onClose={() => setShowShareTrip(false)} />
      )}



      {selectedReviewExpense && (
        <ExpenseReviewModal
          expense={selectedReviewExpense}
          members={members}
          categories={categories}
          trip={activeTrip}
          onClose={() => setSelectedReviewExpense(null)}
          onEdit={() => {
            const exp = selectedReviewExpense;
            setSelectedReviewExpense(null);
            handleStartEditExpense(exp);
          }}
        />
      )}

      {showGlobalSettings && (
        <GlobalSettingsModal
          onClose={() => setShowGlobalSettings(false)}
          themePref={themePref}
          setThemePref={setThemePref}
          onExportJson={triggerExport}
          showImportArea={showImportArea}
          setShowImportArea={setShowImportArea}
          importJson={importJson}
          setImportJson={setImportJson}
          importStatus={importStatus}
          onImport={handleImport}
          onClearDatabase={handleClearDatabase}
          onLoadDemoTrip={handleLoadDemoTrip}
          archivedTrips={archivedTrips}
          onRestoreTrip={handleRestoreTrip}
          onDeleteTrip={handleDeleteTrip}
          userEmail={userEmail}
          onSignOut={signOut}
          pwaInstallable={!!deferredPrompt}
          onInstallApp={handleInstallApp}
          onRequestConfirm={setConfirmRequest}
        />
      )}

      <UndoToasts
        pendingDeleteExpense={pendingDeleteExpense}
        onUndoDeleteExpense={handleUndoDelete}
        pendingDeleteTrip={pendingDeleteTrip}
        onUndoDeleteTrip={handleUndoDeleteTrip}
        pendingDeleteGroup={pendingDeleteGroup}
        onUndoDeleteGroup={handleUndoDeleteGroup}
      />

      {confirmRequest && (
        <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      )}

      {/* Rendered unconditionally regardless of which screen is active
          (not nested in the web-only header) so it opens the same way on
          native too, reached via the "Notifications" row in Settings
          instead of the header bell button there. */}
      <NotificationsPanel onRequestConfirm={setConfirmRequest} />
    </div>
  );
}
