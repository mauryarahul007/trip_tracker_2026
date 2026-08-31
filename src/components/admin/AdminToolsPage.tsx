import { useState, useEffect } from 'react';
import type { Category, Trip, Expense } from '../../types';
import { useTripStore } from '../../store/tripStore';
import { useAuthStore } from '../../store/authStore';
import { purgeRecycleBinOlderThan, fetchAppFlag, setAppConfigValue } from '../../services/tripApi';
import { exportFleetSummaryToCSV } from '../../utils/csvExport';
import { IconCheck, IconTrash, IconAlertCircle, IconRefresh } from '../Icons';
import type { ConfirmRequest } from '../ConfirmDialog';

export const BACKDROP_PRESETS = [
  {
    id: 'tropical-beach',
    title: 'Tropical Paradise',
    tag: 'Default',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'swiss-alps',
    title: 'Swiss Alps Summit',
    tag: 'Mountains',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'kyoto-bamboo',
    title: 'Kyoto Bamboo Forest',
    tag: 'Nature',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'amalfi-coast',
    title: 'Amalfi Coastline',
    tag: 'Coastal',
    url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'nordic-aurora',
    title: 'Nordic Aurora Fjords',
    tag: 'Aurora',
    url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'tokyo-neon',
    title: 'Tokyo Metropolis',
    tag: 'City',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1000&auto=format&fit=crop',
  },
];

interface Props {
  categories: Category[];
  trips: Trip[];
  expenses: Expense[];
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  onRequestConfirm: (req: ConfirmRequest) => void;
}

