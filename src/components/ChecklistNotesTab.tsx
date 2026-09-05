import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/tripStore';
import type { Trip, Member, TripNote, ChecklistItem } from '../types';
import {
  IconClipboardList,
  IconPin,
  IconCopy,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconClose,
  IconSearch,
} from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { SwipeableRow } from './SwipeableRow';
import { ConfettiBurst } from './ConfettiBurst';

type Props = {
  trip: Trip;
  members: Member[];
};

type ViewMode = 'checklist' | 'notes';
type ChecklistCategory = 'all' | 'packing' | 'documents' | 'medical' | 'general';
type NoteCategory = 'all' | 'wifi' | 'stay' | 'transport' | 'contact' | 'general';

const CHECKLIST_CATEGORIES: { id: ChecklistCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'packing', label: 'Packing', icon: '🎒' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'medical', label: 'Medical', icon: '💊' },
  { id: 'general', label: 'General', icon: '⚡' },
];

const NOTE_CATEGORIES: { id: NoteCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Notes', icon: '📝' },
  { id: 'wifi', label: 'Wi-Fi & Codes', icon: '📶' },
  { id: 'stay', label: 'Hotel & Stay', icon: '🏨' },
  { id: 'transport', label: 'Tickets & PNR', icon: '✈️' },
  { id: 'contact', label: 'Cab & Contacts', icon: '📞' },
  { id: 'general', label: 'General Info', icon: '💡' },
];

