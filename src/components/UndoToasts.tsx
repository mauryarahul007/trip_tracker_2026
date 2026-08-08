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
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column-reverse', gap: '10px', alignItems: 'center',
      zIndex: 9999
    }}>
      {pendingDeleteExpense && (
        <div style={{
          background: 'rgba(28,42,56,0.94)', color: '#fff', borderRadius: '12px',
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', fontSize: '14px',
          backdropFilter: 'blur(8px)', minWidth: '280px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IconTrash size={15} className="icon-sm" /> <strong>'{pendingDeleteExpense.title}'</strong> deleted</span>
          <button onClick={onUndoDeleteExpense} className="undo-toast-btn">Undo</button>
        </div>
      )}
      {pendingDeleteTrip && (
        <div style={{
          background: 'rgba(28,42,56,0.94)', color: '#fff', borderRadius: '12px',
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', fontSize: '14px',
          backdropFilter: 'blur(8px)', minWidth: '280px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IconTrash size={15} className="icon-sm" /> Trip <strong>'{pendingDeleteTrip.name}'</strong> deleted</span>
          <button onClick={onUndoDeleteTrip} className="undo-toast-btn">Undo</button>
        </div>
      )}
      {pendingDeleteGroup && (
        <div style={{
          background: 'rgba(28,42,56,0.94)', color: '#fff', borderRadius: '12px',
          padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', fontSize: '14px',
          backdropFilter: 'blur(8px)', minWidth: '280px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><IconTrash size={15} className="icon-sm" /> Group <strong>'{pendingDeleteGroup.name}'</strong> deleted</span>
          <button onClick={onUndoDeleteGroup} className="undo-toast-btn">Undo</button>
        </div>
      )}
    </div>
  );
}
