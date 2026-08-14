import React, { useEffect, useState } from 'react';
import type { Category, Expense } from '../types';
import { IconDownload, IconArchive, IconTrash } from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { useTripStore } from '../store/tripStore';

const RECYCLE_BIN_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatTimeLeft(deletedAt: number): string {
  const msLeft = deletedAt + RECYCLE_BIN_WINDOW_MS - Date.now();
  if (msLeft <= 0) return 'purging soon';
  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
  if (hoursLeft < 1) return '<1h left';
  return `${hoursLeft}h left`;
}

const CATEGORY_ICON_PRESETS = ['🍔', '🏨', '✈️', '🎟️', '🛍️', '📦', '🚗', '⛽', '🎬', '🍺', '💊', '🎁', '🧾', '🏥', '🎓', '🐾', '🎵', '🚕'];

type Props = {
  categories: Category[];
  activeTripExpenses: Expense[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv: () => void;
  isAdmin: boolean;
  onOpenGlobalSettings: () => void;
};

export function SettingsTab({
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin,
  onOpenGlobalSettings,
}: Props) {
  const deletedExpenses = useTripStore((s) => s.deletedExpenses);
  const fetchDeletedExpenses = useTripStore((s) => s.fetchDeletedExpenses);
  const restoreExpense = useTripStore((s) => s.restoreExpense);
  const permanentlyDeleteExpense = useTripStore((s) => s.permanentlyDeleteExpense);
  const emptyRecycleBin = useTripStore((s) => s.emptyRecycleBin);

  useEffect(() => {
    fetchDeletedExpenses();
  }, [fetchDeletedExpenses]);

  // Local form states
  const [newCategoryName, setNewCategoryName] = useState('');

  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Delete & Merge dialog state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim(), newCategoryIcon.trim() || '🏷️');
    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteTrigger = (cat: Category) => {
    const affectedCount = activeTripExpenses.filter((e) => e.category === cat.id).length;
    if (affectedCount > 0) {
      const otherCats = categories.filter((c) => c.id !== cat.id);
      setMergeTargetId(otherCats[0]?.id || '');
      setCategoryToDelete(cat);
    } else {
      // Just double check simple delete
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

  return (
    <div className="fade-in">
      <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Trip Settings</h3>

      {/* Manage Categories */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Manage Categories</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 'var(--border-radius-sm)' }}>
              <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-accent)' }}>
                <CategoryIcon categoryId={cat.id} fallbackEmoji={cat.icon} size={16} />
                <span style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
              </span>
              {cat.isCustom && isAdmin ? (
                <button
                  className="secondary-btn"
                  style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                  onClick={() => handleDeleteTrigger(cat)}
                >
                  Delete
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{cat.isCustom ? 'Custom' : 'Built-in'}</span>
              )}
            </div>
          ))}
        </div>

        {!isAdmin && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Only the trip admin can manage categories.</p>
        )}

        {isAdmin && (
          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
            <h5 style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Add Custom Category</h5>

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
                  title="Pick an emoji or type/paste your own"
                />
                {showIconPicker && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
                    width: '204px', display: 'flex', flexWrap: 'wrap', gap: '6px',
                    padding: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)', boxShadow: '0 10px 25px -5px rgba(28,42,56,0.2)'
                  }}>
                    {CATEGORY_ICON_PRESETS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          setNewCategoryIcon(icon);
                          setShowIconPicker(false);
                        }}
                        style={{
                          width: '32px', height: '32px', fontSize: '16px', lineHeight: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 'var(--border-radius-sm)', cursor: 'pointer',
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
              <button type="submit" className="gradient-btn" style={{ padding: '10px 16px' }}>Add</button>
            </form>
          </div>
        )}
      </div>

      {/* Recycle Bin */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '16px', margin: 0 }}>Recycle Bin</h4>
          {deletedExpenses.length > 0 && (
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '4px 10px', fontSize: '11.5px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
              onClick={() => {
                if (window.confirm('Permanently delete all expenses in the recycle bin? This cannot be undone.')) {
                  emptyRecycleBin();
                }
              }}
            >
              Empty Bin
            </button>
          )}
        </div>
        {deletedExpenses.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            No deleted expenses. Deleted expenses stay here for 24 hours before being permanently removed.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {deletedExpenses.map((exp) => (
              <div
                key={exp.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 'var(--border-radius-sm)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
            ))}
          </div>
        )}
      </div>

      {/* Excel CSV Exporter */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Excel CSV Export</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Download a secure, formula-injection-protected CSV file containing your expense lists, member balances, and outstanding settlements.
        </p>
        <button className="gradient-btn" style={{ padding: '12px' }} onClick={onExportCsv}>
          <IconDownload size={16} className="icon-sm" /> Export Excel CSV
        </button>
      </div>

      {/* Global Preferences CTA */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Global Preferences & Account</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Need to change theme appearance (Night flight), import/export backup databases, manage your account, or sign out?
        </p>
        <button type="button" className="secondary-btn" style={{ padding: '12px' }} onClick={onOpenGlobalSettings}>
          Open Global Settings
        </button>
      </div>

      {/* Merge & Delete Category Dialog */}
      {categoryToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1100, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', background: '#ffffff', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Merge and Delete Category</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              The category <strong>"{categoryToDelete.name}"</strong> is currently used in <strong>{affectedExpensesCount}</strong> expense{affectedExpensesCount === 1 ? '' : 's'}. 
              To delete this category, please select a replacement category to merge these expenses into:
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
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1 }}
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gradient-btn"
                style={{ flex: 1, background: 'var(--color-danger)' }}
                onClick={handleConfirmMergeDelete}
              >
                Merge &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
