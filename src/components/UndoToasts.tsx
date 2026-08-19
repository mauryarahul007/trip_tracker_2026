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
};

const TOAST_TITLE_MAX = 40;

function truncateForToast(text: string): string {
  return text.length > TOAST_TITLE_MAX ? `${text.slice(0, TOAST_TITLE_MAX - 1).trimEnd()}…` : text;
}

function PostmarkToast({ message, onUndo }: { message: ReactNode; onUndo: () => void }) {
  return (
    <div className="postmark-toast">
      <span className="pm-stamp" aria-hidden="true">
        <IconTrash size={14} className="icon-sm" />
      </span>
      <span className="pm-text">{message}</span>
      <button onClick={onUndo} className="undo-toast-btn">Undo</button>
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
}: Props) {
  if (!pendingDeleteExpense && !pendingDeleteTrip && !pendingDeleteGroup) return null;

  return (
    <div style={{
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
    }}>
      {pendingDeleteExpense && (
        <PostmarkToast
          message={<><strong>'{truncateForToast(pendingDeleteExpense.title)}'</strong> deleted</>}
          onUndo={onUndoDeleteExpense}
        />
      )}
      {pendingDeleteTrip && (
        <PostmarkToast
          message={<>Trip <strong>'{truncateForToast(pendingDeleteTrip.name)}'</strong> deleted</>}
          onUndo={onUndoDeleteTrip}
        />
      )}
      {pendingDeleteGroup && (
        <PostmarkToast
          message={<>Group <strong>'{truncateForToast(pendingDeleteGroup.name)}'</strong> deleted</>}
          onUndo={onUndoDeleteGroup}
        />
      )}
    </div>
  );
}
