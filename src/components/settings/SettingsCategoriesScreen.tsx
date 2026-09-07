import { useState, type FormEvent } from 'react';
import type { Category, Expense } from '../../types';
import type { ConfirmRequest } from '../ConfirmDialog';
import { CategoryIcon } from '../CategoryIcon';
import { getCategoryKeywords } from '../../utils/categoryHelper';
import { useHistoryBack } from '../../utils/useHistoryBack';
import { useEscapeKey } from '../../utils/useEscapeKey';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

const CATEGORY_ICON_PRESETS = [
  '🍔', '🏨', '✈️', '🎟️', '🛍️', '📦', '🚗', '⛽', '🎬', '🍺', '💊', '🎁', '🧾', '🏥', '🎓', '🐾', '🎵', '🚕',
  '🏖️', '🗺️', '🧳', '🚆', '🚢', '🚌', '🎫', '🍽️', '☕', '🏔️', '🏛️', '📸', '🛂', '💱',
];

type Props = {
  parentTitle: string;
  onBack: () => void;
  categories: Category[];
  activeTripExpenses: Expense[];
  isAdmin: boolean;
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  updateCategoryKeywords: (categoryId: string, keywords: string[]) => void;
  resetCategoryKeywords: (categoryId: string) => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
};

export function SettingsCategoriesScreen({
  parentTitle,
  onBack,
  categories,
  activeTripExpenses,
  isAdmin,
  onAddCategory,
  onDeleteCategory,
  updateCategoryKeywords,
  resetCategoryKeywords,
  onRequestConfirm,
}: Props) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useHistoryBack(expandedCategoryId !== null, () => {
    setExpandedCategoryId(null);
  });
  useEscapeKey(expandedCategoryId !== null, () => setExpandedCategoryId(null));
  useHistoryBack(showIconPicker, () => setShowIconPicker(false));
  useEscapeKey(showIconPicker, () => setShowIconPicker(false));

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim(), newCategoryIcon.trim() || '🏷️');
    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteCategoryTrigger = (cat: Category) => {
    const affectedCount = activeTripExpenses.filter((e) => e.category === cat.id).length;
    if (affectedCount === 0) {
      onRequestConfirm?.({
        title: 'Delete category',
        message: `Are you sure you want to delete the category "${cat.name}"?`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => onDeleteCategory(cat.id, null),
      });
      return;
    }

    const otherCats = categories.filter((c) => c.id !== cat.id);
    const mergeRef = { current: otherCats[0]?.id || '' };
    onRequestConfirm?.({
      title: 'Merge and Delete Category',
      message: `The category "${cat.name}" is currently used in ${affectedCount} expense${affectedCount === 1 ? '' : 's'}. Select a replacement category to merge these expenses into:`,
      body: (
        <select
          id="merge-target-category"
          className="input-field select-field"
          defaultValue={mergeRef.current}
          aria-label="Replacement category"
          style={{ height: '40px', width: '100%' }}
          onChange={(e) => {
            mergeRef.current = e.target.value;
          }}
        >
          {otherCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ),
      confirmLabel: 'Merge & Delete',
      danger: true,
      onConfirm: () => onDeleteCategory(cat.id, mergeRef.current || null),
    });
  };

  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Categories & Tags"
      subtitle="Tap any category to view and edit its smart auto-tagging keywords & brands."
    >
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
                        aria-label={`Add keyword for ${cat.name}`}
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
    </SettingsSubscreenFrame>
  );
}
