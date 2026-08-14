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
      bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
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
          message={<><strong>'{pendingDeleteExpense.title}'</strong> deleted</>}
          onUndo={onUndoDeleteExpense}
        />
      )}
      {pendingDeleteTrip && (
        <PostmarkToast
          message={<>Trip <strong>'{pendingDeleteTrip.name}'</strong> deleted</>}
          onUndo={onUndoDeleteTrip}
        />
      )}
      {pendingDeleteGroup && (
        <PostmarkToast
          message={<>Group <strong>'{pendingDeleteGroup.name}'</strong> deleted</>}
          onUndo={onUndoDeleteGroup}
        />
      )}
    </div>
  );
}
