import { useEffect } from 'react';
import type { Expense } from '../../types';
import type { ConfirmRequest } from '../ConfirmDialog';
import { IconArchive, IconTrash } from '../Icons';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

const RECYCLE_BIN_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatTimeLeft(deletedAt: number): string {
  const msLeft = deletedAt + RECYCLE_BIN_WINDOW_MS - Date.now();
  if (msLeft <= 0) return 'purging soon';
  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
  if (hoursLeft < 1) return '<1h left';
  return `${hoursLeft}h left`;
}

type Props = {
  parentTitle: string;
  onBack: () => void;
  deletedExpenses: Expense[];
  fetchDeletedExpenses: () => Promise<void>;
  restoreExpense: (id: string) => void;
  permanentlyDeleteExpense: (id: string) => void;
  emptyRecycleBin: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
};

export function SettingsRecycleBinScreen({
  parentTitle,
  onBack,
  deletedExpenses,
  fetchDeletedExpenses,
  restoreExpense,
  permanentlyDeleteExpense,
  emptyRecycleBin,
  onRequestConfirm,
}: Props) {
  useEffect(() => {
    void fetchDeletedExpenses();
  }, [fetchDeletedExpenses]);

  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="Recycle Bin"
      subtitle="Soft-deleted expenses can be restored back to your trip or permanently removed."
      headerRight={
        deletedExpenses.length > 0 ? (
          <button
            type="button"
            className="settings-subscreen-action-btn danger"
            onClick={() => {
              onRequestConfirm?.({
                title: 'Empty Recycle Bin',
                message: 'Permanently delete all expenses in the recycle bin? This cannot be undone.',
                confirmLabel: 'Empty Bin',
                danger: true,
                onConfirm: () => emptyRecycleBin(),
              });
            }}
          >
            Empty Bin
          </button>
        ) : undefined
      }
    >
      <div className="settings-group">
        <div className="settings-group-card">
          {deletedExpenses.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
              Recycle Bin is currently empty.
            </div>
          ) : (
            deletedExpenses.map((exp) => (
              <div
                key={exp.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    <span>{exp.currency} {exp.amount.toFixed(2)}</span> &middot; {exp.deletedAt ? formatTimeLeft(exp.deletedAt) : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => restoreExpense(exp.id)}
                    title="Restore expense"
                  >
                    <IconArchive size={13} className="icon-sm" /> Restore
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                    onClick={() => {
                      onRequestConfirm?.({
                        title: 'Delete permanently',
                        message: `Permanently delete "${exp.title}"? This cannot be undone.`,
                        confirmLabel: 'Delete',
                        danger: true,
                        onConfirm: () => permanentlyDeleteExpense(exp.id),
                      });
                    }}
                    title="Permanently delete now"
                    aria-label="Permanently delete"
                  >
                    <IconTrash size={13} className="icon-sm" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SettingsSubscreenFrame>
  );
}
