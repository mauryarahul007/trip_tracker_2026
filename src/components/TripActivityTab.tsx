import { useState, useMemo } from 'react';
import type { AppNotification } from '../types';
import { NotificationCard } from './NotificationsPanel';
import { IconBell, IconCheck, IconTrash, IconX } from './Icons';

type Props = {
  notifications: AppNotification[];
  onOpen: (n: AppNotification) => void;
  onToggleRead: (n: AppNotification) => void;
  onDelete: (n: AppNotification) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onMarkAllRead: () => void;
  onDeleteAll: () => void;
};

/**
 * Calm Passport Activity tab (flag `enableCalmPassportUi`): this trip's own notifications only,
 * newest first, with mark-all/delete-all and multi-select batch clear.
 */
export function TripActivityTab({
  notifications,
  onOpen,
  onToggleRead,
  onDelete,
  onDeleteBatch,
  onMarkAllRead,
  onDeleteAll,
}: Props) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications]
  );
  const unreadCount = sorted.filter((n) => !n.read).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((n) => n.id)));
    }
  };

  const handleClearSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onDeleteBatch) {
      onDeleteBatch(ids);
    } else {
      ids.forEach((id) => {
        const found = sorted.find((n) => n.id === id);
        if (found) onDelete(found);
      });
    }
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleCancelSelect = () => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  return (
    <div className="fade-in" style={{ padding: '0 0 120px' }}>
      {!isSelectMode ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 12px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {unreadCount === 0 ? 'Activity' : `Activity · ${unreadCount} new`}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {sorted.length > 0 && (
              <button
                type="button"
                className="chip-filter"
                style={{ padding: '4px 11px', fontSize: '13px', fontWeight: 600, height: '32px', cursor: 'pointer' }}
                onClick={() => setIsSelectMode(true)}
                title="Select multiple entries"
                aria-label="Select multiple entries"
              >
                Select
              </button>
            )}
            <button
              type="button"
              className="notif-row-action-btn notif-btn-read"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              title="Mark all as read"
              aria-label="Mark all as read"
            >
              <IconCheck size={15} />
            </button>
            <button
              type="button"
              className="notif-row-action-btn danger"
              onClick={onDeleteAll}
              disabled={sorted.length === 0}
              title="Delete all activity"
              aria-label="Delete all activity"
            >
              <IconTrash size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="activity-select-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'color-mix(in srgb, var(--primary-accent) 8%, var(--bg-surface))',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="chip-filter active"
              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, height: '30px', cursor: 'pointer' }}
              onClick={handleSelectAllToggle}
            >
              {selectedIds.size === sorted.length ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {selectedIds.size} of {sorted.length} selected
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="notif-row-action-btn danger"
              style={{
                height: '30px',
                padding: '0 10px',
                width: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
              onClick={handleClearSelected}
              disabled={selectedIds.size === 0}
              title="Clear selected activity"
              aria-label={`Clear ${selectedIds.size} selected entries`}
            >
              <IconTrash size={14} />
              <span>Clear ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              className="notif-row-action-btn"
              style={{
                height: '30px',
                padding: '0 10px',
                width: 'auto',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
              onClick={handleCancelSelect}
              title="Cancel selection"
              aria-label="Cancel selection"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
          <IconBell size={28} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 4px' }}>No activity yet</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Expenses, settlements, new travelers and messages show up here.</p>
        </div>
      ) : (
        <div className="activity-edge-list">
          {sorted.map((n) => {
            const isSelected = selectedIds.has(n.id);
            return (
              <div
                key={n.id}
                className={`activity-edge-row ${isSelectMode ? 'select-mode' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={isSelectMode ? () => toggleSelect(n.id) : undefined}
                role={isSelectMode ? 'checkbox' : undefined}
                aria-checked={isSelectMode ? isSelected : undefined}
                tabIndex={isSelectMode ? 0 : undefined}
                onKeyDown={
                  isSelectMode
                    ? (e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleSelect(n.id);
                        }
                      }
                    : undefined
                }
              >
                {isSelectMode && (
                  <div
                    className={`activity-select-checkbox ${isSelected ? 'checked' : ''}`}
                    aria-hidden="true"
                  >
                    {isSelected && <IconCheck size={13} />}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, pointerEvents: isSelectMode ? 'none' : 'auto' }}>
                  <NotificationCard
                    notification={n}
                    isCurrentTrip
                    onOpen={() => onOpen(n)}
                    onToggleRead={() => onToggleRead(n)}
                    onDelete={() => onDelete(n)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
