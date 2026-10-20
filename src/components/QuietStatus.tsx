import type { ReactNode } from 'react';

/** One sentence and one action. Used for empty, offline, and blocked money screens. */
export function QuietStatus({
  sentence,
  actionLabel,
  onAction,
  action,
}: {
  sentence: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="quiet-status" style={{ padding: '28px 16px', textAlign: 'center' }}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.45 }}>{sentence}</p>
      {action ?? (actionLabel && onAction ? (
        <button
          type="button"
          className="gradient-btn"
          style={{ marginTop: '14px', padding: '10px 18px', fontSize: '14px' }}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null)}
    </div>
  );
}
