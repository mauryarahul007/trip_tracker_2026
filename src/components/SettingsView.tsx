import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { Category, Expense, Trip } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import {
  IconTag,
  IconTrash,
  IconArchive,
  IconDownload,
  IconUpload,
  IconFileSpreadsheet,
  IconMoon,
  IconSun,
  IconSmartphone,
  IconDatabase,
  IconSparkles,
  IconLogOut,
  IconAlertCircle,
  IconCheckCircle,
  IconChevronRight,
  IconChevronLeft,
  IconMapPin,
  IconShield,
  IconBell,
  IconShare,
} from './Icons';
import { TripJourneyMap } from './TripJourneyMap';
import { CategoryIcon } from './CategoryIcon';
import { useTripStore } from '../store/tripStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { formatDateRange } from '../utils/dateRange';
import { getCategoryKeywords } from '../utils/categoryHelper';
import { getAppVersion } from '../utils/appVersion';
import { BugReportModal } from './BugReportModal';
import { FeatureRequestModal } from './FeatureRequestModal';
import { SuperadminAuthModal } from './SuperadminAuthModal';

// Superadmin-only, reached only via the gated "Superadmin Console" row
// below -- code-split so its ~700 lines don't ship in every traveler's
// bundle.
const SuperAdminBugTracker = lazy(() => import('./SuperAdminBugTracker').then((m) => ({ default: m.SuperAdminBugTracker })));
import { useHistoryBack } from '../utils/useHistoryBack';

export type ThemePref = 'light' | 'dark' | 'system';

type SubScreen = null | 'categories' | 'recycle-bin' | 'appearance' | 'backups' | 'archived-trips' | 'bug-tracker' | 'report-issue' | 'suggest-feature' | 'trip-map';

const RECYCLE_BIN_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatTimeLeft(deletedAt: number): string {
  const msLeft = deletedAt + RECYCLE_BIN_WINDOW_MS - Date.now();
  if (msLeft <= 0) return 'purging soon';
  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
  if (hoursLeft < 1) return '<1h left';
  return `${hoursLeft}h left`;
}

const CATEGORY_ICON_PRESETS = ['🍔', '🏨', '✈️', '🎟️', '🛍️', '📦', '🚗', '⛽', '🎬', '🍺', '💊', '🎁', '🧾', '🏥', '🎓', '🐾', '🎵', '🚕'];

