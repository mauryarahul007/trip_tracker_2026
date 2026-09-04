import React, { useState, useMemo } from 'react';
import { useTripStore } from '../store/tripStore';
import type { Trip, Member, TripNote } from '../types';
import {
  IconClipboardList,
  IconPin,
  IconCopy,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconClose,
} from './Icons';
import { triggerHaptic } from '../utils/haptics';

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
    // Sort uncompleted items first, then completed items
    return [...list].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  }, [checklist, checklistFilter]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    let list = notes;
    if (noteFilter !== 'all') {
      list = list.filter((item) => item.category === noteFilter);
    }
    // Pinned notes first, then latest updated
    return [...list].sort((a, b) => {
      const pinA = Boolean(a.pinned ?? a.isPinned);
      const pinB = Boolean(b.pinned ?? b.isPinned);
      if (pinA !== pinB) return pinA ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [notes, noteFilter]);

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
    triggerHaptic('light');
    await toggleChecklistItem(liveTrip.id, itemId);
  };

  const handleDeleteChecklist = async (itemId: string) => {
    triggerHaptic('warning');
    await deleteChecklistItem(liveTrip.id, itemId);
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

      {/* 1. CHECKLIST VIEW */}
      {viewMode === 'checklist' && (
        <div className="checklist-container">
          {/* Progress Card */}
          {totalCount > 0 && (
            <div className="checklist-progress-card">
              <div className="checklist-progress-header">
                <div>
                  <div className="checklist-progress-title">Packing & Readiness</div>
                  <div className="checklist-progress-subtitle">
                    {completedCount} of {totalCount} items ready ({progressPercent}%)
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

          {/* Items List */}
          <div className="checklist-items-list" role="list">
            {filteredChecklist.length === 0 ? (
              <div className="checklist-empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">
                  {checklistFilter === 'all' ? 'No checklist items yet' : `No ${checklistFilter} items`}
                </div>
                <div className="empty-state-desc">
                  Keep packing, permits, and travel essentials organized with your group in real-time.
                </div>
                {checklist.length === 0 && (
                  <button
                    type="button"
                    className="seed-defaults-btn"
                    onClick={handleSeedDefaults}
                  >
                    ⚡ Pre-fill Travel Essentials
                  </button>
                )}
              </div>
            ) : (
              filteredChecklist.map((item) => {
                const isChecked = item.completed;
                return (
                  <div
                    key={item.id}
                    className={`checklist-item-card ${isChecked ? 'completed' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className={`checklist-checkbox ${isChecked ? 'checked' : ''}`}
                      onClick={() => handleToggleChecklist(item.id)}
                      aria-label={isChecked ? `Mark ${item.text} as pending` : `Mark ${item.text} as completed`}
                    >
                      {isChecked && <IconCheck size={14} />}
                    </button>

                    <div className="checklist-item-content" onClick={() => handleToggleChecklist(item.id)}>
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

                    <button
                      type="button"
                      className="checklist-delete-btn"
                      onClick={() => handleDeleteChecklist(item.id)}
                      aria-label={`Delete ${item.text}`}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
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

          {/* Notes Grid */}
          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <div className="checklist-empty-state">
                <div className="empty-state-icon">📌</div>
                <div className="empty-state-title">
                  {noteFilter === 'all' ? 'No travel notes yet' : `No ${noteFilter} notes`}
                </div>
                <div className="empty-state-desc">
                  Store hotel Wi-Fi passwords, booking PNRs, cab driver contacts, and gate access codes for everyone on the trip.
                </div>
                <button
                  type="button"
                  className="seed-defaults-btn"
                  onClick={handleOpenNewNoteModal}
                >
                  <IconPlus size={16} /> Add First Note
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isCopied = copiedNoteId === note.id;
                const isPinned = Boolean(note.pinned ?? note.isPinned);
                return (
                  <div
                    key={note.id}
                    className={`trip-note-card ${isPinned ? 'is-pinned' : ''}`}
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
                          onClick={() => handleTogglePinNote(note)}
                          title={isPinned ? 'Unpin note' : 'Pin note to top'}
                          aria-label={isPinned ? 'Unpin note' : 'Pin note'}
                        >
                          <IconPin size={16} />
                        </button>
                        <button
                          type="button"
                          className="note-icon-action-btn"
                          onClick={() => handleOpenEditNoteModal(note)}
                          title="Edit note"
                          aria-label="Edit note"
                        >
                          <IconEdit size={16} />
                        </button>
                        <button
                          type="button"
                          className="note-icon-action-btn delete-action"
                          onClick={() => handleDeleteNote(note.id)}
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
                        onClick={() => handleCopyNoteContent(note)}
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
    </div>
  );
}
