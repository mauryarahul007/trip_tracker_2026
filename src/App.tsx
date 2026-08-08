import React, { useEffect, useState } from 'react';
import { useTripStore } from './store/tripStore';
import { calculateSettlements } from './utils/settlement';
import type { Expense, Trip, Group } from './types';
import { exportTripToCSV } from './utils/csvExport';
import { compressImageToDataUrl } from './utils/image';
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
    selectTrip,
    deleteTrip,
    addMember,
    toggleArchiveMember,
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
  } = useTripStore();

  // Navigation tabs: 'expenses' | 'members' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'analytics' | 'settings'>('expenses');

  // Form states - Trips
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState('INR');

  // Form states - Members
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // Form states - Groups
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Record<string, boolean>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [isGroupNameAuto, setIsGroupNameAuto] = useState(true);

  // Form states - Expenses
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('');

  // Get today's date in local YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [newExpDate, setNewExpDate] = useState(getTodayDateString());
  const [newExpPayer, setNewExpPayer] = useState('');
  const [selectedSplitMembers, setSelectedSplitMembers] = useState<Record<string, boolean>>({});
  const [newExpSplitMode, setNewExpSplitMode] = useState<'equal' | 'custom' | 'exact' | 'percentage'>('equal');
  const [newExpSplitConfig, setNewExpSplitConfig] = useState<Record<string, string>>({});
  const [selectedReviewExpense, setSelectedReviewExpense] = useState<Expense | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newExpReceiptImage, setNewExpReceiptImage] = useState('');
  const [receiptProcessing, setReceiptProcessing] = useState(false);

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

  // Inline form validation errors (replace window.alert)
  const [groupFormError, setGroupFormError] = useState('');
  const [expenseFormError, setExpenseFormError] = useState('');
  const [showMembersRequiredNotice, setShowMembersRequiredNotice] = useState(false);

  // Load state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const visibleTrips = trips.filter((t) => t.id !== pendingDeleteTrip?.id);
  const activeTrip = trips.find((t) => t.id === activeTripId);

  // Reset expense filters when switching trips
  useEffect(() => {
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterMember('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
  }, [activeTripId]);
  const activeTripExpenses = expenses
    .filter((e) => e.tripId === activeTripId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  // Search + category/member filters, applied only to the visible expense list
  const filteredExpenses = activeTripExpenses.filter((e) => {
    if (expenseSearch.trim() && !e.title.toLowerCase().includes(expenseSearch.trim().toLowerCase())) return false;
    if (expenseFilterCategory && e.category !== expenseFilterCategory) return false;
    if (expenseFilterMember && e.paidBy !== expenseFilterMember && !e.splitMemberIds.includes(expenseFilterMember)) return false;
    if (expenseFilterDateFrom && e.date < expenseFilterDateFrom) return false;
    if (expenseFilterDateTo && e.date > expenseFilterDateTo) return false;
    return true;
  });
  const hasActiveExpenseFilters = !!(expenseSearch || expenseFilterCategory || expenseFilterMember || expenseFilterDateFrom || expenseFilterDateTo);

  const clearExpenseFilters = () => {
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterMember('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
  };

  // Get active trip members and groups
  const activeTripMembers = activeTrip
    ? activeTrip.memberIds.map((id) => members[id]).filter(Boolean)
    : [];
  const visibleMembers = activeTripMembers.filter((m) => !m.archived);
  const archivedMembers = activeTripMembers.filter((m) => m.archived);

  const activeTripGroups = activeTrip
    ? (activeTrip.groupIds || []).map((id) => groups[id]).filter(Boolean)
    : [];
  const visibleTripGroups = activeTripGroups.filter((g) => g.id !== pendingDeleteGroup?.id);

  // Live running sum for exact/percentage split inputs (feedback while typing)
  const splitSelectedIds = Object.keys(selectedSplitMembers).filter((id) => selectedSplitMembers[id]);
  const splitConfigSum = splitSelectedIds.reduce((sum, id) => sum + (parseFloat(newExpSplitConfig[id] || '') || 0), 0);
  const splitConfigTarget = newExpSplitMode === 'percentage' ? 100 : newExpSplitMode === 'exact' ? (parseFloat(newExpAmount) || 0) : null;
  const splitConfigMatches = splitConfigTarget === null || Math.abs(splitConfigSum - splitConfigTarget) < 0.02;

  // Settlements and Net balances calculation
  const { balances, transfers } = activeTrip
    ? calculateSettlements(activeTrip, members, expenses, visibleTripGroups)
    : { balances: [], transfers: [] };

  // Filters out settlements to keep expense analytics clean
  const nonSettlementExpenses = activeTripExpenses.filter((e) => !e.title.startsWith('Settlement:'));
  const totalSpent = nonSettlementExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown calculations
  const categoryTotals: Record<string, number> = {};
  categories.forEach((cat) => {
    categoryTotals[cat.id] = 0;
  });
  nonSettlementExpenses.forEach((exp) => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

  const CATEGORY_COLORS: Record<string, string> = {
    'cat-food': '#6366f1', // Indigo
    'cat-stay': '#3b82f6', // Blue
    'cat-travel': '#06b6d4', // Cyan
    'cat-activities': '#10b981', // Emerald
    'cat-shopping': '#f59e0b', // Amber
    'cat-misc': '#8b5cf6', // Violet
  };
  const getCatColor = (id: string, idx: number) => {
    if (CATEGORY_COLORS[id]) return CATEGORY_COLORS[id];
    const fallbacks = ['#ec4899', '#f43f5e', '#84cc16', '#a855f7', '#64748b'];
    return fallbacks[idx % fallbacks.length];
  };

  const categoryData = Object.entries(categoryTotals)
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

  const topCategory = categoryData[0] ? `${categoryData[0].icon} ${categoryData[0].name}` : 'N/A';

  // Member spend calculations
  const memberSpentMap: Record<string, number> = {};
  visibleMembers.forEach((m) => {
    memberSpentMap[m.id] = 0;
  });
  nonSettlementExpenses.forEach((exp) => {
    if (memberSpentMap[exp.paidBy] !== undefined) {
      memberSpentMap[exp.paidBy] += exp.amount;
    }
  });

  const memberSpentList = visibleMembers.map((m) => ({
    id: m.id,
    name: m.name,
    amount: memberSpentMap[m.id] || 0,
    percentage: totalSpent > 0 ? ((memberSpentMap[m.id] || 0) / totalSpent) * 100 : 0,
  })).sort((a, b) => b.amount - a.amount);

  const biggestSpender = memberSpentList[0] && memberSpentList[0].amount > 0 ? memberSpentList[0].name : 'N/A';
  const averageCost = visibleMembers.length > 0 ? totalSpent / visibleMembers.length : 0;

  // Daily spend timeline calculations
  const dailyTotals: Record<string, number> = {};
  nonSettlementExpenses.forEach((exp) => {
    const dateStr = exp.date;
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + exp.amount;
  });

  const sortedDates = Object.keys(dailyTotals).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const dailySpendData = sortedDates.map((dateStr) => {
    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return {
      rawDate: dateStr,
      dateLabel: formattedDate,
      amount: dailyTotals[dateStr] || 0,
    };
  });

  // Set default form values when opening forms
  useEffect(() => {
    if (categories.length > 0 && !newExpCategory) {
      setNewExpCategory(categories[0].id);
    }
  }, [categories, newExpCategory]);

  // Sync split checkboxes and payer selection when opening add expense form
  useEffect(() => {
    if (showAddExpense && visibleMembers.length > 0 && !editingExpenseId) {
      // Default: select all active members for split
      const initialSplit: Record<string, boolean> = {};
      visibleMembers.forEach((m) => {
        initialSplit[m.id] = true;
      });
      setSelectedSplitMembers(initialSplit);

      // Default: set first member as payer
      setNewExpPayer(visibleMembers[0].id);

      // Default: reset config inputs
      setNewExpSplitMode('equal');
      setNewExpSplitConfig({});
      setExpenseFormError('');

      // Default: set today's date in local YYYY-MM-DD format
      setNewExpDate(getTodayDateString());
    }
  }, [showAddExpense, activeTripId, editingExpenseId, visibleMembers]);

  // Sync group checkboxes when opening add group form
  useEffect(() => {
    if (showAddGroup) {
      if (!editingGroupId) {
        setSelectedGroupMembers({});
        setGroupFormError('');
        setIsGroupNameAuto(true);
      }
    }
  }, [showAddGroup, editingGroupId]);

  // Auto-generate group name based on selected members
  useEffect(() => {
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

  // Form submissions
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName || !newTripStart || !newTripEnd) return;
    await createTrip(newTripName, newTripStart, newTripEnd, newTripCurrency);
    setNewTripName('');
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setShowAddTrip(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    await addMember(newMemberName.trim());
    setNewMemberName('');
    setShowAddMember(false);
    setShowMembersRequiredNotice(false);
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

  const handleGroupNameChange = (value: string) => {
    setNewGroupName(value);
    if (value.trim() === '') {
      setIsGroupNameAuto(true);
    } else {
      setIsGroupNameAuto(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const selectedIds = Object.keys(selectedGroupMembers).filter((id) => selectedGroupMembers[id]);
    if (selectedIds.length === 0) {
      setGroupFormError('Please select at least one member to add to the group.');
      return;
    }
    setGroupFormError('');
    if (editingGroupId) {
      await updateGroup(editingGroupId, newGroupName.trim(), selectedIds);
    } else {
      await createGroup(newGroupName.trim(), selectedIds);
    }
    setNewGroupName('');
    setSelectedGroupMembers({});
    setEditingGroupId(null);
    setShowAddGroup(false);
    setIsGroupNameAuto(true);
  };

  const handleStartEditGroup = (grp: Group) => {
    setEditingGroupId(grp.id);
    setNewGroupName(grp.name);
    const initialChecked: Record<string, boolean> = {};
    grp.memberIds.forEach((id) => {
      initialChecked[id] = true;
    });
    setSelectedGroupMembers(initialChecked);
    setIsGroupNameAuto(false);
    setShowAddGroup(true);
  };

  const handleCancelGroupForm = () => {
    setEditingGroupId(null);
    setNewGroupName('');
    setSelectedGroupMembers({});
    setGroupFormError('');
    setShowAddGroup(false);
    setIsGroupNameAuto(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newExpAmount);
    const splitIds = Object.keys(selectedSplitMembers).filter((id) => selectedSplitMembers[id]);

    if (!newExpTitle.trim() || isNaN(amountVal) || amountVal <= 0 || !newExpPayer || !newExpCategory || !newExpDate) {
      setExpenseFormError('Please fill out all required fields with valid entries.');
      return;
    }
    if (splitIds.length === 0) {
      setExpenseFormError('Please select at least one member for the expense division.');
      return;
    }

    // Custom config validations
    const splitConfig: Record<string, number> = {};
    if (newExpSplitMode !== 'equal') {
      let sum = 0;
      for (const id of splitIds) {
        const valStr = newExpSplitConfig[id] || '';
        const numVal = parseFloat(valStr);
        if (isNaN(numVal) || numVal < 0) {
          setExpenseFormError(`Please enter a valid non-negative number for member ${members[id]?.name || id}.`);
          return;
        }
        splitConfig[id] = numVal;
        sum += numVal;
      }

      if (newExpSplitMode === 'exact') {
        const diff = Math.abs(sum - amountVal);
        if (diff > 0.02) {
          setExpenseFormError(`The sum of individual amounts (${sum.toFixed(2)}) must equal the total expense amount (${amountVal.toFixed(2)}).`);
          return;
        }
      } else if (newExpSplitMode === 'percentage') {
        const diff = Math.abs(sum - 100);
        if (diff > 0.05) {
          setExpenseFormError(`The sum of individual percentages (${sum.toFixed(1)}%) must equal 100%.`);
          return;
        }
      }
    }

    setExpenseFormError('');
    const expensePayload = {
      title: newExpTitle.trim(),
      amount: amountVal,
      currency: activeTrip?.baseCurrency || 'INR',
      category: newExpCategory,
      date: newExpDate,
      paidBy: newExpPayer,
      splitMode: newExpSplitMode,
      splitMemberIds: splitIds,
      splitConfig: newExpSplitMode !== 'equal' ? splitConfig : undefined,
      receiptImage: newExpReceiptImage || undefined,
    };

    if (editingExpenseId) {
      await updateExpense(editingExpenseId, expensePayload);
    } else {
      await addExpense(expensePayload);
    }

    setEditingExpenseId(null);
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpDate('');
    setNewExpSplitMode('equal');
    setNewExpSplitConfig({});
    setNewExpReceiptImage('');
    setShowAddExpense(false);
  };

  const handleCancelExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseFormError('');
    setNewExpReceiptImage('');
    setShowAddExpense(false);
  };

  const handleOpenAddExpense = () => {
    if (visibleMembers.length === 0) {
      setShowMembersRequiredNotice(true);
      setActiveTab('members');
      return;
    }
    setNewExpReceiptImage('');
    setShowAddExpense(true);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReceiptProcessing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setNewExpReceiptImage(dataUrl);
    } catch {
      setExpenseFormError('Could not process that image. Try a different photo.');
    } finally {
      setReceiptProcessing(false);
    }
  };

  // Opens expense form pre-filled for editing
  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setNewExpTitle(exp.title);
    setNewExpAmount(String(exp.amount));
    setNewExpCategory(exp.category);
    setNewExpDate(exp.date);
    setNewExpPayer(exp.paidBy);
    setNewExpSplitMode(exp.splitMode as 'equal' | 'custom' | 'exact' | 'percentage');
    const initialSplit: Record<string, boolean> = {};
    exp.splitMemberIds.forEach((id) => { initialSplit[id] = true; });
    setSelectedSplitMembers(initialSplit);
    const initialConfig: Record<string, string> = {};
    if (exp.splitConfig) {
      Object.entries(exp.splitConfig).forEach(([id, val]) => { initialConfig[id] = String(val); });
    }
    setNewExpSplitConfig(initialConfig);
    setNewExpReceiptImage(exp.receiptImage || '');
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
    setConfirmRequest({
      title: 'Delete trip',
      message: `Are you sure you want to delete "${trip.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        if (tripUndoTimer) clearTimeout(tripUndoTimer);
        setPendingDeleteTrip(trip);
        const timer = setTimeout(() => {
          deleteTrip(trip.id);
          setPendingDeleteTrip(null);
        }, 5000);
        setTripUndoTimer(timer);
      },
    });
  };

  const handleUndoDeleteTrip = () => {
    if (tripUndoTimer) clearTimeout(tripUndoTimer);
    setTripUndoTimer(null);
    setPendingDeleteTrip(null);
  };

  // Undo-delete: stage the group, start a 5-second timer
  const handleDeleteGroup = (group: Group) => {
    setConfirmRequest({
      title: 'Delete group',
      message: `Delete group "${group.name}"? (Individual members are NOT deleted)`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        if (groupUndoTimer) clearTimeout(groupUndoTimer);
        setPendingDeleteGroup(group);
        const timer = setTimeout(() => {
          deleteGroup(group.id);
          setPendingDeleteGroup(null);
        }, 5000);
        setGroupUndoTimer(timer);
      },
    });
  };

  const handleUndoDeleteGroup = () => {
    if (groupUndoTimer) clearTimeout(groupUndoTimer);
    setGroupUndoTimer(null);
    setPendingDeleteGroup(null);
  };

  // Group quick select toggles for splits
  const applyGroupToSplit = (memberIds: string[], checked: boolean) => {
    const updated = { ...selectedSplitMembers };
    memberIds.forEach((id) => {
      if (members[id] && !members[id].archived) {
        updated[id] = checked;
      }
    });
    setSelectedSplitMembers(updated);
  };

  // Record a settlement transfer. fromId/toId are the real member ids that
  // record the ledger entry; fromLabel/toLabel are what the user picked the
  // transfer between (a member name, or a group name for merged settlements).
  const handleSettle = (fromId: string, toId: string, amount: number, fromLabel: string, toLabel: string) => {
    const fromMember = members[fromId];
    const toMember = members[toId];
    if (!fromMember || !toMember || !activeTrip || !(amount > 0)) return;

    const currencySymbol = activeTrip.baseCurrency === 'INR' ? '₹' : activeTrip.baseCurrency;
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
          onCreateTrip={handleCreateTrip}
          onSelectTrip={(id) => selectTrip(id)}
          onDeleteTrip={handleDeleteTrip}
        />
      ) : (
        /* Screen 2: Active Trip Dashboard */
        <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header className="app-header">
            <div className="app-title-group">
              <h2 style={{ fontSize: '20px' }}>{activeTrip?.name}</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Base: {activeTrip?.baseCurrency} • 📅 {activeTrip?.startDate} to {activeTrip?.endDate}
              </span>
            </div>
            <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => selectTrip(null)}>
              ◀ Back to Trips
            </button>
          </header>

          <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {/* View Switching Tab Content */}
            {activeTab === 'expenses' && (
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
                    editingExpenseId={editingExpenseId}
                    title={newExpTitle}
                    setTitle={setNewExpTitle}
                    amount={newExpAmount}
                    setAmount={setNewExpAmount}
                    category={newExpCategory}
                    setCategory={setNewExpCategory}
                    date={newExpDate}
                    setDate={setNewExpDate}
                    payer={newExpPayer}
                    setPayer={setNewExpPayer}
                    splitMode={newExpSplitMode}
                    setSplitMode={setNewExpSplitMode}
                    splitConfig={newExpSplitConfig}
                    setSplitConfig={setNewExpSplitConfig}
                    selectedSplitMembers={selectedSplitMembers}
                    setSelectedSplitMembers={setSelectedSplitMembers}
                    receiptImage={newExpReceiptImage}
                    setReceiptImage={setNewExpReceiptImage}
                    receiptProcessing={receiptProcessing}
                    formError={expenseFormError}
                    splitSelectedIds={splitSelectedIds}
                    splitConfigSum={splitConfigSum}
                    splitConfigMatches={splitConfigMatches}
                    onSubmit={handleAddExpense}
                    onCancel={handleCancelExpenseForm}
                    onReceiptFileChange={handleReceiptFileChange}
                    onApplyGroupToSplit={applyGroupToSplit}
                  />
                )}

                <ExpenseList
                  trip={activeTrip}
                  members={members}
                  categories={categories}
                  activeTripMembers={activeTripMembers}
                  activeTripExpenseCount={activeTripExpenses.length}
                  filteredExpenses={filteredExpenses}
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
                />

                {activeTrip && visibleMembers.length > 0 && (
                  <BalancesSettlements
                    trip={activeTrip}
                    balances={balances}
                    groups={visibleTripGroups}
                    transfers={transfers}
                    activeTripExpenses={activeTripExpenses}
                    onMemberClick={handleFilterByMember}
                    onSettle={handleSettle}
                  />
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <MembersGroupsTab
                showMembersRequiredNotice={showMembersRequiredNotice}
                dismissMembersRequiredNotice={() => setShowMembersRequiredNotice(false)}
                activeTripMembers={activeTripMembers}
                visibleMembers={visibleMembers}
                archivedMembers={archivedMembers}
                showAddMember={showAddMember}
                setShowAddMember={setShowAddMember}
                newMemberName={newMemberName}
                setNewMemberName={setNewMemberName}
                onAddMember={handleAddMember}
                onToggleArchiveMember={toggleArchiveMember}
                visibleTripGroups={visibleTripGroups}
                showAddGroup={showAddGroup}
                setShowAddGroup={setShowAddGroup}
                newGroupName={newGroupName}
                setNewGroupName={handleGroupNameChange}
                selectedGroupMembers={selectedGroupMembers}
                setSelectedGroupMembers={setSelectedGroupMembers}
                editingGroupId={editingGroupId}
                groupFormError={groupFormError}
                onCreateGroup={handleCreateGroup}
                onCancelGroupForm={handleCancelGroupForm}
                onStartEditGroup={handleStartEditGroup}
                onDeleteGroup={handleDeleteGroup}
                members={members}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab
                trip={activeTrip}
                totalSpent={totalSpent}
                averageCost={averageCost}
                topCategory={topCategory}
                biggestSpender={biggestSpender}
                hasExpenses={nonSettlementExpenses.length > 0}
                categoryData={categoryData}
                getCatColor={getCatColor}
                memberSpentList={memberSpentList}
                dailySpendData={dailySpendData}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
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
              />
            )}
          </main>

          <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}

      {selectedReviewExpense && (
        <ExpenseReviewModal
          expense={selectedReviewExpense}
          members={members}
          categories={categories}
          trip={activeTrip}
          onClose={() => setSelectedReviewExpense(null)}
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