interface SettingsViewProps {
  categories: Category[];
  activeTripExpenses: Expense[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv?: () => void;
  isAdmin?: boolean;

  // Global settings properties
  themePref: ThemePref;
  setThemePref: (v: ThemePref) => void;
  onExportJson?: () => void;
  showImportArea?: boolean;
  setShowImportArea?: (v: boolean) => void;
  importJson?: string;
  setImportJson?: (v: string) => void;
  importStatus?: 'idle' | 'pending' | 'success' | 'error';
  importErrorMessage?: string | null;
  onImport?: (jsonOverride?: string) => void;
  onClearDatabase?: () => void;
  onLoadDemoTrip?: () => void;
  archivedTrips?: Trip[];
  onRestoreTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
  onOpenSuperadminPortal?: () => void;

  // Context
  hasActiveTrip?: boolean;
  initialSubScreen?: SubScreen;
  baseCurrency?: string;
  onClose?: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  onOpenShareTrip?: () => void;
  onOpenTripWrapped?: () => void;
}

export function SettingsView({
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin = true,
  themePref,
  setThemePref,
  onExportJson,
  showImportArea = false,
  setShowImportArea,
  importJson = '',
  setImportJson,
  importStatus = 'idle',
  importErrorMessage,
  onImport,
  onClearDatabase,
  onLoadDemoTrip,
  archivedTrips = [],
  onRestoreTrip,
  onDeleteTrip,
  userEmail,
  onSignOut,
  pwaInstallable = false,
  onInstallApp,
  onOpenSuperadminPortal,
  hasActiveTrip = true,
  initialSubScreen = null,
  onClose,
  onRequestConfirm,
  onOpenShareTrip,
  onOpenTripWrapped,
  baseCurrency,
}: SettingsViewProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(initialSubScreen);

  // Store data
  const userId = useTripStore((s) => s.userId);
  const members = useTripStore((s) => s.members);
  const userDisplayName = useTripStore((s) => s.userDisplayName);
  const deletedExpenses = useTripStore((s) => s.deletedExpenses);
  const fetchDeletedExpenses = useTripStore((s) => s.fetchDeletedExpenses);
  const restoreExpense = useTripStore((s) => s.restoreExpense);
  const permanentlyDeleteExpense = useTripStore((s) => s.permanentlyDeleteExpense);
  const emptyRecycleBin = useTripStore((s) => s.emptyRecycleBin);
  const updateCategoryKeywords = useTripStore((s) => s.updateCategoryKeywords);
  const resetCategoryKeywords = useTripStore((s) => s.resetCategoryKeywords);
  const enableGeotagging = useTripStore((s) => s.enableGeotagging);
  const setEnableGeotagging = useTripStore((s) => s.setEnableGeotagging);
  const closeTrip = useTripStore((s) => s.closeTrip);
  const setTripMuted = useTripStore((s) => s.setTripMuted);

  // Superadmin & Feature Flag state
  const isSuperadmin = useTripStore((s) => s.isSuperadmin);
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const trips = useTripStore((s) => s.trips);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const activeTrip = trips.find((t) => t.id === activeTripId);
  const isTripMuted = useTripStore((s) => (activeTripId ? s.isTripMuted(activeTripId) : false));

  const [isSuperadminModalOpen, setIsSuperadminModalOpen] = useState(false);
  const unreadNotificationCount = useNotificationsStore((s) => s.unreadCount);
  const openNotificationsPanel = useNotificationsStore((s) => s.openPanel);

  // Category keyword states
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [coachmarkResetStatus, setCoachmarkResetStatus] = useState<string | null>(null);

  const handleResetCoachmarks = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('tt_flight_add_tooltip_dismissed_v1');
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('tt:reset-coachmarks'));
    setCoachmarkResetStatus('✓ Reactivated');
    setTimeout(() => setCoachmarkResetStatus(null), 2500);
  };

  // Report a Problem registers a guard here while it has unsubmitted text,
  // so a hardware/browser back-press can intercept with "go back or submit
  // first" instead of silently discarding what was typed. null (the
  // default, and every other subscreen) means back just closes normally.
  const reportIssueBackGuardRef = useRef<(() => void) | null>(null);
  const setReportIssueBackGuard = (guard: (() => void) | null) => {
    reportIssueBackGuardRef.current = guard;
  };

  // Same back-guard pattern for Suggest a Feature.
  const suggestFeatureBackGuardRef = useRef<(() => void) | null>(null);
  const setSuggestFeatureBackGuard = (guard: (() => void) | null) => {
    suggestFeatureBackGuardRef.current = guard;
  };

  // Import Backup: hidden file input triggered by the "Choose Backup File"
  // button. Restores immediately on selection (jsonOverride bypasses the
  // setImportJson/importJson state round-trip, which wouldn't have
  // committed yet if we called onImport() right after setImportJson() in
  // the same tick) -- no separate submit button to miss for this path.
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setImportJson?.(text);
      onImport?.(text);
    };
    reader.onerror = () => {
      setImportFileError('Could not read that file.');
    };
    reader.readAsText(file);
  };

  // Register sub-screen drill-downs into browser history stack (WhatsApp hierarchical navigation)
  useHistoryBack(subScreen !== null, () => {
    if (subScreen === 'report-issue' && reportIssueBackGuardRef.current) {
      reportIssueBackGuardRef.current();
      return;
    }
    if (subScreen === 'suggest-feature' && suggestFeatureBackGuardRef.current) {
      suggestFeatureBackGuardRef.current();
      return;
    }
    setSubScreen(null);
    setExpandedCategoryId(null);
  });

  // Register expanded category auto-tags drawer into browser history stack
  useHistoryBack(expandedCategoryId !== null, () => {
    setExpandedCategoryId(null);
  });

  // Connectivity and disk storage
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; quota: number } | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchDeletedExpenses();
  }, [fetchDeletedExpenses]);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageEstimate({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Category form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim(), newCategoryIcon.trim() || '🏷️');
    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteCategoryTrigger = (cat: Category) => {
    const affectedCount = activeTripExpenses.filter((e) => e.category === cat.id).length;
    if (affectedCount > 0) {
      const otherCats = categories.filter((c) => c.id !== cat.id);
      setMergeTargetId(otherCats[0]?.id || '');
      setCategoryToDelete(cat);
    } else {
      onRequestConfirm?.({
        title: 'Delete category',
        message: `Are you sure you want to delete the category "${cat.name}"?`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => onDeleteCategory(cat.id, null),
      });
    }
  };

  const handleConfirmMergeDelete = () => {
    if (!categoryToDelete) return;
    onDeleteCategory(categoryToDelete.id, mergeTargetId || null);
    setCategoryToDelete(null);
  };

  const affectedExpensesCount = categoryToDelete
    ? activeTripExpenses.filter((e) => e.category === categoryToDelete.id).length
    : 0;

  const displayName = userDisplayName || userEmail?.split('@')[0] || 'Traveler';
  const initialLetter = displayName.charAt(0).toUpperCase();

  const themeLabel =
    themePref === 'light' ? 'Light' : themePref === 'dark' ? 'Night flight' : 'System default';

  // -------------------------------------------------------------------------
  // Sub-screens
  // -------------------------------------------------------------------------

  if (subScreen === 'categories') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Categories &amp; Tags</h3>
        <p className="settings-subscreen-subtitle">
          Tap any category to view and edit its smart auto-tagging keywords &amp; brands.
        </p>

        <div className="settings-group">
          <div className="settings-group-card" style={{ padding: '4px 0' }}>
            {categories.map((cat) => {
              const dataset = getCategoryKeywords(cat);
              const allKeywords = [...dataset.brands, ...dataset.items];
              const isExpanded = expandedCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  style={{
                    borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(47,111,237,0.04)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <CategoryIcon categoryId={cat.id} fallbackEmoji={cat.icon} size={18} />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '14.5px' }}>{cat.name}</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {allKeywords.length} auto-tag keywords {cat.keywords ? '• Custom' : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      >
                        {isExpanded ? 'Close Tags' : 'Edit Tags'}
                      </button>
                      {cat.isCustom && isAdmin && (
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: '4px 8px', fontSize: '11.5px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.18)' }}
                          onClick={() => handleDeleteCategoryTrigger(cat)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Keyword Chips & Add form */}
                  {isExpanded && (
                    <div className="fade-in" style={{ padding: '12px 16px 16px 16px', background: 'rgba(15,23,42,0.02)', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Auto-tagging Keywords &amp; Brands ({allKeywords.length}):
                        </span>
                        {cat.keywords && (
                          <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                            onClick={() => resetCategoryKeywords(cat.id)}
                          >
                            Reset to Defaults
                          </button>
                        )}
                      </div>

                      {/* Tag Chips Tray */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '6px 2px', marginBottom: '10px' }}>
                        {allKeywords.map((kw) => (
                          <span
                            key={kw}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {kw}
                            <button
                              type="button"
                              className="dismiss-glyph-btn"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                lineHeight: 1,
                              }}
                              onClick={() => {
                                const updated = allKeywords.filter((k) => k !== kw);
                                updateCategoryKeywords(cat.id, updated);
                              }}
                              title={`Remove "${kw}"`}
                              aria-label={`Remove "${kw}"`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add new keyword form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = newKeywordInput.trim().toLowerCase();
                          if (!val || allKeywords.includes(val)) return;
                          updateCategoryKeywords(cat.id, [...allKeywords, val]);
                          setNewKeywordInput('');
                        }}
                        style={{ display: 'flex', gap: '8px' }}
                      >
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Add new keyword or brand (e.g. dosa, uber, petrol)..."
                          style={{ flex: 1, fontSize: '12px', height: '34px' }}
                          value={newKeywordInput}
                          onChange={(e) => setNewKeywordInput(e.target.value)}
                        />
                        <button type="submit" className="gradient-btn" style={{ padding: '0 14px', fontSize: '12px', height: '34px' }}>
                          Add Tag
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin ? (
          <div className="settings-group">
            <h4 className="settings-group-title">Add Custom Category</h4>
            <div className="settings-group-card" style={{ padding: '16px' }}>
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{ position: 'relative' }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowIconPicker(false);
                  }}
                >
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '52px', height: '44px', textAlign: 'center', fontSize: '19px', padding: '0' }}
                    placeholder="🏷️"
                    maxLength={4}
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    onFocus={() => setShowIconPicker(true)}
                    aria-label="Category emoji icon"
                    title="Pick an emoji"
                  />
                  {showIconPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 20,
                        width: '204px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        padding: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)',
                        boxShadow: '0 10px 25px -5px rgba(28,42,56,0.2)',
                      }}
                    >
                      {CATEGORY_ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setNewCategoryIcon(icon);
                            setShowIconPicker(false);
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            fontSize: '16px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            border: newCategoryIcon === icon ? '2px solid var(--primary-accent)' : '1.5px solid transparent',
                            background: newCategoryIcon === icon ? 'rgba(47,111,237,0.10)' : 'var(--bg-surface-hover)',
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button type="submit" className="gradient-btn" style={{ padding: '10px 16px' }}>
                  Add
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '0 8px' }}>Only trip admins can add categories.</p>
        )}

        {/* Merge & Delete Category Dialog */}
        {categoryToDelete && (
          <div className="modal-overlay" onClick={() => setCategoryToDelete(null)}>
            <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Merge and Delete Category</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                The category <strong>"{categoryToDelete.name}"</strong> is currently used in <strong>{affectedExpensesCount}</strong> expense{affectedExpensesCount === 1 ? '' : 's'}. Select a replacement category to merge these expenses into:
              </p>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="merge-target-category">Replacement Category</label>
                <select
                  id="merge-target-category"
                  className="input-field select-field"
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  style={{ height: '40px' }}
                >
                  {categories
                    .filter((c) => c.id !== categoryToDelete.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={() => setCategoryToDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="gradient-btn" style={{ flex: 1, background: 'var(--color-danger)' }} onClick={handleConfirmMergeDelete}>
                  Merge &amp; Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subScreen === 'recycle-bin') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
          {deletedExpenses.length > 0 && (
            <button
              type="button"
              className="settings-subscreen-action-btn danger"
              onClick={() => {
                onRequestConfirm?.({
                  title: 'Empty Recycle Bin',
                  message: 'Permanently delete all expenses in the recycle bin? This cannot be undone.',
                  confirmLabel: 'Empty Bin',
                  danger: true,
                  onConfirm: () => emptyRecycleBin(),
                });
              }}
            >
              Empty Bin
            </button>
          )}
        </div>
        <h3 className="settings-subscreen-main-title">Recycle Bin</h3>
        <p className="settings-subscreen-subtitle">
          Soft-deleted expenses can be restored back to your trip or permanently removed.
        </p>

        <div className="settings-group">
          <div className="settings-group-card">
            {deletedExpenses.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                Recycle Bin is currently empty.
              </div>
            ) : (
              deletedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <span>{exp.currency} {exp.amount.toFixed(2)}</span> &middot; {exp.deletedAt ? formatTimeLeft(exp.deletedAt) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => restoreExpense(exp.id)}
                      title="Restore expense"
                    >
                      <IconArchive size={13} className="icon-sm" /> Restore
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                      onClick={() => {
                        onRequestConfirm?.({
                          title: 'Delete permanently',
                          message: `Permanently delete "${exp.title}"? This cannot be undone.`,
                          confirmLabel: 'Delete',
                          danger: true,
                          onConfirm: () => permanentlyDeleteExpense(exp.id),
                        });
                      }}
                      title="Permanently delete now"
                      aria-label="Permanently delete"
                    >
                      <IconTrash size={13} className="icon-sm" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'appearance') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Appearance</h3>
        <p className="settings-subscreen-subtitle">
          Customize the theme palette and visual appearance for your device.
        </p>

        <div className="settings-group">
          <h4 className="settings-group-title">Theme Palette</h4>
          <div className="settings-group-card">
            {(
              [
                { value: 'light', label: 'Light', desc: 'Editorial warm canvas & crisp typography' },
                { value: 'dark', label: 'Night flight', desc: 'Deep obsidian backdrop with emerald luminescence' },
                { value: 'system', label: 'System default', desc: 'Matches your OS dark/light mode preference' },
              ] as { value: ThemePref; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="settings-row-item"
                onClick={() => setThemePref(opt.value)}
              >
                <div className="settings-row-left">
                  <div
                    className={`settings-squircle ${
                      opt.value === 'dark'
                        ? 'squircle-indigo'
                        : opt.value === 'light'
                        ? 'squircle-amber'
                        : 'squircle-teal'
                    }`}
                  >
                    {opt.value === 'dark' ? (
                      <IconMoon size={18} />
                    ) : opt.value === 'light' ? (
                      <IconSun size={18} />
                    ) : (
                      <IconSparkles size={18} />
                    )}
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">{opt.label}</span>
                    <span className="settings-row-subtitle">{opt.desc}</span>
                  </div>
                </div>
                {themePref === opt.value && (
                  <span style={{ color: 'var(--primary-accent)', display: 'flex', alignItems: 'center' }}>
                    <IconCheckCircle size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'trip-map') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Trip Map</h3>
        <p className="settings-subscreen-subtitle">Where the money went, plotted on the map.</p>
        <TripJourneyMap expenses={activeTripExpenses} categories={categories} baseCurrency={baseCurrency || ''} />
      </div>
    );
  }

  if (subScreen === 'archived-trips') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Archived Trips</h3>
        <p className="settings-subscreen-subtitle">
          Past trips you've archived. You can restore them anytime or permanently delete them.
        </p>

        <div className="settings-group">
          <div className="settings-group-card">
            {archivedTrips.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                No archived trips. Archive a trip from the Trips list to tuck it away without deleting it.
              </div>
            ) : (
              archivedTrips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{formatDateRange(trip.startDate, trip.endDate)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => onRestoreTrip?.(trip)}
                    >
                      <IconArchive size={13} className="icon-sm" /> Restore
                    </button>
                    {(!trip.ownerId || !userId || trip.ownerId === userId || Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)))) && (
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                        aria-label="Delete trip permanently"
                        title="Delete trip permanently"
                        onClick={() => onDeleteTrip?.(trip)}
                      >
                        <IconTrash size={13} className="icon-sm" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'backups') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Database &amp; Backups</h3>
        <p className="settings-subscreen-subtitle">
          Manage your local database, sync storage, and export JSON or CSV backups.
        </p>

        {/* Disk usage */}
        {storageEstimate && (
          <div className="settings-group">
            <h4 className="settings-group-title">Storage Consumption</h4>
            <div className="settings-group-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Local Disk Usage:</span>
                <span style={{ fontWeight: 600 }}>
                  {formatBytes(storageEstimate.used)} of {formatBytes(storageEstimate.quota)}
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (storageEstimate.used / storageEstimate.quota) * 100)}%`,
                    height: '100%',
                    background: 'var(--primary-accent)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* JSON Backup Export & Import */}
        <div className="settings-group">
          <h4 className="settings-group-title">JSON Snapshot</h4>
          <div className="settings-group-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Export your local database to keep as a cold offline backup or restore onto another device.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="gradient-btn"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                onClick={onExportJson}
              >
                <IconDownload size={15} className="icon-sm" /> Export Backup
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                onClick={() => setShowImportArea?.(!showImportArea)}
              >
                <IconUpload size={15} className="icon-sm" /> Import Backup
              </button>
            </div>

            {showImportArea && (
              <div className="fade-in" style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '10px' }}
                  disabled={importStatus === 'pending'}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <IconUpload size={15} className="icon-sm" /> {importStatus === 'pending' ? 'Restoring...' : 'Choose Backup File...'}
                </button>
                {importJson && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Loaded {formatBytes(new Blob([importJson]).size)} of backup data. Review and restore below.
                  </p>
                )}
                {importFileError && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>{importFileError}</p>
                )}
                <details>
                  <summary style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Or paste JSON manually</summary>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Paste backup JSON string here..."
                    style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', marginTop: '8px' }}
                    value={importJson}
                    onChange={(e) => setImportJson?.(e.target.value)}
                  />
                </details>
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ padding: '8px' }}
                  disabled={!importJson || importStatus === 'pending'}
                  onClick={() => onImport?.()}
                >
                  {importStatus === 'pending' ? 'Restoring...' : 'Restore Snapshot'}
                </button>

                {importStatus === 'success' && (
                  <p style={{ color: 'var(--color-success-text)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully!
                  </p>
                )}
                {importStatus === 'error' && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <IconAlertCircle size={15} className="icon-sm" /> {importErrorMessage || 'Invalid database snapshot format.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'bug-tracker') {
    return (
      <div className="fade-in settings-container">
        <Suspense fallback={null}>
          <SuperAdminBugTracker onBack={() => setSubScreen(null)} isAdmin={isSuperadmin} />
        </Suspense>
      </div>
    );
  }

  if (subScreen === 'report-issue') {
    return (
      <BugReportModal
        onBack={() => setSubScreen(null)}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setReportIssueBackGuard}
        activeTripInfo={{ id: activeTripId, name: activeTrip?.name || null }}
      />
    );
  }

  if (subScreen === 'suggest-feature') {
    return (
      <FeatureRequestModal
        onBack={() => setSubScreen(null)}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setSuggestFeatureBackGuard}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Main Settings Screen (WhatsApp Inset Grouped Layout)
  // -------------------------------------------------------------------------

  return (
    <div className="fade-in settings-container">
      {/* Profile Hero Banner */}
      <div className="settings-profile-hero">
        <div className="settings-avatar-circle">{initialLetter}</div>
        <div className="settings-profile-info">
          <div className="settings-profile-name">{displayName}</div>
          <div className="settings-profile-status">
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isOnline ? 'var(--color-success)' : 'var(--text-muted)',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {userEmail || (isOnline ? 'Online & Synced' : 'Offline Mode')}
          </div>
        </div>
      </div>
      <div className="settings-hero-perf" aria-hidden="true" />

      {/* Superadmin Active Hero Cockpit Card */}
      {isSuperadmin && (
        <div
          onClick={() => onOpenSuperadminPortal?.()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2F6FED, #17B6A6)',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 6px 20px -4px rgba(47, 111, 237, 0.35)',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <IconShield size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '15px' }}>⚡ Superadmin Cockpit</strong>
                <span style={{ fontSize: '10px', background: '#10B981', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>ACTIVE</span>
              </div>
              <span style={{ fontSize: '12px', color: '#92A2AE' }}>Feature Flags, Global Analytics &amp; Admin Tools</span>
            </div>
          </div>
          <IconChevronRight size={18} style={{ color: '#17B6A6' }} />
        </div>
      )}

      {/* Group 1: Trip-Specific Settings (When an active trip is selected) */}
      {hasActiveTrip && (
        <div className="settings-group">
          <h4 className="settings-group-title">Trip Preferences</h4>
          <div className="settings-group-card">
            {onOpenTripWrapped && (
              <button type="button" className="settings-row-item" onClick={onOpenTripWrapped}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber" style={{ background: 'linear-gradient(135deg, #FF6B6B, #FFD93D)', color: '#1A1D20' }}>
                    <IconSparkles size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Trip Wrapped (Story Card)</span>
                    <span className="settings-row-subtitle">Generate 1080x1920 Instagram Story infographic &amp; superlatives</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill" style={{ background: 'rgba(255,107,107,0.18)', color: '#FF6B6B', fontWeight: 700 }}>STORY</span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {onOpenShareTrip && (
              <button type="button" className="settings-row-item" onClick={onOpenShareTrip}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-teal">
                    <IconShare size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Invite &amp; Share Trip</span>
                    <span className="settings-row-subtitle">Share the join link or QR code with members</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            <button type="button" className="settings-row-item" onClick={() => setSubScreen('trip-map')}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-teal">
                  <IconMapPin size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Trip Map</span>
                  <span className="settings-row-subtitle">Geotagged expenses, plotted &amp; routed</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>

            {(isSuperadmin || isFeatureEnabled('enableKeywordTagging')) && (
              <button type="button" className="settings-row-item" onClick={() => setSubScreen('categories')}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-purple">
                    <IconTag size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Categories &amp; Tags</span>
                    <span className="settings-row-subtitle">{categories.length} active categories</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {(isSuperadmin || isFeatureEnabled('enableRecycleBin')) && (
              <button type="button" className="settings-row-item" onClick={() => setSubScreen('recycle-bin')}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-rose">
                    <IconTrash size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Recycle Bin</span>
                    <span className="settings-row-subtitle">
                      {deletedExpenses.length === 0 ? 'Empty (24h retention)' : `${deletedExpenses.length} deleted expense${deletedExpenses.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  {deletedExpenses.length > 0 && <span className="settings-badge-pill">{deletedExpenses.length}</span>}
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {onExportCsv && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  onExportCsv();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-blue">
                    <IconFileSpreadsheet size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Excel CSV Export</span>
                    <span className="settings-row-subtitle">Download settlement ledger &amp; expense breakdown</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconDownload size={16} />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {hasActiveTrip && (
        <p className="settings-scope-note">Everything below applies to your whole account — not just this trip.</p>
      )}

      {/* Group 2: App & Appearance */}
      <div className="settings-group">
        <h4 className="settings-group-title">App &amp; Interface</h4>
        <div className="settings-group-card">
          <button type="button" className="settings-row-item" onClick={openNotificationsPanel}>
            <div className="settings-row-left">
              <div className="settings-squircle squircle-teal">
                <IconBell size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Notifications</span>
                <span className="settings-row-subtitle">{unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}</span>
              </div>
            </div>
            <div className="settings-row-right">
              {unreadNotificationCount > 0 && <span className="settings-badge-pill">{unreadNotificationCount}</span>}
              <IconChevronRight size={16} />
            </div>
          </button>

          <button type="button" className="settings-row-item" onClick={() => setSubScreen('appearance')}>
            <div className="settings-row-left">
              <div className="settings-squircle squircle-amber">
                <IconMoon size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Appearance</span>
                <span className="settings-row-subtitle">{themeLabel}</span>
              </div>
            </div>
            <div className="settings-row-right">
              <span className="settings-badge-pill">{themePref === 'dark' ? 'Night' : themePref === 'light' ? 'Light' : 'Auto'}</span>
              <IconChevronRight size={16} />
            </div>
          </button>

          {(isSuperadmin || isFeatureEnabled('enableGeotagging')) && (
            <div className="settings-row-item" style={{ cursor: 'default' }}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-emerald">
                  <IconMapPin size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Geotag Expenses</span>
                  <span className="settings-row-subtitle">Attach GPS location &amp; place names to transactions</span>
                </div>
              </div>
              <div className="settings-row-right">
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableGeotagging}
                    onChange={(e) => setEnableGeotagging(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0, margin: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: enableGeotagging ? '#17B6A6' : 'var(--border-color)',
                      transition: '0.2s ease',
                      borderRadius: 'var(--border-radius-pill)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: enableGeotagging ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.2s ease',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          )}

          <button
            type="button"
            className="settings-row-item"
            onClick={handleResetCoachmarks}
          >
            <div className="settings-row-left">
              <div className="settings-squircle squircle-amber" style={{ background: 'rgba(255, 122, 0, 0.14)', color: '#FF7A00' }}>
                <span>✈️</span>
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Flight Helper &amp; Coachmarks</span>
                <span className="settings-row-subtitle">
                  {coachmarkResetStatus ? 'Onboarding flight tips re-enabled!' : 'Re-enable animated transaction guide on the + button'}
                </span>
              </div>
            </div>
            <div className="settings-row-right">
              <span className="settings-badge-pill" style={{ color: coachmarkResetStatus ? 'var(--color-success)' : 'var(--primary-accent)', fontWeight: 600 }}>
                {coachmarkResetStatus || 'Reset'}
              </span>
            </div>
          </button>

          {pwaInstallable && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                onInstallApp?.();
                onClose?.();
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-teal">
                  <IconSmartphone size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Install App</span>
                  <span className="settings-row-subtitle">Add Trip Tracker icon to your device home screen</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconDownload size={16} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Group 3: Data & Storage */}
      <div className="settings-group">
        <h4 className="settings-group-title">Data &amp; Backups</h4>
        <div className="settings-group-card">
          <button type="button" className="settings-row-item" onClick={() => setSubScreen('archived-trips')}>
            <div className="settings-row-left">
              <div className="settings-squircle squircle-slate">
                <IconArchive size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Archived Trips</span>
                <span className="settings-row-subtitle">
                  {archivedTrips.length === 0 ? 'No archived trips' : `${archivedTrips.length} archived trip${archivedTrips.length === 1 ? '' : 's'}`}
                </span>
              </div>
            </div>
            <div className="settings-row-right">
              {archivedTrips.length > 0 && <span className="settings-badge-pill">{archivedTrips.length}</span>}
              <IconChevronRight size={16} />
            </div>
          </button>

          {isSuperadmin && (
            <button type="button" className="settings-row-item" onClick={() => setSubScreen('backups')}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-indigo">
                  <IconDatabase size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Database Backups</span>
                  <span className="settings-row-subtitle">Export/Import JSON database snapshot</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>
          )}

          {onLoadDemoTrip && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                onRequestConfirm?.({
                  title: 'Seed Demo Data',
                  message: 'Populate a sample trip ("Road Trip to Goa ☀️") with test members, geotagged route, and split transactions?',
                  confirmLabel: 'Load Demo Trip',
                  onConfirm: () => {
                    onLoadDemoTrip();
                    onClose?.();
                  },
                });
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-emerald">
                  <IconSparkles size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Seed Demo Trip</span>
                  <span className="settings-row-subtitle">Load sample trip with members, geotags &amp; transactions</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Group 3.5: This Trip -- mute is available to any member (personal
          preference); Close Trip is admin-only (locks new expenses/members
          app-wide, see tripStore's addExpense/addMember guards). */}
      {hasActiveTrip && activeTrip && (
        <div className="settings-group">
          <h4 className="settings-group-title">This Trip</h4>
          <div className="settings-group-card">
            <div className="settings-row-item" style={{ cursor: 'default' }}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-teal">
                  <IconBell size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Mute Notifications</span>
                  <span className="settings-row-subtitle">Stop push alerts for this trip -- still visible in your notifications panel</span>
                </div>
              </div>
              <div className="settings-row-right">
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isTripMuted}
                    onChange={(e) => setTripMuted(activeTrip.id, e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0, margin: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isTripMuted ? '#17B6A6' : 'var(--border-color)',
                      transition: '0.2s ease',
                      borderRadius: 'var(--border-radius-pill)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: isTripMuted ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.2s ease',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  if (activeTrip.closed) {
                    closeTrip(activeTrip.id, false);
                    return;
                  }
                  onRequestConfirm?.({
                    title: 'Close Trip',
                    message: 'This locks the trip -- no new expenses or members can be added until it\'s reopened. Existing data stays untouched.',
                    confirmLabel: 'Close Trip',
                    onConfirm: () => closeTrip(activeTrip.id, true),
                  });
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber">
                    <IconShield size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">{activeTrip.closed ? 'Reopen Trip' : 'Close Trip'}</span>
                    <span className="settings-row-subtitle">
                      {activeTrip.closed ? 'Currently locked -- reopen to allow new expenses/members' : 'Lock this trip once everyone\'s settled up'}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Group 4: Account & Danger Zone */}
      <div className="settings-group">
        <h4 className="settings-group-title">Account &amp; Reset</h4>
        <div className="settings-group-card">
          {onSignOut && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                onRequestConfirm?.({
                  title: 'Sign Out',
                  message: 'Sign out of your account on this device?',
                  confirmLabel: 'Sign Out',
                  onConfirm: () => {
                    onSignOut();
                    onClose?.();
                  },
                });
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-red">
                  <IconLogOut size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title" style={{ color: 'var(--color-danger)' }}>
                    Sign Out
                  </span>
                  <span className="settings-row-subtitle">Disconnect active session from Supabase</span>
                </div>
              </div>
            </button>
          )}

          {isSuperadmin && onClearDatabase && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                // onClearDatabase already opens the app's own danger-confirm
                // dialog (with the two-tap wax-seal pattern) — no separate
                // confirm here, which used to stack a second, native one on
                // top of it.
                onClearDatabase();
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-red">
                  <IconAlertCircle size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title" style={{ color: 'var(--color-danger)' }}>
                    Clear All Data
                  </span>
                  <span className="settings-row-subtitle">Wipe all local trips and reset storage</span>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Group 5: Superadmin Console (superadmin-only) */}
      {isSuperadmin && (
        <div className="settings-group">
          <h4 className="settings-group-title">Superadmin Console</h4>
          <div className="settings-group-card">
            <button
              type="button"
              className="settings-row-item"
              onClick={() => setSubScreen('bug-tracker')}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-amber">
                  <span style={{ fontSize: '16px' }}>🛡️</span>
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Superadmin Bug Tracker</span>
                  <span className="settings-row-subtitle">Manage, triage &amp; live-sync bugs with AI agents</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Group 6: Support — everyone gets a way to report a problem */}
      <div className="settings-group">
        <h4 className="settings-group-title">Support</h4>
        <div className="settings-group-card">
          <button
            type="button"
            className="settings-row-item"
            onClick={() => setSubScreen('report-issue')}
          >
            <div className="settings-row-left">
              <div className="settings-squircle squircle-slate">
                <span style={{ fontSize: '16px' }}>🐞</span>
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Report a Problem</span>
                <span className="settings-row-subtitle">Tell us what went wrong — device details attach automatically</span>
              </div>
            </div>
            <div className="settings-row-right">
              <IconChevronRight size={16} />
            </div>
          </button>
          {(isSuperadmin || isFeatureEnabled('enableFeatureSuggestions')) && (
          <button
            type="button"
            className="settings-row-item"
            onClick={() => setSubScreen('suggest-feature')}
          >
            <div className="settings-row-left">
              <div className="settings-squircle squircle-teal">
                <span style={{ fontSize: '16px' }}>✨</span>
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Suggest a Feature</span>
                <span className="settings-row-subtitle">Tell us what would make this app better</span>
              </div>
            </div>
            <div className="settings-row-right">
              <IconChevronRight size={16} />
            </div>
          </button>
          )}
        </div>
      </div>

      <div>
        <h4 className="settings-group-title">About</h4>
        <div className="settings-group-card">
          <div className="settings-row-item" style={{ cursor: 'default' }}>
            <div className="settings-row-left">
              <div className="settings-squircle squircle-slate">
                <IconSmartphone size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title">Trip Tracker 2026</span>
                <span className="settings-row-subtitle">Version {appVersion ?? '…'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Superadmin Access Link at bottom */}
      {!isSuperadmin && (
        <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '8px' }}>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
            }}
            onClick={() => setIsSuperadminModalOpen(true)}
          >
            <IconShield size={13} /> ⚡ Super User Login
          </button>
        </div>
      )}

      {/* Superadmin Auth Modal */}
      <SuperadminAuthModal
        isOpen={isSuperadminModalOpen}
        onClose={() => setIsSuperadminModalOpen(false)}
        onSuccess={() => setIsSuperadminModalOpen(false)}
      />
    </div>
  );
}