export function ChecklistNotesTab({ trip, members }: Props) {
  // Always select live trip from store to react to changes
  const liveTrip = useTripStore((s) => s.trips.find((t) => t.id === trip.id)) || trip;
  const {
    addChecklistItem,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    addTripNote,
    updateTripNote,
    deleteTripNote,
  } = useTripStore();

  const [viewMode, setViewMode] = useState<ViewMode>('checklist');
  const [checklistFilter, setChecklistFilter] = useState<ChecklistCategory>('all');
  const [noteFilter, setNoteFilter] = useState<NoteCategory>('all');

  // Quick Add Checklist item state
  const [quickItemText, setQuickItemText] = useState('');
  const [quickItemCategory, setQuickItemCategory] = useState<Exclude<ChecklistCategory, 'all'>>('packing');
  const [quickItemAssignee, setQuickItemAssignee] = useState<string>('');

  // Checklist Item Edit Modal state
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklistItem, setEditingChecklistItem] = useState<ChecklistItem | null>(null);
  const [editItemText, setEditItemText] = useState('');
  const [editItemCategory, setEditItemCategory] = useState<Exclude<ChecklistCategory, 'all'>>('packing');
  const [editItemAssignee, setEditItemAssignee] = useState<string>('');
  const [editItemCompleted, setEditItemCompleted] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Note Modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<Exclude<NoteCategory, 'all'>>('general');
  const [noteIsPinned, setNoteIsPinned] = useState(false);

  // Copy feedback state
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const checklist = liveTrip.checklist || [];
  const notes = liveTrip.notes || [];

  const completedCount = checklist.filter((i) => i.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered Checklist
  const filteredChecklist = useMemo(() => {
    let list = checklist;
    if (checklistFilter !== 'all') {
      list = list.filter((item) => item.category === checklistFilter);
    }
    if (hideCompleted) {
      list = list.filter((item) => !item.completed);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.text.toLowerCase().includes(q) ||
          (item.assignedTo && item.assignedTo.toLowerCase().includes(q))
      );
    }
    // Sort uncompleted items first, then completed items
    return [...list].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  }, [checklist, checklistFilter, hideCompleted, searchQuery]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    let list = notes;
    if (noteFilter !== 'all') {
      list = list.filter((item) => item.category === noteFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q)
      );
    }
    // Pinned notes first, then latest updated
    return [...list].sort((a, b) => {
      const pinA = Boolean(a.pinned ?? a.isPinned);
      const pinB = Boolean(b.pinned ?? b.isPinned);
      if (pinA !== pinB) return pinA ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [notes, noteFilter, searchQuery]);

  const handleAddChecklistItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = quickItemText.trim();
    if (!text) return;

    triggerHaptic('light');
    await addChecklistItem(liveTrip.id, {
      text,
      completed: false,
      category: quickItemCategory,
      assignedTo: quickItemAssignee || undefined,
    });
    setQuickItemText('');
  };

  const handleToggleChecklist = async (itemId: string) => {
    const item = checklist.find((i) => i.id === itemId);
    const willBeCompleted = item ? !item.completed : false;

    if (willBeCompleted && completedCount + 1 === totalCount && totalCount > 0) {
      triggerHaptic('success');
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3800);
    } else {
      triggerHaptic('light');
    }
    await toggleChecklistItem(liveTrip.id, itemId);
  };

  const handleDeleteChecklist = async (itemId: string) => {
    triggerHaptic('warning');
    await deleteChecklistItem(liveTrip.id, itemId);
  };

  const handleOpenEditChecklistModal = (item: ChecklistItem) => {
    triggerHaptic('light');
    setEditingChecklistItem(item);
    setEditItemText(item.text);
    setEditItemCategory((item.category as Exclude<ChecklistCategory, 'all'>) || 'packing');
    setEditItemAssignee(item.assignedTo || '');
    setEditItemCompleted(Boolean(item.completed));
    setIsChecklistModalOpen(true);
  };

  const handleSaveChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChecklistItem || !editItemText.trim()) return;

    triggerHaptic('success');
    await updateChecklistItem(liveTrip.id, editingChecklistItem.id, {
      text: editItemText.trim(),
      category: editItemCategory,
      assignedTo: editItemAssignee || undefined,
      completed: editItemCompleted,
    });
    setIsChecklistModalOpen(false);
    setEditingChecklistItem(null);
  };

  const handleSeedDefaults = async () => {
    triggerHaptic('medium');
    const essentials: Array<{ text: string; category: Exclude<ChecklistCategory, 'all'> }> = [
      { text: 'Passports & Government IDs', category: 'documents' },
      { text: 'Flight / Train E-tickets & Boarding Passes', category: 'documents' },
      { text: 'Hotel Booking Confirmations & PNR', category: 'documents' },
      { text: 'Phone Chargers & Power Banks', category: 'packing' },
      { text: 'Universal Power Adapter', category: 'packing' },
      { text: 'Personal Medications & First Aid Kit', category: 'medical' },
      { text: 'Emergency Cash & Travel Cards', category: 'general' },
      { text: 'Weather appropriate jackets / Raincoats', category: 'packing' },
    ];

    for (const item of essentials) {
      await addChecklistItem(liveTrip.id, {
        text: item.text,
        completed: false,
        category: item.category,
      });
    }
  };

  const handleOpenNewNoteModal = () => {
    triggerHaptic('light');
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('general');
    setNoteIsPinned(false);
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNoteModal = (note: TripNote) => {
    triggerHaptic('light');
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category || 'general');
    setNoteIsPinned(Boolean(note.pinned ?? note.isPinned));
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = noteTitle.trim();
    const content = noteContent.trim();
    if (!title || !content) return;

    triggerHaptic('medium');
    if (editingNoteId) {
      await updateTripNote(liveTrip.id, editingNoteId, {
        title,
        content,
        category: noteCategory,
        pinned: noteIsPinned,
        isPinned: noteIsPinned,
      });
    } else {
      await addTripNote(liveTrip.id, {
        title,
        content,
        category: noteCategory,
        pinned: noteIsPinned,
        isPinned: noteIsPinned,
      });
    }
    setIsNoteModalOpen(false);
  };

  const handleTogglePinNote = async (note: TripNote) => {
    triggerHaptic('light');
    const nextPinned = !(note.pinned ?? note.isPinned);
    await updateTripNote(liveTrip.id, note.id, {
      pinned: nextPinned,
      isPinned: nextPinned,
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    triggerHaptic('warning');
    await deleteTripNote(liveTrip.id, noteId);
  };

  const handleCopyNoteContent = async (note: TripNote) => {
    triggerHaptic('success');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(note.content);
      } else {
        const el = document.createElement('textarea');
        el.value = note.content;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId((cur) => (cur === note.id ? null : cur)), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="checklist-notes-tab-root" role="region" aria-label="Collaborative Checklist & Travel Notes">
      {/* Top Segmented Controls */}
      <div className="tab-segmented-header">
        <div className="tab-segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'checklist'}
            className={`tab-segment-btn ${viewMode === 'checklist' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setViewMode('checklist');
            }}
          >
            <IconClipboardList size={18} />
            <span>Checklist</span>
            {totalCount > 0 && (
              <span className="segment-badge">
                {completedCount}/{totalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'notes'}
            className={`tab-segment-btn ${viewMode === 'notes' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setViewMode('notes');
            }}
          >
            <IconPin size={18} />
            <span>Travel Notes</span>
            {notes.length > 0 && <span className="segment-badge">{notes.length}</span>}
          </button>
        </div>
      </div>

      {/* Instant In-Tab Search Bar */}
      {(checklist.length > 0 || notes.length > 0) && (
        <div style={{ marginBottom: '12px' }}>
          <div className="input-icon-wrap" style={{ position: 'relative', width: '100%' }}>
            <IconSearch size={16} className="icon-sm" />
            <input
              type="text"
              className="input-field"
              style={{
                width: '100%',
                paddingLeft: '36px',
                paddingRight: searchQuery ? '36px' : '14px',
                borderRadius: 'var(--border-radius-sm)',
                height: '38px',
                fontSize: '14px',
              }}
              placeholder={viewMode === 'checklist' ? 'Search checklist items or members...' : 'Search travel notes, Wi-Fi, PNRs...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search items"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                title="Clear search"
              >
                <IconClose size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. CHECKLIST VIEW */}
      {viewMode === 'checklist' && (
        <div className="checklist-container">
          {/* Progress Card with Celebratory Burst */}
          {totalCount > 0 && (
            <div
              className={`checklist-progress-card ${progressPercent === 100 ? 'is-complete' : ''}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <ConfettiBurst active={showCelebration} />
              <div className="checklist-progress-header">
                <div>
                  <div className="checklist-progress-title">
                    {progressPercent === 100 ? '✨ 100% Ready!' : 'Packing & Readiness'}
                  </div>
                  <div className="checklist-progress-subtitle">
                    {progressPercent === 100
                      ? `All ${totalCount} items prepared and ready for departure!`
                      : `${completedCount} of ${totalCount} items ready (${progressPercent}%)`}
                  </div>
                </div>
                <div className="checklist-progress-percent">{progressPercent}%</div>
              </div>
              <div className="checklist-progress-bar-track">
                <div
                  className="checklist-progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Category Filter Chips */}
          <div className="checklist-category-scroll" role="group" aria-label="Filter checklist by category">
            {CHECKLIST_CATEGORIES.map((cat) => {
              const count =
                cat.id === 'all'
                  ? checklist.length
                  : checklist.filter((i) => i.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-pill ${checklistFilter === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    triggerHaptic('light');
                    setChecklistFilter(cat.id);
                  }}
                >
                  <span className="category-pill-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && <span className="category-pill-count">{count}</span>}
                </button>
              );
            })}

            {/* Hide Packed / Show All Toggle Chip */}
            {completedCount > 0 && (
              <button
                type="button"
                className={`category-pill ${hideCompleted ? 'active' : ''}`}
                style={{
                  borderColor: hideCompleted ? 'var(--primary-accent)' : undefined,
                  background: hideCompleted ? 'rgba(15, 111, 99, 0.12)' : undefined,
                  color: hideCompleted ? 'var(--primary-accent)' : undefined,
                }}
                onClick={() => {
                  triggerHaptic('light');
                  setHideCompleted(!hideCompleted);
                }}
                aria-pressed={hideCompleted}
                title={hideCompleted ? 'Show all items including packed' : 'Hide packed items to focus on pending tasks'}
              >
                <span className="category-pill-icon">{hideCompleted ? '👁️' : '📦'}</span>
                <span>{hideCompleted ? 'Show All' : `Hide Packed (${completedCount})`}</span>
              </button>
            )}
          </div>

          {/* Quick Add Bar */}
          <form className="checklist-quick-add" onSubmit={handleAddChecklistItem}>
            <div className="quick-add-row">
              <input
                type="text"
                className="quick-add-input"
                placeholder="Add item (e.g. Hiking shoes, Power bank)..."
                value={quickItemText}
                onChange={(e) => setQuickItemText(e.target.value)}
                maxLength={100}
              />
              <button
                type="submit"
                className="quick-add-submit-btn"
                disabled={!quickItemText.trim()}
                aria-label="Add item"
              >
                <IconPlus size={20} />
                <span>Add</span>
              </button>
            </div>
            <div className="quick-add-options">
              <select
                className="quick-add-select"
                value={quickItemCategory}
                onChange={(e) =>
                  setQuickItemCategory(e.target.value as Exclude<ChecklistCategory, 'all'>)
                }
                aria-label="Item category"
              >
                <option value="packing">🎒 Packing</option>
                <option value="documents">📄 Documents</option>
                <option value="medical">💊 Medical</option>
                <option value="general">⚡ General</option>
              </select>

              {members.length > 0 && (
                <select
                  className="quick-add-select"
                  value={quickItemAssignee}
                  onChange={(e) => setQuickItemAssignee(e.target.value)}
                  aria-label="Assign to member"
                >
                  <option value="">👤 Anyone</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </form>

          {/* Subtle gesture hint for discoverability */}
          {filteredChecklist.length > 0 && (
            <div className="checklist-swipe-hint-bar" aria-hidden="true">
              <span className="checklist-swipe-hint-pill">
                <span>↔️</span> Swipe item right to <strong>Edit</strong>, left to <strong>Delete</strong>
              </span>
            </div>
          )}

          {/* Items List */}
          <div className="checklist-items-list" role="list">
            {filteredChecklist.length === 0 ? (
              <div className="checklist-empty-state">
                <div className="empty-state-icon">{searchQuery.trim() ? '🔍' : hideCompleted ? '📦' : '📋'}</div>
                <div className="empty-state-title">
                  {searchQuery.trim()
                    ? 'No matching items'
                    : hideCompleted
                    ? 'All items are packed!'
                    : checklistFilter === 'all'
                    ? 'No checklist items yet'
                    : `No ${checklistFilter} items`}
                </div>
                <div className="empty-state-desc">
                  {searchQuery.trim()
                    ? `No checklist items match "${searchQuery}".`
                    : hideCompleted
                    ? 'Everything in this view is packed. Tap "Show All" above to view completed items.'
                    : 'Keep packing, permits, and travel essentials organized with your group in real-time.'}
                </div>
                {searchQuery.trim() ? (
                  <button
                    type="button"
                    className="seed-defaults-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                ) : hideCompleted ? (
                  <button
                    type="button"
                    className="seed-defaults-btn"
                    onClick={() => setHideCompleted(false)}
                  >
                    Show Packed Items
                  </button>
                ) : checklist.length === 0 ? (
                  <button
                    type="button"
                    className="seed-defaults-btn"
                    onClick={handleSeedDefaults}
                  >
                    ⚡ Pre-fill Travel Essentials
                  </button>
                ) : null}
              </div>
            ) : (
              filteredChecklist.map((item) => {
                const isChecked = item.completed;
                return (
                  <SwipeableRow
                    key={item.id}
                    plain
                    borderRadius="var(--border-radius-sm)"
                    className="checklist-swipe-wrapper"
                    onEdit={() => handleOpenEditChecklistModal(item)}
                    onDelete={() => handleDeleteChecklist(item.id)}
                  >
                    <div
                      className={`checklist-item-card ${isChecked ? 'completed' : ''}`}
                      role="listitem"
                    >
                      <button
                        type="button"
                        className={`checklist-checkbox ${isChecked ? 'checked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleChecklist(item.id);
                        }}
                        aria-label={isChecked ? `Mark ${item.text} as pending` : `Mark ${item.text} as completed`}
                      >
                        {isChecked && <IconCheck size={14} />}
                      </button>

                      <div
                        className="checklist-item-content"
                        onClick={() => handleToggleChecklist(item.id)}
                      >
                        <span className={`checklist-item-text ${isChecked ? 'strikethrough' : ''}`}>
                          {item.text}
                        </span>
                        <div className="checklist-item-meta">
                          <span className={`item-cat-badge cat-${item.category}`}>
                            {item.category === 'packing' && '🎒 Packing'}
                            {item.category === 'documents' && '📄 Documents'}
                            {item.category === 'medical' && '💊 Medical'}
                            {item.category === 'general' && '⚡ General'}
                          </span>
                          {item.assignedTo && (
                            <span className="item-assignee-badge">
                              👤 {item.assignedTo}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="checklist-item-actions">
                        <button
                          type="button"
                          className="checklist-action-btn edit-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditChecklistModal(item);
                          }}
                          aria-label={`Edit ${item.text}`}
                          title="Edit item"
                        >
                          <IconEdit size={16} />
                        </button>
                        <button
                          type="button"
                          className="checklist-action-btn delete-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChecklist(item.id);
                          }}
                          aria-label={`Delete ${item.text}`}
                          title="Delete item"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  </SwipeableRow>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. NOTES VIEW */}
      {viewMode === 'notes' && (
        <div className="notes-container">
          {/* Header Action Bar */}
          <div className="notes-action-bar">
            <div className="notes-category-scroll">
              {NOTE_CATEGORIES.map((cat) => {
                const count =
                  cat.id === 'all'
                    ? notes.length
                    : notes.filter((n) => n.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-pill ${noteFilter === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      triggerHaptic('light');
                      setNoteFilter(cat.id);
                    }}
                  >
                    <span className="category-pill-icon">{cat.icon}</span>
                    <span>{cat.label}</span>
                    {count > 0 && <span className="category-pill-count">{count}</span>}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="add-note-primary-btn"
              onClick={handleOpenNewNoteModal}
            >
              <IconPlus size={18} />
              <span>New Note</span>
            </button>
          </div>

          {/* Subtle gesture hint for discoverability */}
          {filteredNotes.length > 0 && (
            <div className="notes-swipe-hint-bar" aria-hidden="true">
              <span className="notes-swipe-hint-pill">
                <span>↔️</span> Swipe note right to <strong>Edit</strong>, left to <strong>Delete</strong>
              </span>
            </div>
          )}

          {/* Notes Grid */}
          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <div className="checklist-empty-state">
                <div className="empty-state-icon">{searchQuery.trim() ? '🔍' : '📌'}</div>
                <div className="empty-state-title">
                  {searchQuery.trim()
                    ? 'No matching notes'
                    : noteFilter === 'all'
                    ? 'No travel notes yet'
                    : `No ${noteFilter} notes`}
                </div>
                <div className="empty-state-desc">
                  {searchQuery.trim()
                    ? `No travel notes match "${searchQuery}".`
                    : 'Store hotel Wi-Fi passwords, booking PNRs, cab driver contacts, and gate access codes for everyone on the trip.'}
                </div>
                {searchQuery.trim() ? (
                  <button
                    type="button"
                    className="seed-defaults-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    className="seed-defaults-btn"
                    onClick={handleOpenNewNoteModal}
                  >
                    <IconPlus size={16} /> Add First Note
                  </button>
                )}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isCopied = copiedNoteId === note.id;
                const isPinned = Boolean(note.pinned ?? note.isPinned);
                return (
                  <SwipeableRow
                    key={note.id}
                    plain
                    borderRadius="var(--border-radius-md)"
                    className="note-swipe-wrapper"
                    onEdit={() => handleOpenEditNoteModal(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                  >
                    <div
                      className={`trip-note-card ${isPinned ? 'is-pinned' : ''}`}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button, a, input, textarea, select')) {
                          handleOpenEditNoteModal(note);
                        }
                      }}
                      title="Swipe right to edit, left to delete · Tap to edit"
                    >
                      <div className="note-card-header">
                        <div className="note-card-title-group">
                          <span className="note-category-tag">
                            {note.category === 'wifi' && '📶 Wi-Fi'}
                            {note.category === 'stay' && '🏨 Stay'}
                            {note.category === 'transport' && '✈️ Transport'}
                            {note.category === 'contact' && '📞 Contact'}
                            {note.category === 'general' && '💡 Note'}
                          </span>
                          {isPinned && (
                            <span className="note-pinned-pill" title="Pinned to top">
                              <IconPin size={12} /> Pinned
                            </span>
                          )}
                        </div>

                        <div className="note-card-actions">
                          <button
                            type="button"
                            className={`note-icon-action-btn ${isPinned ? 'active-pin' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePinNote(note);
                            }}
                            title={isPinned ? 'Unpin note' : 'Pin note to top'}
                            aria-label={isPinned ? 'Unpin note' : 'Pin note'}
                          >
                            <IconPin size={16} />
                          </button>
                          <button
                            type="button"
                            className="note-icon-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditNoteModal(note);
                            }}
                            title="Edit note"
                            aria-label="Edit note"
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            type="button"
                            className="note-icon-action-btn delete-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            title="Delete note"
                            aria-label="Delete note"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>

                      <h4 className="note-title">{note.title}</h4>

                      <div className="note-content-box">
                        <pre className="note-content-text">{note.content}</pre>
                      </div>

                      <div className="note-card-footer">
                        <button
                          type="button"
                          className={`note-copy-btn ${isCopied ? 'copied' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyNoteContent(note);
                          }}
                        >
                          {isCopied ? (
                            <>
                              <IconCheck size={14} />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <IconCopy size={14} />
                              <span>Copy Info</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </SwipeableRow>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Note Edit / Create Modal */}
      {isNoteModalOpen && (
        <div className="note-modal-backdrop" onClick={() => setIsNoteModalOpen(false)}>
          <div
            className="note-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-modal-title"
          >
            <div className="note-modal-header">
              <div className="note-modal-header-left">
                <span className="note-modal-eyebrow">
                  {editingNoteId ? 'EDIT TRAVEL NOTE' : 'NEW TRAVEL NOTE'}
                </span>
                <h3 id="note-modal-title" className="note-modal-title">
                  {editingNoteId ? 'Update Trip Details' : 'Add Info for Group'}
                </h3>
              </div>
              <button
                type="button"
                className="note-modal-close-btn"
                onClick={() => setIsNoteModalOpen(false)}
                aria-label="Close dialog"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="note-modal-form">
              {/* Category Chips Selector */}
              <div className="note-modal-field">
                <label className="note-modal-label">Category</label>
                <div className="note-category-picker" role="radiogroup" aria-label="Note Category">
                  {[
                    { id: 'wifi', icon: '📶', label: 'Wi-Fi & Codes' },
                    { id: 'stay', icon: '🏨', label: 'Hotel & Stay' },
                    { id: 'transport', icon: '✈️', label: 'Tickets / PNR' },
                    { id: 'contact', icon: '📞', label: 'Contacts' },
                    { id: 'general', icon: '💡', label: 'General' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={noteCategory === cat.id}
                      className={`note-cat-chip ${noteCategory === cat.id ? 'active' : ''}`}
                      onClick={() => {
                        triggerHaptic('light');
                        setNoteCategory(cat.id as any);
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="note-modal-field">
                <label htmlFor="note-title-input" className="note-modal-label">Title</label>
                <input
                  id="note-title-input"
                  type="text"
                  className="note-modal-input"
                  placeholder="e.g. Resort Wi-Fi & Password, Indigo PNR, Cab Driver..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                  maxLength={80}
                  autoFocus
                />
              </div>

              {/* Pin Toggle Card */}
              <div
                className="note-pin-toggle-card"
                onClick={() => {
                  triggerHaptic('light');
                  setNoteIsPinned(!noteIsPinned);
                }}
                role="checkbox"
                aria-checked={noteIsPinned}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    triggerHaptic('light');
                    setNoteIsPinned(!noteIsPinned);
                  }
                }}
              >
                <div className="note-pin-toggle-info">
                  <span className="note-pin-icon"><IconPin size={16} /></span>
                  <div>
                    <div className="note-pin-title">Pin note to top</div>
                    <div className="note-pin-desc">Highlights this note at the top of the list for quick access</div>
                  </div>
                </div>
                <div className={`note-custom-toggle ${noteIsPinned ? 'active' : ''}`}>
                  <div className="note-custom-toggle-thumb" />
                </div>
              </div>

              {/* Content / Key Details Textarea */}
              <div className="note-modal-field">
                <div className="note-modal-field-header">
                  <label htmlFor="note-content-input" className="note-modal-label">Content / Key Details</label>
                  <span className="note-modal-char-hint">Instant 1-tap copy for members</span>
                </div>
                <textarea
                  id="note-content-input"
                  className="note-modal-textarea"
                  rows={5}
                  placeholder="Paste Wi-Fi password, PNR codes, room numbers, driver phone number..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="note-modal-actions">
                <button
                  type="button"
                  className="note-modal-cancel-btn"
                  onClick={() => setIsNoteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="note-modal-submit-btn"
                  disabled={!noteTitle.trim() || !noteContent.trim()}
                >
                  {editingNoteId ? 'Save Changes' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Item Edit Modal */}
      {isChecklistModalOpen && editingChecklistItem && (
        <div className="note-modal-backdrop" onClick={() => setIsChecklistModalOpen(false)}>
          <div
            className="note-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checklist-modal-title"
          >
            <div className="note-modal-header">
              <div className="note-modal-header-left">
                <span className="note-modal-eyebrow">EDIT CHECKLIST ITEM</span>
                <h3 id="checklist-modal-title" className="note-modal-title">
                  Update Task or Item
                </h3>
              </div>
              <button
                type="button"
                className="note-modal-close-btn"
                onClick={() => setIsChecklistModalOpen(false)}
                aria-label="Close dialog"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChecklistItem} className="note-modal-form">
              {/* Category Chips Selector */}
              <div className="note-modal-field">
                <label className="note-modal-label">Category</label>
                <div className="note-category-picker" role="radiogroup" aria-label="Item Category">
                  {[
                    { id: 'packing', icon: '🎒', label: 'Packing' },
                    { id: 'documents', icon: '📄', label: 'Documents' },
                    { id: 'medical', icon: '💊', label: 'Medical' },
                    { id: 'general', icon: '⚡', label: 'General' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={editItemCategory === cat.id}
                      className={`note-cat-chip ${editItemCategory === cat.id ? 'active' : ''}`}
                      onClick={() => {
                        triggerHaptic('light');
                        setEditItemCategory(cat.id as any);
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Description Input */}
              <div className="note-modal-field">
                <label htmlFor="checklist-item-text-input" className="note-modal-label">
                  Item Description
                </label>
                <input
                  id="checklist-item-text-input"
                  type="text"
                  className="note-modal-input"
                  placeholder="e.g. Passports, Trekking shoes, Power bank..."
                  value={editItemText}
                  onChange={(e) => setEditItemText(e.target.value)}
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>

              {/* Assignee Selector */}
              {members.length > 0 && (
                <div className="note-modal-field">
                  <label htmlFor="checklist-assignee-select" className="note-modal-label">
                    Assign to Member
                  </label>
                  <select
                    id="checklist-assignee-select"
                    className="quick-add-select"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '0.92rem' }}
                    value={editItemAssignee}
                    onChange={(e) => setEditItemAssignee(e.target.value)}
                  >
                    <option value="">👤 Anyone (Unassigned)</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Completed Status Checkbox */}
              <div
                className="note-pin-toggle-card"
                onClick={() => {
                  triggerHaptic('light');
                  setEditItemCompleted(!editItemCompleted);
                }}
                role="checkbox"
                aria-checked={editItemCompleted}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    triggerHaptic('light');
                    setEditItemCompleted(!editItemCompleted);
                  }
                }}
              >
                <div className="note-pin-toggle-info">
                  <span className="note-pin-icon" style={{ color: editItemCompleted ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    <IconCheck size={16} />
                  </span>
                  <div>
                    <div className="note-pin-title">Mark as ready / packed</div>
                    <div className="note-pin-desc">
                      {editItemCompleted ? 'Item marked complete' : 'Item is still pending'}
                    </div>
                  </div>
                </div>
                <div className={`note-custom-toggle ${editItemCompleted ? 'active' : ''}`}>
                  <div className="note-custom-toggle-thumb" />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="note-modal-actions">
                <button
                  type="button"
                  className="note-modal-cancel-btn"
                  onClick={() => setIsChecklistModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="note-modal-submit-btn"
                  disabled={!editItemText.trim()}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
