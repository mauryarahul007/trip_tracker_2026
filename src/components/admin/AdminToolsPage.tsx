import { useState } from 'react';
import type { Category, Trip, Expense } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';
import { purgeRecycleBinOlderThan } from '../../services/tripApi';
import { exportFleetSummaryToCSV } from '../../utils/csvExport';
import { IconCheck, IconTrash, IconAlertCircle } from '../Icons';

interface Props {
  categories: Category[];
  trips: Trip[];
  expenses: Expense[];
}

export function AdminToolsPage({ categories, trips, expenses }: Props) {
  const exportDatabase = useTripStore((s) => s.exportDatabase);
  const importDatabase = useTripStore((s) => s.importDatabase);
  const clearDatabase = useTripStore((s) => s.clearDatabase);
  const loadDemoTrip = useTripStore((s) => s.loadDemoTrip);
  const updateCategoryKeywords = useTripStore((s) => s.updateCategoryKeywords);
  const resetCategoryKeywords = useTripStore((s) => s.resetCategoryKeywords);
  const addCategory = useTripStore((s) => s.addCategory);
  const deleteCategory = useTripStore((s) => s.deleteCategory);
  const updateOwnPassword = useAuthStore((s) => s.updateOwnPassword);

  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'cat-food');
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddCategoryBox, setShowAddCategoryBox] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [purgeDays, setPurgeDays] = useState('30');
  const [isPurging, setIsPurging] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await updateOwnPassword(newPassword);
      if (res.success) {
        showToast(res.message);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message);
      }
    } finally {
      setIsChangingPassword(false);
    }
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

  const handleExportFleetCSV = () => {
    const csv = exportFleetSummaryToCSV(trips, expenses);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-tracker-fleet-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Fleet summary CSV exported.');
  };

  const handlePurgeRecycleBin = async () => {
    const days = Number(purgeDays) || 30;
    if (!window.confirm(`Permanently delete every recycled expense older than ${days} days, across all trips? This cannot be undone.`)) {
      return;
    }
    setIsPurging(true);
    try {
      const count = await purgeRecycleBinOlderThan(days);
      showToast(`Purged ${count} expired recycle-bin item${count === 1 ? '' : 's'}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Purge failed.');
    } finally {
      setIsPurging(false);
    }
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
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="ops-page-head">
        <div>
          <h2>System Tools</h2>
          <p>Manage keyword auto-tagging rules, perform full JSON database backups, seed test datasets, or factory reset.</p>
        </div>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      <div className="ops-tools-grid">
        <div className="ops-card">
          <h3 className="ops-section-title">Change Your Password</h3>
          <p className="ops-section-sub">Updates the password for this superadmin account. You'll stay signed in.</p>

          {passwordError && (
            <div className="ops-toast" style={{ background: 'var(--danger-dim)', borderColor: 'var(--danger-line)', color: 'var(--danger)', marginBottom: '12px' }}>
              <IconAlertCircle size={14} /> {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '340px' }}>
            <div className="ops-form-group">
              <label className="ops-form-label">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="ops-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <div className="ops-form-group">
              <label className="ops-form-label">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="ops-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <button type="submit" className="ops-btn ops-btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isChangingPassword}>
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="ops-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '4px' }}>
            <div>
              <h3 className="ops-section-title">Brand &amp; Keyword Auto-Tagging</h3>
              <p className="ops-section-sub">200+ merchant rules route expense descriptions into categories.</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="ops-btn" onClick={() => setShowAddCategoryBox(!showAddCategoryBox)}>
                {showAddCategoryBox ? 'Cancel' : '+ New Category'}
              </button>
              {activeCategory && (
                <button
                  type="button"
                  className="ops-btn"
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
                  className="ops-btn ops-btn-danger"
                  onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.name)}
                >
                  Delete Category
                </button>
              )}
            </div>
          </div>

          {showAddCategoryBox && (
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px', padding: '12px 14px', border: '1px solid var(--line-strong)', borderRadius: '3px', marginBottom: '14px', alignItems: 'center', background: 'var(--bg-inset)' }}>
              <input
                type="text"
                className="ops-input"
                style={{ width: '52px', textAlign: 'center', fontSize: '16px' }}
                value={newCatIcon}
                maxLength={4}
                onChange={(e) => setNewCatIcon(e.target.value)}
                placeholder="🏷️"
              />
              <input
                type="text"
                className="ops-input"
                placeholder="New category name (e.g. Diving, Spa, Gear)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="ops-btn" style={{ flexShrink: 0 }}>Create</button>
            </form>
          )}

          <div className="ops-cat-tabs">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="ops-cat-tab"
                data-active={selectedCatId === c.id}
                onClick={() => setSelectedCatId(c.id)}
              >
                {c.icon || '🏷️'} {c.name} {c.isCustom ? '★' : ''} ({c.keywords?.length || 0})
              </button>
            ))}
          </div>

          {activeCategory && (
            <div>
              <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                  type="text"
                  className="ops-input mono"
                  placeholder={`Add custom brand or keyword for ${activeCategory.name} (e.g. "zomato", "uber", "marriott")...`}
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                />
                <button type="submit" className="ops-btn" style={{ flexShrink: 0 }}>+ Add Rule</button>
              </form>

              <div className="ops-tag-cloud">
                {activeKeywords.length === 0 ? (
                  <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>No keywords configured for this category.</span>
                ) : (
                  activeKeywords.map((kw) => (
                    <span key={kw} className="ops-tag">
                      {kw}
                      <button type="button" onClick={() => handleRemoveTag(kw)} title="Remove keyword rule">&times;</button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Backup &amp; Demo Data</h3>
          <p className="ops-section-sub">Export or restore full JSON snapshots.</p>
          <div className="ops-maint-row">
            <button type="button" className="ops-maint-btn" onClick={handleDownloadBackup}>
              <span className="ops-mb-icon">&darr; EXPORT</span>Download JSON Backup
            </button>
            <button type="button" className="ops-maint-btn" onClick={() => setShowImportArea(!showImportArea)}>
              <span className="ops-mb-icon">&uarr; RESTORE</span>Import / Restore JSON
            </button>
            <button
              type="button"
              className="ops-maint-btn"
              onClick={async () => {
                await loadDemoTrip();
                showToast('Seeded Demo Trip: "Euro Summer 2026" with sample transactions.');
              }}
            >
              <span className="ops-mb-icon">&#9998; SEED</span>Load &quot;Euro Summer 2026&quot; Demo
            </button>
            <button type="button" className="ops-maint-btn" onClick={handleExportFleetCSV}>
              <span className="ops-mb-icon">&darr; CSV</span>Export Fleet Summary (All Trips)
            </button>
          </div>

          {showImportArea && (
            <form onSubmit={handleImportSubmit} style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                className="ops-input mono"
                rows={4}
                placeholder="Paste exported JSON data here..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
              />
              <button type="submit" className="ops-btn">Confirm JSON Restore</button>
            </form>
          )}
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Recycle Bin Purge</h3>
          <p className="ops-section-sub">
            Deleted expenses auto-purge on the retention window set in Flags (default 24h). Force an early purge across every trip here.
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              className="ops-input"
              style={{ width: '90px' }}
              value={purgeDays}
              onChange={(e) => setPurgeDays(e.target.value)}
            />
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>days</span>
            <button type="button" className="ops-btn ops-btn-danger" disabled={isPurging} onClick={handlePurgeRecycleBin}>
              {isPurging ? 'Purging...' : 'Purge Now'}
            </button>
          </div>
        </div>

        <div className="ops-card ops-caution">
          <div className="ops-caution-head">
            <strong>&#9888; Master Caution &mdash; Danger Zone</strong>
          </div>
          <p>Irreversible. Wipes every local trip and resets the database cache.</p>
          <button
            type="button"
            className="ops-guard-btn"
            onClick={async () => {
              if (window.confirm('Wipe all local trips and reset database? This cannot be undone.')) {
                await clearDatabase();
                showToast('Database wiped and reset to clean state.');
              }
            }}
          >
            <IconTrash size={15} /> Wipe All Trips &amp; Reset
          </button>
        </div>
      </div>
    </div>
  );
}
