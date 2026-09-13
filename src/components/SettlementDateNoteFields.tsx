import { useState, type MutableRefObject } from 'react';

type Props = {
  dateRef: MutableRefObject<string>;
  noteRef: MutableRefObject<string>;
  defaultDate: string;
};

export function SettlementDateNoteFields({ dateRef, noteRef, defaultDate }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState('');
  dateRef.current = date;
  noteRef.current = note;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        Settlement date
        <input
          type="date"
          className="input-field"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        Note (optional)
        <input
          type="text"
          className="input-field"
          maxLength={80}
          placeholder="UPI, cash, paid at dinner…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </div>
  );
}
