import React, { useState, useEffect } from 'react';
import type { Category, Expense, Trip } from '../types';
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
} from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { useTripStore } from '../store/tripStore';
import { formatDateRange } from '../utils/dateRange';
import { getCategoryKeywords } from '../utils/categoryHelper';

export type ThemePref = 'light' | 'dark' | 'system';

type SubScreen = null | 'categories' | 'recycle-bin' | 'appearance' | 'backups' | 'archived-trips';

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
  importStatus?: 'idle' | 'success' | 'error';
  onImport?: () => void;
  onClearDatabase?: () => void;
  onLoadDemoTrip?: () => void;
  archivedTrips?: Trip[];
  onRestoreTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;

  // Context
  hasActiveTrip?: boolean;
  initialSubScreen?: SubScreen;
  onClose?: () => void;
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
  hasActiveTrip = true,
  initialSubScreen = null,
  onClose,
}: SettingsViewProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(initialSubScreen);

  // Store data
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

  // Category keyword states
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Connectivity and disk storage
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    fetchDeletedExpenses();
  }, [fetchDeletedExpenses]);

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
      if (window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
        onDeleteCategory(cat.id, null);
      }
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
      <div className="fade-in settings-container">
        <div className="settings-subscreen-nav">
          <button type="button" className="settings-back-btn" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} /> Settings
          </button>
          <h3 className="settings-subscreen-title">Categories &amp; Tags</h3>
          <div style={{ width: '20px' }} />
        </div>

        <div className="settings-group">
          <div style={{ padding: '0 8px 6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Tap any category to view and edit its smart auto-tagging keywords &amp; brands.
          </div>
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
                      background: isExpanded ? 'rgba(31,110,104,0.04)' : 'transparent',
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
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontSize: '12px',
                                lineHeight: 1,
                              }}
                              onClick={() => {
                                const updated = allKeywords.filter((k) => k !== kw);
                                updateCategoryKeywords(cat.id, updated);
                              }}
                              title={`Remove "${kw}"`}
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
                            background: newCategoryIcon === icon ? 'rgba(31,110,104,0.10)' : 'var(--bg-surface-hover)',
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
                <label className="form-label">Replacement Category</label>
                <select
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
      <div className="fade-in settings-container">
        <div className="settings-subscreen-nav">
          <button type="button" className="settings-back-btn" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} /> Settings
          </button>
          <h3 className="settings-subscreen-title">Recycle Bin</h3>
          {deletedExpenses.length > 0 ? (
            <button
              type="button"
              style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => {
                if (window.confirm('Permanently delete all expenses in the recycle bin? This cannot be undone.')) {
                  emptyRecycleBin();
                }
              }}
            >
              Empty
            </button>
          ) : (
            <div style={{ width: '30px' }} />
          )}
        </div>

        <div className="settings-group">
          <div style={{ padding: '0 8px 6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Deleted expenses stay in this bin for 24 hours before being permanently purged.
          </div>

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
                      {exp.currency} {exp.amount.toFixed(2)} &middot; {exp.deletedAt ? formatTimeLeft(exp.deletedAt) : ''}
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
                        if (window.confirm(`Permanently delete "${exp.title}"? This cannot be undone.`)) {
                          permanentlyDeleteExpense(exp.id);
                        }
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
      <div className="fade-in settings-container">
        <div className="settings-subscreen-nav">
          <button type="button" className="settings-back-btn" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} /> Settings
          </button>
          <h3 className="settings-subscreen-title">Appearance</h3>
          <div style={{ width: '20px' }} />
        </div>

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

  if (subScreen === 'archived-trips') {
    return (
      <div className="fade-in settings-container">
        <div className="settings-subscreen-nav">
          <button type="button" className="settings-back-btn" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} /> Settings
          </button>
          <h3 className="settings-subscreen-title">Archived Trips</h3>
          <div style={{ width: '20px' }} />
        </div>

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
      <div className="fade-in settings-container">
        <div className="settings-subscreen-nav">
          <button type="button" className="settings-back-btn" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} /> Settings
          </button>
          <h3 className="settings-subscreen-title">Database &amp; Backups</h3>
          <div style={{ width: '20px' }} />
        </div>

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
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Paste backup JSON string here..."
                  style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px' }}
                  value={importJson}
                  onChange={(e) => setImportJson?.(e.target.value)}
                />
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ padding: '8px' }}
                  onClick={() => onImport?.()}
                >
                  Restore Snapshot
                </button>

                {importStatus === 'success' && (
                  <p style={{ color: 'var(--color-success)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully!
                  </p>
                )}
                {importStatus === 'error' && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <IconAlertCircle size={15} className="icon-sm" /> Invalid database snapshot format.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
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

      {/* Group 1: Trip-Specific Settings (When an active trip is selected) */}
      {hasActiveTrip && (
        <div className="settings-group">
          <h4 className="settings-group-title">Trip Preferences</h4>
          <div className="settings-group-card">
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

      {/* Group 2: App & Appearance */}
      <div className="settings-group">
        <h4 className="settings-group-title">App &amp; Interface</h4>
        <div className="settings-group-card">
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
                    backgroundColor: enableGeotagging ? '#00BFA5' : 'var(--border-color)',
                    transition: '0.2s ease',
                    borderRadius: '24px',
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

          {onLoadDemoTrip && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                if (window.confirm('Populate a sample trip ("Road Trip to Goa") with test members and expenses?')) {
                  onLoadDemoTrip();
                  onClose?.();
                }
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-emerald">
                  <IconSparkles size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Seed Demo Data</span>
                  <span className="settings-row-subtitle">Load sample trip with members &amp; split transactions</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Group 4: Account & Danger Zone */}
      <div className="settings-group">
        <h4 className="settings-group-title">Account &amp; Reset</h4>
        <div className="settings-group-card">
          {onSignOut && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                if (window.confirm('Sign out of your account on this device?')) {
                  onSignOut();
                  onClose?.();
                }
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

          {onClearDatabase && (
            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                if (
                  window.confirm(
                    'FACTORY RESET: Are you absolutely sure? This will wipe all local trips, expenses, and settings.'
                  )
                ) {
                  onClearDatabase();
                  onClose?.();
                }
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
    </div>
  );
}
