import React from 'react';
import type { Category } from '../types';
import { IconDownload } from './Icons';
import { CategoryIcon } from './CategoryIcon';

const CATEGORY_ICON_PRESETS = ['🍔', '🏨', '✈️', '🎟️', '🛍️', '📦', '🚗', '⛽', '🎬', '🍺', '💊', '🎁', '🧾', '🏥', '🎓', '🐾', '🎵', '🚕'];

type Props = {
  categories: Category[];
  onDeleteCategory: (id: string, name: string) => void;
  onAddCategory: (e: React.FormEvent) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  newCategoryIcon: string;
  setNewCategoryIcon: (v: string) => void;
  showIconPicker: boolean;
  setShowIconPicker: (v: boolean) => void;

  onExportCsv: () => void;
  isAdmin: boolean;
  onOpenGlobalSettings: () => void;
};

export function SettingsTab({
  categories,
  onDeleteCategory,
  onAddCategory,
  newCategoryName,
  setNewCategoryName,
  newCategoryIcon,
  setNewCategoryIcon,
  showIconPicker,
  setShowIconPicker,
  onExportCsv,
  isAdmin,
  onOpenGlobalSettings,
}: Props) {
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
                  onClick={() => onDeleteCategory(cat.id, cat.name)}
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
          <form onSubmit={onAddCategory} style={{ display: 'flex', gap: '8px' }}>
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
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button type="submit" className="gradient-btn" style={{ padding: '10px 16px' }}>Add</button>
          </form>
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
    </div>
  );
}
