import type { ReactNode } from 'react';
import type { Expense, Group, Trip } from '../types';
import { IconTrash } from './Icons';

type Props = {
  pendingDeleteExpense: Expense | null;
  onUndoDeleteExpense: () => void;
  pendingDeleteTrip: Trip | null;
  onUndoDeleteTrip: () => void;
  pendingDeleteGroup: Group | null;
  onUndoDeleteGroup: () => void;
  durationMs: number;
};

const TOAST_TITLE_MAX = 40;

function truncateForToast(text: string): string {
  return text.length > TOAST_TITLE_MAX ? `${text.slice(0, TOAST_TITLE_MAX - 1).trimEnd()}…` : text;
}

function PostmarkToast({ message, onUndo, durationMs }: { message: ReactNode; onUndo: () => void; durationMs: number }) {
  return (
    <div className="postmark-toast" role="status" aria-live="polite">
      <span className="pm-stamp" aria-hidden="true">
        <IconTrash size={14} className="icon-sm" />
      </span>
      <span className="pm-text">{message}</span>
      <button onClick={onUndo} className="undo-toast-btn" aria-label="Undo deletion">Undo</button>
      <span className="undo-toast-progress" style={{ animationDuration: `${durationMs}ms` }} aria-hidden="true" />
    </div>
  );
}

export function UndoToasts({
  pendingDeleteExpense,
  onUndoDeleteExpense,
  pendingDeleteTrip,
  onUndoDeleteTrip,
  pendingDeleteGroup,
  onUndoDeleteGroup,
  durationMs,
}: Props) {
  if (!pendingDeleteExpense && !pendingDeleteTrip && !pendingDeleteGroup) return null;

  return (
    <div
      role="region"
      aria-label="Pending deletion notifications"
      style={{
        position: 'fixed',
        bottom: 'calc(72px + var(--safe-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '10px',
        alignItems: 'center',
        zIndex: 9999,
        maxWidth: 'calc(100vw - 32px)',
        width: 'max-content',
      }}
    >

      {pendingDeleteExpense && (
        <PostmarkToast
          key={pendingDeleteExpense.id}
          message={<><strong>'{truncateForToast(pendingDeleteExpense.title)}'</strong> deleted</>}
          onUndo={onUndoDeleteExpense}
          durationMs={durationMs}
        />
      )}
      {pendingDeleteTrip && (
        <PostmarkToast
          key={pendingDeleteTrip.id}
          message={<>Trip <strong>'{truncateForToast(pendingDeleteTrip.name)}'</strong> deleted</>}
          onUndo={onUndoDeleteTrip}
          durationMs={durationMs}
        />
      )}
      {pendingDeleteGroup && (
        <PostmarkToast
          key={pendingDeleteGroup.id}
          message={<>Group <strong>'{truncateForToast(pendingDeleteGroup.name)}'</strong> deleted</>}
          onUndo={onUndoDeleteGroup}
          durationMs={durationMs}
        />
      )}
    </div>
  );
}
