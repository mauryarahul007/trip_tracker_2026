import { IconCheckCircle, IconPlus, IconShare } from './Icons';

type Props = {
  /** Travelers other than you who have actually joined (linked an account). */
  joinedCount: number;
  onInvite?: () => void;
  onAddExpense: () => void;
};

// enableCompactSummary: Summary for a trip with no expenses yet. Replaces a
// "settled at 0" hero that read as if the trip were already finished.
export function TripStartCard({ joinedCount, onInvite, onAddExpense }: Props) {
  const invited = joinedCount > 0;
  return (
    <section className="trip-start-card" aria-labelledby="trip-start-title">
      <div className="trip-start-eyebrow">Boarding soon</div>
      <h2 id="trip-start-title" className="trip-start-title">Get this trip rolling</h2>
      <p className="trip-start-sub">Balances and charts show up here after the first expense.</p>

      <ol className="trip-start-steps">
        <li className={`trip-start-step${invited ? ' is-done' : ''}`}>
          <span className="trip-start-step-num" aria-hidden="true">
            {invited ? <IconCheckCircle size={16} /> : '1'}
          </span>
          <span className="trip-start-step-text">
            <strong>Invite your group</strong>
            <span>{invited ? `${joinedCount} joined so far` : 'Share a link or QR so everyone can add expenses'}</span>
          </span>
          {onInvite && (
            <button type="button" className="secondary-btn trip-start-step-btn" onClick={onInvite}>
              <IconShare size={14} className="icon-sm" /> {invited ? 'Invite more' : 'Invite'}
            </button>
          )}
        </li>
        <li className="trip-start-step">
          <span className="trip-start-step-num" aria-hidden="true">2</span>
          <span className="trip-start-step-text">
            <strong>Add the first expense</strong>
            <span>Tickets, the hotel, tonight's dinner: anything shared</span>
          </span>
          <button type="button" className="gradient-btn trip-start-step-btn" onClick={onAddExpense}>
            <IconPlus size={14} className="icon-sm" /> Add
          </button>
        </li>
      </ol>
    </section>
  );
}
