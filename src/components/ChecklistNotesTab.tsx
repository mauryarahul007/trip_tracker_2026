import React, { useState, useMemo, useEffect } from 'react';
import { useTripStore } from '../store/tripStore';
import type { Trip, Member, TripNote, ChecklistItem } from '../types';
import { getDestinationWeatherRealtime, type WeatherData } from '../services/weatherService';
import {
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
import { SmartPackingAssistantModal } from './SmartPackingAssistantModal';
import { TravelPassWalletView } from './TravelPassWalletView';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';

type Props = {
  trip: Trip;
  members: Member[];
  isAdmin?: boolean;
};

type ViewMode = 'passes' | 'notes' | 'checklist';
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

interface NoteSection {
  title: string;
  badge: string;
  badgeColor: string;
  quote?: string;
  items: { icon?: string; text: string; note?: string }[];
}

function parseFormattedNote(raw: string): {
  meta: string[];
  sections: NoteSection[];
  isStructured: boolean;
} {
  const lines = raw.split('\n');
  const meta: string[] = [];
  const sections: NoteSection[] = [];
  let currentSection: NoteSection | null = null;
  let hasStructuredContent = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '---') continue;

    if (line.startsWith('📍') || line.startsWith('📅') || line.startsWith('⛅')) {
      hasStructuredContent = true;
      meta.push(line.replace(/\*\*/g, ''));
      continue;
    }

    if (line.startsWith('###')) {
      hasStructuredContent = true;
      const title = line.replace(/^###\s*/, '').trim();
      let badgeColor = 'var(--primary-accent)';
      let badge = 'Bag';
      if (title.toLowerCase().includes('carry-on') || title.toLowerCase().includes('cabin')) {
        badgeColor = '#0284c7';
        badge = '✈️ Cabin';
      } else if (title.toLowerCase().includes('checked')) {
        badgeColor = '#d97706';
        badge = '🧳 Hold';
      } else if (title.toLowerCase().includes('flexible') || title.toLowerCase().includes('any')) {
        badgeColor = 'var(--primary-accent)';
        badge = '🎒 Flexible';
      }

      currentSection = {
        title,
        badge,
        badgeColor,
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (line.startsWith('>')) {
      hasStructuredContent = true;
      if (currentSection) {
        currentSection.quote = line.replace(/^>\s*\*?/, '').replace(/\*$/, '').trim();
      }
      continue;
    }

    if (line.startsWith('- [ ]') || line.startsWith('- [x]') || line.startsWith('•') || line.startsWith('- ')) {
      hasStructuredContent = true;
      let text = line.replace(/^-\s*\[[ x]\]\s*/, '').replace(/^[•\-]\s*/, '').trim();
      let icon = '📦';
      let note: string | undefined;

      const iconMatch = text.match(/^([\p{Emoji}\u200d\uFE0F]+)\s*(.*)/u);
      if (iconMatch) {
        icon = iconMatch[1];
        text = iconMatch[2];
      }

      const noteMatch = text.match(/^(.*?)_\((.*?)\)_$/);
      if (noteMatch) {
        text = noteMatch[1].trim();
        note = noteMatch[2].trim();
      }

      text = text.replace(/\*\*/g, '').trim();

      if (!currentSection) {
        currentSection = {
          title: 'Items',
          badge: 'List',
          badgeColor: 'var(--primary-accent)',
          items: [],
        };
        sections.push(currentSection);
      }
      currentSection.items.push({ icon, text, note });
      continue;
    }

    if (currentSection && currentSection.items.length === 0 && !currentSection.quote) {
      currentSection.quote = line;
    }
  }

  return { meta, sections, isStructured: hasStructuredContent && sections.length > 0 };
}

function StandardNoteRenderer({ content, category }: { content: string; category?: string }) {
  const lines = content.split('\n');
  const isKeyValue = lines.some((l) =>
    /^(ssid|wi-?fi|network|password|pass|pnr|code|booking|phone|cab|contact)\s*[:=]/i.test(l.trim())
  );

  if (isKeyValue || category === 'wifi') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {lines.map((rawLine, idx) => {
          const line = rawLine.trim();
          if (!line) return null;
          const match = line.match(/^([^:=]+)[:=]\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            const val = match[2].trim();
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.03)',
                  fontSize: '11.5px',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px' }}>
                  {key}:
                </span>
                <code
                  style={{
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '11.5px',
                  }}
                >
                  {val}
                </code>
              </div>
            );
          }
          return (
            <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {line}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'inherit',
        fontSize: '12px',
        color: 'var(--text-primary)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content}
    </div>
  );
}

function NoteContentView({ content, category }: { content: string; category?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const parsed = useMemo(() => parseFormattedNote(content), [content]);

  if (parsed.isStructured) {
    const totalItems = parsed.sections.reduce((acc, s) => acc + s.items.length, 0);
    const shouldTruncate = totalItems > 6 && !isExpanded;
    let itemsShown = 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {parsed.meta.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {parsed.meta.map((m, idx) => (
              <span
                key={idx}
                style={{
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'rgba(20, 184, 166, 0.08)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '10.5px',
                }}
              >
                {m}
              </span>
            ))}
          </div>
        )}

        {parsed.sections.map((section, sIdx) => {
          if (shouldTruncate && itemsShown >= 6) return null;

          const visibleItems = shouldTruncate
            ? section.items.slice(0, Math.max(0, 6 - itemsShown))
            : section.items;

          itemsShown += visibleItems.length;

          return (
            <div
              key={sIdx}
              style={{
                borderRadius: '8px',
                border: `1px solid ${section.badgeColor}33`,
                background: `${section.badgeColor}08`,
                padding: '7px 9px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {section.title}
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: `${section.badgeColor}22`,
                    color: section.badgeColor,
                  }}
                >
                  {section.badge} ({section.items.length})
                </span>
              </div>

              {section.quote && (
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.03)',
                    lineHeight: 1.3,
                  }}
                >
                  💡 {section.quote}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {visibleItems.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '5px',
                      fontSize: '11.5px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.35,
                    }}
                  >
                    <span style={{ fontSize: '12px' }}>{item.icon || '•'}</span>
                    <span style={{ fontWeight: 600 }}>{item.text}</span>
                    {item.note && (
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                        — {item.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {totalItems > 6 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            style={{
              alignSelf: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-accent)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '2px 8px',
              marginTop: '2px',
            }}
          >
            {isExpanded ? '▴ Show Less' : `▾ View All ${totalItems} Items`}
          </button>
        )}
      </div>
    );
  }

  return <StandardNoteRenderer content={content} category={category} />;
}

export function ChecklistNotesTab({ trip, members, isAdmin }: Props) {
  // Always select live trip from store to react to changes
  const liveTrip = useTripStore((s) => s.trips.find((t) => t.id === trip.id)) || trip;
  const {
    addChecklistItem,
    batchAddChecklistItems,
    toggleChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    addTripNote,
    updateTripNote,
    deleteTripNote,
    saveTravelPass,
    deleteTravelPass,
  } = useTripStore();
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const isPassesEnabled = isFeatureEnabled('enableTravelPasses', { tripId: liveTrip.id });
  const isNotesEnabled = isFeatureEnabled('enableNotesAndChecklist', { tripId: liveTrip.id });
  const isPackingEnabled = isFeatureEnabled('enablePackingAssistant', { tripId: liveTrip.id });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (isPassesEnabled && liveTrip.passes && liveTrip.passes.length > 0) return 'passes';
    if (isNotesEnabled) return 'checklist';
    if (isPassesEnabled) return 'passes';
    return 'checklist';
  });

  useEffect(() => {
    if (!isPassesEnabled && viewMode === 'passes') {
      setViewMode(isNotesEnabled ? 'checklist' : 'notes');
    } else if (!isNotesEnabled && (viewMode === 'notes' || viewMode === 'checklist')) {
      if (isPassesEnabled) setViewMode('passes');
    }
  }, [isPassesEnabled, isNotesEnabled, viewMode]);

  const [checklistFilter, setChecklistFilter] = useState<ChecklistCategory>('all');
  const [noteFilter, setNoteFilter] = useState<NoteCategory>('all');
  const [isPackingAssistantOpen, setIsPackingAssistantOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const destQuery = liveTrip.destination || liveTrip.name;
    if (destQuery && isPackingEnabled) {
      getDestinationWeatherRealtime(destQuery, (fresh) => {
        if (isMounted) setWeather(fresh);
      }).then((cached) => {
        if (isMounted && cached) setWeather(cached);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [liveTrip.destination, liveTrip.name, isPackingEnabled]);

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

  // Drag-to-reorder state
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Safely close modals on Android/browser Back or Escape
  useHistoryBack(isChecklistModalOpen, () => {
    setIsChecklistModalOpen(false);
    setEditingChecklistItem(null);
  });
  useEscapeKey(isChecklistModalOpen, () => {
    setIsChecklistModalOpen(false);
    setEditingChecklistItem(null);
  });

  useHistoryBack(isNoteModalOpen, () => {
    setIsNoteModalOpen(false);
    setEditingNoteId(null);
  });
  useEscapeKey(isNoteModalOpen, () => {
    setIsNoteModalOpen(false);
    setEditingNoteId(null);
  });

  const passes = liveTrip.passes || [];
  const checklist = liveTrip.checklist || [];
  const notes = liveTrip.notes || [];

  const completedCount = checklist.filter((i) => i.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleDragStart = (id: string) => {
    setDragItemId(id);
    triggerHaptic('light');
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== dragItemId) setDragOverItemId(id);
  };

  const handleDrop = (targetId: string) => {
    if (!dragItemId || dragItemId === targetId) {
      setDragItemId(null);
      setDragOverItemId(null);
      return;
    }
    const currentList = liveTrip.checklist || [];
    const fromIdx = currentList.findIndex((i) => i.id === dragItemId);
    const toIdx = currentList.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...currentList];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderChecklistItems(liveTrip.id, reordered);
    triggerHaptic('medium');
    setDragItemId(null);
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDragItemId(null);
    setDragOverItemId(null);
  };

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
    <div className="checklist-notes-tab-root" role="region" aria-label="Collaborative Checklist, Travel Passes & Notes">
      {/* Top Segmented Controls */}
      {isPassesEnabled && isNotesEnabled && (
        <div className="tab-segmented-header">
          <div className="tab-segmented-control" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'passes'}
              className={`tab-segment-btn ${viewMode === 'passes' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setViewMode('passes');
              }}
              aria-label={`Passes, ${passes.length}`}
            >
              <span className="segment-label">Passes</span>
              <span className="segment-badge">{passes.length}</span>
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
              aria-label={`Notes, ${notes.length}`}
            >
              <span className="segment-label">Notes</span>
              <span className="segment-badge">{notes.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'checklist'}
              className={`tab-segment-btn ${viewMode === 'checklist' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setViewMode('checklist');
              }}
              aria-label={`Checklist, ${completedCount} of ${totalCount} complete`}
            >
              <span className="segment-label">Checklist</span>
              <span className="segment-badge">
                {totalCount > 0 ? `${completedCount}/${totalCount}` : '0'}
              </span>
            </button>
          </div>
        </div>
      )}

      {!isPassesEnabled && isNotesEnabled && (
        <div className="tab-segmented-header">
          <div className="tab-segmented-control" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'notes'}
              className={`tab-segment-btn ${viewMode === 'notes' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setViewMode('notes');
              }}
              aria-label={`Notes, ${notes.length}`}
            >
              <span className="segment-label">Notes</span>
              <span className="segment-badge">{notes.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'checklist'}
              className={`tab-segment-btn ${viewMode === 'checklist' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setViewMode('checklist');
              }}
              aria-label={`Checklist, ${completedCount} of ${totalCount} complete`}
            >
              <span className="segment-label">Checklist</span>
              <span className="segment-badge">
                {totalCount > 0 ? `${completedCount}/${totalCount}` : '0'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 0. TRAVEL PASSES & TICKET WALLET VIEW */}
      {viewMode === 'passes' && isPassesEnabled && (
        <TravelPassWalletView
          trip={liveTrip}
          members={members}
          onSavePass={async (pass) => {
            await saveTravelPass(liveTrip.id, pass);
          }}
          onDeletePass={async (passId) => {
            await deleteTravelPass(liveTrip.id, passId);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* Instant In-Tab Search Bar (for Checklist & Notes) */}
      {viewMode !== 'passes' && isNotesEnabled && (checklist.length > 0 || notes.length > 0) && (
        <div style={{ marginBottom: '12px' }}>
          <div className="input-icon-wrap" style={{ position: 'relative', width: '100%' }}>
            <IconSearch
              size={16}
              className="icon-sm"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
            <input
              type="text"
              className="input-field"
              style={{
                width: '100%',
                boxSizing: 'border-box',
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
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  zIndex: 2,
                }}
              >
                <IconClose size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. CHECKLIST VIEW */}
      {viewMode === 'checklist' && isNotesEnabled && (
        <div className="checklist-container">
          {/* Smart Assistant Ambient Suggestion Card when checklist is empty */}
          {totalCount === 0 && isPackingEnabled && (
            <div
              className="glass-card"
              style={{
                marginBottom: '14px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08), rgba(14, 165, 233, 0.08))',
                border: '1px solid rgba(20, 184, 166, 0.25)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>✈️</span>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Packing for {liveTrip.destination || liveTrip.name}?
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {weather
                      ? `${weather.weatherEmoji} ${weather.tempC}°C ${weather.condition} • Aviation security compliant`
                      : 'Tailored for travel dates, seasonal weather & flight rules'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="gradient-btn"
                style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}
                onClick={() => {
                  triggerHaptic('light');
                  setIsPackingAssistantOpen(true);
                }}
              >
                ✨ Smart Assistant
              </button>
            </div>
          )}

          {/* Sleek Progress Indicator with Celebratory Burst */}
          {totalCount > 0 && (
            <div className="checklist-sleek-progress-bar" style={{ marginBottom: '14px', position: 'relative' }}>
              <ConfettiBurst active={showCelebration} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {progressPercent === 100 ? '✨ 100% Packed & Ready!' : 'Packing Readiness'}
                </span>
                <span style={{ fontWeight: 700, color: progressPercent === 100 ? 'var(--color-success)' : 'var(--primary-accent)' }}>
                  {completedCount} of {totalCount} ready ({progressPercent}%)
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  borderRadius: '999px',
                  background: 'var(--bg-card-subtle, rgba(0,0,0,0.06))',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background:
                      progressPercent === 100
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, var(--primary-accent), #2dd4bf)',
                    borderRadius: '999px',
                    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Category Filter Chips & Smart Assistant Action */}
          <div className="checklist-category-scroll" role="group" aria-label="Filter checklist by category">
            {isPackingEnabled && (
              <button
                type="button"
                className="category-pill smart-assistant-pill"
                onClick={() => {
                  triggerHaptic('light');
                  setIsPackingAssistantOpen(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(15, 111, 99, 0.22))',
                  border: '1px solid rgba(20, 184, 166, 0.35)',
                  color: 'var(--primary-accent)',
                  fontWeight: 600,
                }}
                title="Auto-generate checklist items based on destination & weather"
              >
                <span className="category-pill-icon">✨</span>
                <span>Smart Assistant</span>
              </button>
            )}
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {isPackingEnabled && (
                      <button
                        type="button"
                        className="gradient-btn"
                        style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 700 }}
                        onClick={() => {
                          triggerHaptic('light');
                          setIsPackingAssistantOpen(true);
                        }}
                      >
                        ✨ Smart Flight Assistant
                      </button>
                    )}
                    <button
                      type="button"
                      className="seed-defaults-btn"
                      onClick={handleSeedDefaults}
                    >
                      ⚡ Pre-fill Travel Essentials
                    </button>
                  </div>
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
                      className={`checklist-item-card ${isChecked ? 'completed' : ''} ${dragOverItemId === item.id ? 'drag-over' : ''}`}
                      role="listitem"
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDrop={() => handleDrop(item.id)}
                      onDragEnd={handleDragEnd}
                      style={{ opacity: dragItemId === item.id ? 0.4 : 1, cursor: 'grab' }}
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
      {viewMode === 'notes' && isNotesEnabled && (
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
                        <NoteContentView content={note.content} category={note.category} />
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

      {/* Smart Packing Assistant Modal */}
      <SmartPackingAssistantModal
        isOpen={isPackingAssistantOpen}
        onClose={() => setIsPackingAssistantOpen(false)}
        trip={liveTrip}
        members={members}
        weatherCondition={weather?.condition}
        avgTemp={weather?.tempC}
        onBatchAddChecklist={async (items) => {
          await batchAddChecklistItems(liveTrip.id, items);
        }}
        onSaveAsNote={async (noteData) => {
          await addTripNote(liveTrip.id, {
            title: noteData.title,
            content: noteData.content,
            category: noteData.category,
            isPinned: true,
          });
        }}
      />
      {!isNotesEnabled && !isPassesEnabled && (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Notes &amp; Passes Currently Inactive
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto' }}>
            Collaborative notes, checklists, and travel pass wallet features are safed or inactive in this release phase.
          </div>
        </div>
      )}
    </div>
  );
}
