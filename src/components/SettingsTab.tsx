import React from 'react';
import type { Category } from '../types';
import { IconDownload, IconUpload, IconCheckCircle, IconAlertCircle } from './Icons';

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
  onExportJson: () => void;
  showImportArea: boolean;
  setShowImportArea: (v: boolean) => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importStatus: 'idle' | 'success' | 'error';
  onImport: () => void;
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
  onExportJson,
  showImportArea,
  setShowImportArea,
  importJson,
  setImportJson,
  importStatus,
  onImport,
}: Props) {
  return (
    <div className="fade-in">
      <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Settings & Data Utility</h3>

      {/* Manage Categories */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Manage Categories</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(15,23,42,0.02)', borderRadius: 'var(--border-radius-sm)' }}>
              <span style={{ fontSize: '14px' }}>{cat.icon} {cat.name}</span>
              {cat.isCustom ? (
                <button
                  className="secondary-btn"
                  style={{ padding: '3px 8px', fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.15)' }}
                  onClick={() => onDeleteCategory(cat.id, cat.name)}
                >
                  Delete
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Built-in</span>
              )}
            </div>
          ))}
        </div>

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
              style={{ width: '56px', textAlign: 'center' }}
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
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 20,
                width: '176px', display: 'flex', flexWrap: 'wrap', gap: '4px',
                padding: '8px', background: '#fff', border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.15)'
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
                      width: '28px', height: '28px', fontSize: '15px', lineHeight: 1,
                      borderRadius: '6px', cursor: 'pointer',
                      border: newCategoryIcon === icon ? '2px solid var(--primary-accent)' : '1px solid transparent',
                      background: newCategoryIcon === icon ? 'rgba(31,110,104,0.10)' : 'transparent',
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
      </div>

      {/* Excel CSV Exporter */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>Excel CSV Export</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Download a secure, formula-injection-protected CSV file containing your expense lists, member balances, and outstanding settlements. This file can be opened directly in Microsoft Excel or Google Sheets.
        </p>
        <button className="gradient-btn" style={{ padding: '12px' }} onClick={onExportCsv}>
          <IconDownload size={16} className="icon-sm" /> Export Excel CSV
        </button>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px' }}>JSON Database Backups</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Export your complete local database state to import onto another device or keep as a secure offline backup.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="gradient-btn" style={{ flex: 1, padding: '12px' }} onClick={onExportJson}>
            <IconDownload size={16} className="icon-sm" /> Export Backup JSON
          </button>
          <button className="secondary-btn" style={{ flex: 1, padding: '12px' }} onClick={() => setShowImportArea(!showImportArea)}>
            <IconUpload size={16} className="icon-sm" /> Import Backup JSON
          </button>
        </div>

        {showImportArea && (
          <div className="fade-in" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              className="input-field"
              rows={6}
              placeholder="Paste backup JSON string here..."
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            <button className="gradient-btn" style={{ padding: '10px' }} onClick={onImport}>
              Restore State
            </button>

            {importStatus === 'success' && (
              <p style={{ color: 'var(--color-success)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully! Reloading...
              </p>
            )}
            {importStatus === 'error' && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <IconAlertCircle size={15} className="icon-sm" /> Invalid database backup format. Please verify the string.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
