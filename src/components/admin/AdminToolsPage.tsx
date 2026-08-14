import { useState } from 'react';
import type { Category } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { IconCheck, IconTrash } from '../Icons';

interface Props {
  categories: Category[];
}

export function AdminToolsPage({ categories }: Props) {
  const exportDatabase = useTripStore((s) => s.exportDatabase);
  const importDatabase = useTripStore((s) => s.importDatabase);
  const clearDatabase = useTripStore((s) => s.clearDatabase);
  const loadDemoTrip = useTripStore((s) => s.loadDemoTrip);
  const updateCategoryKeywords = useTripStore((s) => s.updateCategoryKeywords);
  const resetCategoryKeywords = useTripStore((s) => s.resetCategoryKeywords);
  const addCategory = useTripStore((s) => s.addCategory);
  const deleteCategory = useTripStore((s) => s.deleteCategory);

  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'cat-food');
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddCategoryBox, setShowAddCategoryBox] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const activeCategory = categories.find((c) => c.id === selectedCatId) || categories[0];
  const activeKeywords = activeCategory?.keywords || [];

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await addCategory(newCatName.trim(), newCatIcon || '🏷️');
    showToast(`Created category "${newCatName.trim()}"`);
    setNewCatName('');
    setNewCatIcon('🏷️');
    setShowAddCategoryBox(false);
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (window.confirm(`Permanently delete custom category "${catName}"?`)) {
      await deleteCategory(catId);
      if (selectedCatId === catId) {
        setSelectedCatId(categories[0]?.id || 'cat-food');
      }
      showToast(`Deleted category "${catName}"`);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !activeCategory) return;
    const tag = newTagInput.trim().toLowerCase();
    if (activeKeywords.includes(tag)) {
      showToast(`"${tag}" is already in ${activeCategory.name}.`);
      return;
    }
    const updated = [...activeKeywords, tag];
    await updateCategoryKeywords(activeCategory.id, updated);
    setNewTagInput('');
    showToast(`Added keyword "${tag}" to ${activeCategory.name}`);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeCategory) return;
    const updated = activeKeywords.filter((k) => k !== tagToRemove);
    await updateCategoryKeywords(activeCategory.id, updated);
    showToast(`Removed keyword "${tagToRemove}"`);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database exported successfully.');
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    const ok = await importDatabase(importJsonText.trim());
    if (ok) {
      setImportJsonText('');
      setShowImportArea(false);
      showToast('Database restored successfully.');
    } else {
      showToast('Error importing JSON. Check file format.');
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
          ⚙️ System Tools &amp; Operations
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
          Manage AI &amp; keyword auto-tagging rules, perform full JSON database backups, seed test datasets, or factory reset.
        </p>
      </div>

      {toastMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconCheck size={16} /> {toastMsg}
        </div>
      )}

      {/* 1. Category & Brand Auto-Tagging Keyword Editor */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
              🏷️ Category &amp; Brand Auto-Tagging Rule Customizer
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              200+ built-in brands, airlines, hotels, and merchants auto-match expense descriptions into categories.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="secondary-btn"
              style={{ fontSize: '11.5px', padding: '4px 10px', color: 'var(--primary-accent)', borderColor: 'rgba(31, 110, 104, 0.35)' }}
              onClick={() => setShowAddCategoryBox(!showAddCategoryBox)}
            >
              {showAddCategoryBox ? 'Cancel' : '+ New Category'}
            </button>

            {activeCategory && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '11.5px', padding: '4px 10px' }}
                onClick={() => {
                  resetCategoryKeywords(activeCategory.id);
                  showToast(`Reset keywords for ${activeCategory.name}`);
                }}
              >
                Reset Keywords
              </button>
            )}

            {activeCategory?.isCustom && (
              <button
                type="button"
                className="secondary-btn"
                style={{ fontSize: '11.5px', padding: '4px 10px', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.name)}
              >
                Delete Category
              </button>
            )}
          </div>
        </div>

        {/* Create Category Box */}
        {showAddCategoryBox && (
          <form
            onSubmit={handleCreateCategory}
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(31, 110, 104, 0.06)',
              border: '1px solid rgba(31, 110, 104, 0.25)',
              marginBottom: '16px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              className="input-field"
              style={{ width: '48px', textAlign: 'center', fontSize: '16px' }}
              value={newCatIcon}
              maxLength={4}
              onChange={(e) => setNewCatIcon(e.target.value)}
              placeholder="🏷️"
            />
            <input
              type="text"
              className="input-field"
              placeholder="New Category Name (e.g. Diving, Spa, Gear)..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="primary-btn" style={{ padding: '6px 14px', fontSize: '12.5px', flexShrink: 0 }}>
              Create
            </button>
          </form>
        )}

        {/* Category Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-badge${selectedCatId === c.id ? ' active' : ''}`}
              onClick={() => setSelectedCatId(c.id)}
            >
              <span>{c.icon || '🏷️'}</span> {c.name} {c.isCustom ? '★' : ''} ({c.keywords?.length || 0})
            </button>
          ))}
        </div>

        {/* Add keyword form */}
        {activeCategory && (
          <div>
            <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                className="input-field"
                placeholder={`Add custom brand or keyword for ${activeCategory.name} (e.g. "zomato", "uber", "marriott")...`}
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
              />
              <button type="submit" className="primary-btn" style={{ padding: '8px 16px', flexShrink: 0 }}>
                + Add Rule
              </button>
            </form>

            {/* Keyword tag clouds */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '220px', overflowY: 'auto', padding: '4px 0' }}>
              {activeKeywords.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No keywords configured for this category.</span>
              ) : (
                activeKeywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 9px',
                      borderRadius: '8px',
                      background: 'rgba(31, 110, 104, 0.08)',
                      border: '1px solid rgba(31, 110, 104, 0.2)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(kw)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-muted)' }}
                      title="Remove keyword rule"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Database Backup & Restore Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Backup & Demo Seeder Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            💾 Backup &amp; Demo Testing
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Export or restore full JSON snapshots, or seed a comprehensive sample trip.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="primary-btn"
              style={{ width: '100%', padding: '10px' }}
              onClick={handleDownloadBackup}
            >
              📥 Export Database (JSON Backup)
            </button>

            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '10px' }}
              onClick={() => setShowImportArea(!showImportArea)}
            >
              📤 Import / Restore JSON
            </button>

            <button
              type="button"
              className="secondary-btn"
              style={{ width: '100%', padding: '10px', color: 'var(--primary-accent)', borderColor: 'rgba(31, 110, 104, 0.35)' }}
              onClick={async () => {
                await loadDemoTrip();
                showToast('Seeded Demo Trip: "Euro Summer 2026" with sample transactions.');
              }}
            >
              ✨ Seed Demo Dataset ("Euro Summer 2026")
            </button>
          </div>

          {showImportArea && (
            <form onSubmit={handleImportSubmit} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Paste exported JSON data here..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '11.5px' }}
              />
              <button type="submit" className="primary-btn" style={{ padding: '8px' }}>
                Confirm JSON Restore
              </button>
            </form>
          )}
        </div>

        {/* Factory Reset Danger Zone */}
        <div className="glass-card" style={{ padding: '20px', border: '1.5px solid rgba(239, 68, 68, 0.25)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#EF4444', marginBottom: '6px' }}>
            ⚠️ Danger Zone
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Irreversible maintenance actions for testing and clearing local state.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="secondary-btn"
              style={{
                width: '100%',
                padding: '10px',
                color: '#EF4444',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.04)',
              }}
              onClick={async () => {
                if (window.confirm('Wipe all local trips and reset database? This cannot be undone.')) {
                  await clearDatabase();
                  showToast('Database wiped and reset to clean state.');
                }
              }}
            >
              <IconTrash size={16} /> Wipe All Trips &amp; Clear Database
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