export function AdminToolsPage({ categories, trips, expenses, onRefresh, isRefreshing, onRequestConfirm }: Props) {
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

  // Landing page backdrop customization state
  const [activeBackdropUrl, setActiveBackdropUrl] = useState<string>(BACKDROP_PRESETS[0].url);
  const [customBackdropInput, setCustomBackdropInput] = useState<string>('');
  const [isSavingBackdrop, setIsSavingBackdrop] = useState<boolean>(false);

  useEffect(() => {
    fetchAppFlag('landing_backdrop_url')
      .then((val) => {
        if (typeof val === 'string' && val.trim()) {
          setActiveBackdropUrl(val.trim());
          setCustomBackdropInput(val.trim());
        }
      })
      .catch(() => {});
  }, []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [purgeDays, setPurgeDays] = useState('30');
  const [isPurging, setIsPurging] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSelectPreset = (url: string) => {
    setActiveBackdropUrl(url);
    setCustomBackdropInput(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setActiveBackdropUrl(dataUrl);
        setCustomBackdropInput(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBackdrop = async () => {
    const targetUrl = customBackdropInput.trim() || activeBackdropUrl;
    if (!targetUrl) return;
    setIsSavingBackdrop(true);
    try {
      await setAppConfigValue('landing_backdrop_url', targetUrl);
      setActiveBackdropUrl(targetUrl);
      try { localStorage.setItem('tt-landing-bg-cache', targetUrl); } catch {}
      showToast('Landing page background successfully updated!');
    } catch (e) {
      showToast('Failed to save background config.');
    } finally {
      setIsSavingBackdrop(false);
    }
  };

  const handleResetBackdrop = async () => {
    setIsSavingBackdrop(true);
    try {
      await setAppConfigValue('landing_backdrop_url', null);
      setActiveBackdropUrl(BACKDROP_PRESETS[0].url);
      setCustomBackdropInput('');
      try { localStorage.removeItem('tt-landing-bg-cache'); } catch {}
      showToast('Landing backdrop reset to Default Tropical Paradise.');
    } catch (e) {
      showToast('Failed to reset background config.');
    } finally {
      setIsSavingBackdrop(false);
    }
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

  const handleDeleteCategory = (catId: string, catName: string) => {
    onRequestConfirm({
      title: 'Delete category',
      message: `Permanently delete custom category "${catName}"?`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await deleteCategory(catId);
        if (selectedCatId === catId) {
          setSelectedCatId(categories[0]?.id || 'cat-food');
        }
        showToast(`Deleted category "${catName}"`);
      },
    });
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

  const handlePurgeRecycleBin = () => {
    const days = Number(purgeDays) || 30;
    onRequestConfirm({
      title: 'Purge recycle bin',
      message: `Permanently delete every recycled expense older than ${days} days, across all trips? This cannot be undone.`,
      confirmLabel: 'Purge',
      danger: true,
      onConfirm: async () => {
        setIsPurging(true);
        try {
          const count = await purgeRecycleBinOlderThan(days);
          showToast(`Purged ${count} expired recycle-bin item${count === 1 ? '' : 's'}.`);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Purge failed.');
        } finally {
          setIsPurging(false);
        }
      },
    });
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
    const result = await importDatabase(importJsonText.trim());
    if (result.success) {
      setImportJsonText('');
      setShowImportArea(false);
      showToast('Database restored successfully.');
    } else {
      showToast(result.error || 'Error importing JSON. Check file format.');
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div className="ops-page-head">
        <div>
          <h2>System Tools</h2>
          <p>Manage keyword auto-tagging rules, perform full JSON database backups, seed test datasets, or factory reset.</p>
        </div>
        <button type="button" className="ops-btn" disabled={isRefreshing} onClick={() => void onRefresh()}>
          <IconRefresh size={13} className={isRefreshing ? 'icon-sm ops-spin' : 'icon-sm'} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {toastMsg && (
        <div className="ops-toast">
          <IconCheck size={14} /> {toastMsg}
        </div>
      )}

      <div className="ops-tools-grid">
        <div className="ops-rail-label" style={{ padding: '0' }}>Account</div>
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
              <label className="ops-form-label" htmlFor="admin-new-password">New Password</label>
              <input
                id="admin-new-password"
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
              <label className="ops-form-label" htmlFor="admin-confirm-password">Confirm New Password</label>
              <input
                id="admin-confirm-password"
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

        <div className="ops-rail-label" style={{ padding: '0' }}>Visuals &amp; Branding</div>
        <div className="ops-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '4px' }}>
            <div>
              <h3 className="ops-section-title">Landing Page Cover Gallery</h3>
              <p className="ops-section-sub">Select a high-resolution travel preset or upload custom photography for visitor onboarding.</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="ops-btn"
                onClick={handleResetBackdrop}
                disabled={isSavingBackdrop}
                title="Reset to default tropical beach"
              >
                Reset Default
              </button>
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                onClick={handleSaveBackdrop}
                disabled={isSavingBackdrop}
              >
                {isSavingBackdrop ? 'Saving...' : 'Apply Background'}
              </button>
            </div>
          </div>

          <div className="ops-gallery-grid">
            {BACKDROP_PRESETS.map((preset) => {
              const isSelected = activeBackdropUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="ops-gallery-item"
                  data-selected={isSelected}
                  onClick={() => handleSelectPreset(preset.url)}
                  title={`Select ${preset.title}`}
                >
                  <div
                    className="ops-gallery-thumb"
                    style={{ backgroundImage: `url("${preset.url}")` }}
                  >
                    <span className="ops-gallery-tag">{preset.tag}</span>
                  </div>
                  <div className="ops-gallery-info">
                    <span>{preset.title}</span>
                    {isSelected && <span style={{ color: '#38BDF8', fontSize: '13px' }}>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="url"
                className="ops-input mono"
                placeholder="Or paste custom image URL (Unsplash, CDN, Supabase Storage)..."
                value={customBackdropInput}
                onChange={(e) => {
                  setCustomBackdropInput(e.target.value);
                  if (e.target.value.trim()) setActiveBackdropUrl(e.target.value.trim());
                }}
                style={{ flex: 1, minWidth: '240px' }}
              />
              <label className="ops-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span>📁 Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Live Landing Preview Banner */}
            <div className="ops-backdrop-preview-box">
              <div
                className="ops-backdrop-preview-bg"
                style={{ backgroundImage: `url("${activeBackdropUrl}")` }}
              />
              <div className="ops-backdrop-preview-scrim" />
              <div className="ops-backdrop-preview-content">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '9999px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '10px', color: '#67E8F9', fontFamily: 'var(--font-family-mono)', fontWeight: 700, marginBottom: '4px' }}>
                  🌴 PARADISE EDITION · 2026
                </div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Trip Tracker</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#E2E8F0', opacity: 0.9, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  Split costs effortlessly with travel companions anywhere on earth.
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <div style={{ padding: '4px 8px', borderRadius: '8px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(10px)' }}>
                    <span>⚡</span> 100% Offline-First
                  </div>
                  <div style={{ padding: '4px 8px', borderRadius: '8px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(10px)' }}>
                    <span>⚖️</span> Smart Split Engine
                  </div>
                  <div style={{ padding: '4px 8px', borderRadius: '8px', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>G</span> Continue with Google
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ops-rail-label" style={{ padding: '0' }}>Content Ops</div>
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

        <div className="ops-rail-label" style={{ padding: '0' }}>Data</div>
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
                showToast('Seeded Demo Trip: "Road Trip to Goa ☀️" with sample transactions & geotagged route.');
              }}
            >
              <span className="ops-mb-icon">&#9998; SEED</span>Load &quot;Road Trip to Goa ☀️&quot; Demo
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

        <details className="ops-card ops-caution ops-danger-zone">
          <summary>
            <div className="ops-caution-head ops-danger-zone-trigger">
              <strong>&#9888; Master Caution &mdash; Danger Zone</strong>
              <svg className="chev icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </summary>
          <p>Irreversible. Wipes every local trip and resets the database cache.</p>
          <div className="ops-form-group">
            <label className="ops-form-label" htmlFor="wipe-confirm-text">Type WIPE to confirm</label>
            <input
              id="wipe-confirm-text"
              type="text"
              className="ops-input"
              style={{ maxWidth: '220px' }}
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder="WIPE"
            />
          </div>
          <button
            type="button"
            className="ops-guard-btn"
            disabled={wipeConfirmText.trim().toUpperCase() !== 'WIPE'}
            style={wipeConfirmText.trim().toUpperCase() !== 'WIPE' ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            onClick={async () => {
              await clearDatabase();
              setWipeConfirmText('');
              showToast('Database wiped and reset to clean state.');
            }}
          >
            <IconTrash size={15} /> Wipe All Trips &amp; Reset
          </button>
        </details>
      </div>
    </div>
  );
}
