import React, { useState, useEffect, useRef } from 'react';
import type { Trip, Expense, Member, Category } from '../types';
import { IconSearch, IconPlus, IconMembers, IconSettings, IconCheck, IconCalendar, IconMapPin } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip;
  trips?: Trip[];
  expenses: Expense[];
  members: Member[];
  categories: Category[];
  onSelectExpense: (expense: Expense) => void;
  onSelectMember: (memberId: string) => void;
  onSelectTrip?: (tripId: string) => void;
  onNewExpense: () => void;
  onCreateTrip?: () => void;
  onOpenWrapped: () => void;
  onOpenSettings: () => void;
  onSwitchTab: (tab: 'expenses' | 'balances' | 'settings' | 'members') => void;
  smartSuggestions?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
  }>;
}

export function CommandPalette({
  isOpen,
  onClose,
  trip,
  trips = [],
  expenses,
  members,
  categories,
  onSelectExpense,
  onSelectMember,
  onSelectTrip,
  onNewExpense,
  onCreateTrip,
  onOpenWrapped,
  onOpenSettings,
  onSwitchTab,
  smartSuggestions = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  useFocusTrap(cardRef, isOpen, false, onClose);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Build searchable items
  interface CommandItem {
    id: string;
    type: 'action' | 'expense' | 'member' | 'tab' | 'trip';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
  }

  const items: CommandItem[] = [];

  // Create Trip Action
  if (onCreateTrip) {
    items.push({
      id: 'act-new-trip',
      type: 'action',
      title: 'Create New Trip',
      subtitle: 'Start a new trip ledger or expedition',
      icon: <IconPlus size={16} />,
      action: () => {
        onCreateTrip();
        onClose();
      },
    });
  }

  // Matching Trips
  if (trips.length > 0) {
    trips.forEach((t) => {
      const isCurrent = trip?.id === t.id;
      items.push({
        id: `trip-${t.id}`,
        type: 'trip',
        title: t.name,
        subtitle: `${t.destination || 'Expedition'} · ${t.baseCurrency}${isCurrent ? ' (Active)' : ''}`,
        icon: <IconMapPin size={16} />,
        action: () => {
          if (onSelectTrip) onSelectTrip(t.id);
          onClose();
        },
      });
    });
  }

  // Actions
  items.push({
    id: 'act-new-exp',
    type: 'action',
    title: trip ? `Add New Expense in ${trip.name}` : 'Add New Expense',
    subtitle: 'Create a new receipt or shared payment',
    icon: <IconPlus size={16} />,
    action: () => {
      onNewExpense();
      onClose();
    },
  });

  if (trip) {
    items.push({
      id: 'act-wrapped',
      type: 'action',
      title: 'View Trip Wrapped ✨',
      subtitle: 'Generate infographic story card',
      icon: <IconCheck size={16} />,
      action: () => {
        onOpenWrapped();
        onClose();
      },
    });

    items.push({
      id: 'tab-balances',
      type: 'tab',
      title: 'View Balances & Settlements',
      subtitle: 'Who owes who calculation',
      icon: <IconCheck size={16} />,
      action: () => {
        onSwitchTab('balances');
        onClose();
      },
    });

    items.push({
      id: 'tab-analytics',
      type: 'tab',
      title: 'View Spending Analytics',
      subtitle: 'Category graphs & trends — in Settings',
      icon: <IconCheck size={16} />,
      action: () => {
        onSwitchTab('settings');
        onClose();
      },
    });

    items.push({
      id: 'act-settings',
      type: 'action',
      title: 'Trip Settings & Backup',
      subtitle: 'Manage trip details, currencies, and exports',
      icon: <IconSettings size={16} />,
      action: () => {
        onOpenSettings();
        onClose();
      },
    });
  }

  // Filter Members
  members.forEach((m) => {
    items.push({
      id: `member-${m.id}`,
      type: 'member',
      title: m.name,
      subtitle: 'Member expenses',
      icon: <IconMembers size={16} />,
      action: () => {
        onSelectMember(m.id);
        onClose();
      },
    });
  });

  // Filter Expenses
  expenses.slice(0, 50).forEach((e) => {
    const catName = categories.find((c) => c.id === e.category)?.name || 'General';
    items.push({
      id: `exp-${e.id}`,
      type: 'expense',
      title: e.title,
      subtitle: `${currencySymbol}${e.amount} · ${catName} · ${e.date}`,
      icon: <IconCalendar size={16} />,
      action: () => {
        onSelectExpense(e);
        onClose();
      },
    });
  });

  // Filter by query
  const filteredItems = items.filter((item) => {
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }).slice(0, 15);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        triggerHaptic('light');
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const selectedItemId = filteredItems[selectedIndex]?.id;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 'max(80px, 15vh)' }}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Command and Search Palette"
        className="modal-card fade-in"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}>
          <IconSearch size={18} style={{ color: 'var(--primary-accent)', flexShrink: 0 }} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-activedescendant={selectedItemId}
            aria-label="Search commands, expenses, or members"
            className="command-palette-input"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '15px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
            placeholder="Type a command, expense, or member name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            ESC
          </span>
        </div>

        {/* Smart Suggestions (chips) */}
        {!q && smartSuggestions.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px 12px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            {smartSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  s.action();
                  onClose();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary-accent-soft, rgba(43,168,158,0.12))';
                  e.currentTarget.style.borderColor = 'var(--primary-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <span aria-hidden="true" style={{ display: 'inline-flex' }}>{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div
          id="command-palette-results"
          role="listbox"
          aria-label="Command suggestions"
          style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px' }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }} role="status">
              No matching actions, expenses, or members found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={isSelected}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--border-radius-sm)',
                    background: isSelected ? 'var(--primary-accent-soft, rgba(43,168,158,0.12))' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    triggerHaptic('light');
                    item.action();
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-accent)',
                    flexShrink: 0,
                  }} aria-hidden="true">
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div style={{
          padding: '8px 14px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}>
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Select with <kbd>Enter</kbd></span>
        </div>
      </div>
    </div>
  );
}
