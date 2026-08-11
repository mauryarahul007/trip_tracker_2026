import React, { useEffect, useState, useMemo } from 'react';
import { useTripStore } from './store/tripStore';
import { useAuthStore } from './store/authStore';
import { calculateSettlements } from './utils/settlement';
import type { Expense, Trip, Group, Member } from './types';
import { exportTripToCSV } from './utils/csvExport';

import { getCurrencySymbol } from './utils/currency';
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
import { IconCalendar, IconChevronLeft, IconShare } from './components/Icons';
import { formatDateRange } from './utils/dateRange';

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
    deleteTrip,
    addMember,
    toggleArchiveMember,
    updateMember,
    deleteMember,
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

  // Expense list search & filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('');
  const [expenseFilterMember, setExpenseFilterMember] = useState('');
  const [expenseFilterDateFrom, setExpenseFilterDateFrom] = useState('');
  const [expenseFilterDateTo, setExpenseFilterDateTo] = useState('');

  // Category management (Settings tab)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

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

  // Load state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const visibleTrips = useMemo(() => trips.filter((t) => t.id !== pendingDeleteTrip?.id), [trips, pendingDeleteTrip]);
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

  const activeTripExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.tripId === activeTripId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [expenses, activeTripId]);

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

  // Permission model: admin = trip creator (full CRUD, can settle anything).
  // Participant = the member they've claimed via /join (own-expenses only,
  // can only settle transfers they're the payer or payee of).
  const isAdmin = useMemo(() => !!(activeTrip && userId && activeTrip.ownerId === userId), [activeTrip, userId]);
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
    'cat-travel': '#06b6d4', // Cyan
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

  const handleSaveMember = async (name: string, id: string | null): Promise<{ success: boolean; error?: string }> => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return { success: false, error: 'Name cannot be empty.' };

    const nameLower = nameTrimmed.toLowerCase();
    const isDuplicateMember = activeTripMembers.some(
      (m) => m.name.toLowerCase() === nameLower && m.id !== id
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
      await addMember(nameTrimmed);
    }
    setShowMembersRequiredNotice(false);
    return { success: true };
  };

  const handleDeleteMember = (member: Member) => {
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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim(), newCategoryIcon.trim() || undefined);
    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    setConfirmRequest({
      title: 'Delete category',
      message: `Delete category "${categoryName}"? Existing expenses using it will show as "Other".`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => deleteCategory(categoryId),
    });
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
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expensePayload);
      } else {
        await addExpense(expensePayload);
      }
      setEditingExpenseId(null);
      setShowAddExpense(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save expense.' };
    }
  };

  const handleCancelExpenseForm = () => {
    setEditingExpenseId(null);
    setShowAddExpense(false);
  };

  const handleOpenAddExpense = () => {
    if (visibleMembers.length === 0) {
      setShowMembersRequiredNotice(true);
      setActiveTab('members');
      return;
    }
    setEditingExpenseId(null);
    setShowAddExpense(true);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setShowAddExpense(true);
  };



  // Undo-delete: stage the expense, start a 5-second timer
  const handleDeleteExpense = (exp: Expense) => {
    // Cancel any prior pending deletion first
    if (undoTimer) clearTimeout(undoTimer);
    setPendingDeleteExpense(exp);
    const timer = setTimeout(() => {
      deleteExpense(exp.id);
      setPendingDeleteExpense(null);
    }, 5000);
    setUndoTimer(timer);
  };

  const handleUndoDelete = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
    setPendingDeleteExpense(null);
  };

  // Undo-delete: stage the trip, start a 5-second timer
  const handleDeleteTrip = (trip: Trip) => {
    if (tripUndoTimer) clearTimeout(tripUndoTimer);
    setPendingDeleteTrip(trip);
    const timer = setTimeout(() => {
      deleteTrip(trip.id);
      setPendingDeleteTrip(null);
    }, 5000);
    setTripUndoTimer(timer);
  };

  const handleUndoDeleteTrip = () => {
    if (tripUndoTimer) clearTimeout(tripUndoTimer);
    setTripUndoTimer(null);
    setPendingDeleteTrip(null);
  };

  // Undo-delete: stage the group, start a 5-second timer
  const handleDeleteGroup = (group: Group) => {
    if (groupUndoTimer) clearTimeout(groupUndoTimer);
    setPendingDeleteGroup(group);
    const timer = setTimeout(() => {
      deleteGroup(group.id);
      setPendingDeleteGroup(null);
    }, 5000);
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

  return (
    <div className="app-container">
      {/* Storage Toast Alert */}
      {storageError && (
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
          expenses={expenses}
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
        />
      ) : (
        /* Screen 2: Active Trip Dashboard */
        <div className="fade-in app-main">
          <header className="app-header">
            <div className="app-header-top">
              <div className="app-title-group">
                <span className="app-eyebrow">
                  <IconCalendar size={12} className="icon-sm" />
                  {formatDateRange(activeTrip?.startDate || '', activeTrip?.endDate || '')} · {activeTrip?.baseCurrency}
                </span>
                <h2 className="app-logo" style={{ fontSize: '24px', color: '#F2ECDC' }}>{activeTrip?.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  className="secondary-btn"
                  style={{ padding: '7px 12px', fontSize: '12px', color: '#F2ECDC', borderColor: 'rgba(242,236,220,0.28)', background: 'rgba(242,236,220,0.06)' }}
                  onClick={() => setShowShareTrip(true)}
                >
                  <IconShare size={14} className="icon-sm" /> Share
                </button>
                <button
                  className="secondary-btn"
                  style={{ padding: '7px 12px', fontSize: '12px', color: '#F2ECDC', borderColor: 'rgba(242,236,220,0.28)', background: 'rgba(242,236,220,0.06)' }}
                  onClick={() => selectTrip(null)}
                >
                  <IconChevronLeft size={14} className="icon-sm" /> Trips
                </button>
              </div>
            </div>
            <div className="app-header-stats">
              <span>{visibleMembers.length} member{visibleMembers.length === 1 ? '' : 's'}</span>
              <span>{activeTripExpenses.length} expense{activeTripExpenses.length === 1 ? '' : 's'}</span>
            </div>
          </header>

          <main className="app-main">
            {/* View Switching Tab Content */}
            <div className="tab-pane" style={{ display: activeTab === 'expenses' ? 'block' : 'none' }}>
              <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px' }}>Expenses</h3>
                  <button
                    className="gradient-btn"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                    onClick={handleOpenAddExpense}
                  >
                    + Add Expense
                  </button>
                </div>

                {showAddExpense && (
                  <ExpenseForm
                    trip={activeTrip}
                    visibleMembers={visibleMembers}
                    visibleTripGroups={visibleTripGroups}
                    categories={categories}
                    editingExpense={editingExpense}
                    onSave={handleSaveExpense}
                    onCancel={handleCancelExpenseForm}
                  />
                )}

                <ExpenseList
                  trip={activeTrip}
                  members={members}
                  categories={categories}
                  activeTripMembers={activeTripMembers}
                  activeTripExpenseCount={activeTripExpenses.length}
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
              />
            </div>

            <div className="tab-pane" style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
              <SettingsTab
                themePref={themePref}
                setThemePref={setThemePref}
                categories={categories}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleAddCategory}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                newCategoryIcon={newCategoryIcon}
                setNewCategoryIcon={setNewCategoryIcon}
                showIconPicker={showIconPicker}
                setShowIconPicker={setShowIconPicker}
                onExportCsv={triggerCsvExport}
                onExportJson={triggerExport}
                showImportArea={showImportArea}
                setShowImportArea={setShowImportArea}
                importJson={importJson}
                setImportJson={setImportJson}
                importStatus={importStatus}
                onImport={handleImport}
                onClearDatabase={handleClearDatabase}
                onLoadDemoTrip={handleLoadDemoTrip}
                userEmail={userEmail}
                onSignOut={signOut}
                isAdmin={isAdmin}
                pwaInstallable={!!deferredPrompt}
                onInstallApp={handleInstallApp}
              />
            </div>
          </main>

          <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
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
    </div>
  );
}
