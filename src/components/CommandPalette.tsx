import React, { useState, useEffect, useRef } from 'react';
import type { Trip, Expense, Member, Category } from '../types';
import { IconSearch, IconPlus, IconMembers, IconSettings, IconCheck, IconCalendar } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  trip?: Trip;
  expenses: Expense[];
  members: Member[];
  categories: Category[];
  onSelectExpense: (expense: Expense) => void;
  onSelectMember: (memberId: string) => void;
  onNewExpense: () => void;
  onOpenWrapped: () => void;
  onOpenSettings: () => void;
  onSwitchTab: (tab: 'expenses' | 'balances' | 'settings' | 'members') => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  trip,
  expenses,
  members,
  categories,
  onSelectExpense,
  onSelectMember,
  onNewExpense,
  onOpenWrapped,
  onOpenSettings,
  onSwitchTab,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

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
    type: 'action' | 'expense' | 'member' | 'tab';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
  }

  const items: CommandItem[] = [];

  // Actions
  items.push({
    id: 'act-new-exp',
    type: 'action',
    title: 'Add New Expense',
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

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 'max(80px, 15vh)' }}>
      <div
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
          <IconSearch size={18} style={{ color: 'var(--primary-accent)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
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

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No matching actions, expenses, or members found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
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
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary-accent)' : 'var(--bg-secondary)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '11px', color: 'var(--primary-accent)', fontWeight: 600 }}>↵ Select</span>
                  )}
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
