import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Member } from '../types';
import { IconClose, IconUpload } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { triggerHaptic } from '../utils/haptics';
import { useTripStore } from '../store/tripStore';
import {
  defaultNameMap,
  normalizePersonName,
  parseSplitwiseCsv,
  resolveSplitwiseRow,
  type SplitwiseNameAction,
  type SplitwiseParseResult,
} from '../utils/splitwiseImport';

type Props = {
  tripId: string;
  members: Member[];
  categories: Category[];
  onClose: () => void;
};

export function SplitwiseImportModal({ tripId, members, categories, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addMember = useTripStore((s) => s.addMember);
  const addExpense = useTripStore((s) => s.addExpense);
  const [parsed, setParsed] = useState<SplitwiseParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [skipPayments, setSkipPayments] = useState(true);
  const [nameMap, setNameMap] = useState<Record<string, SplitwiseNameAction>>({});
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useFocusTrap(sheetRef, true, false, onClose);
  useHistoryBack(true, onClose);
  useEscapeKey(true, onClose);

  useEffect(() => {
    if (!parsed) return;
    setNameMap(defaultNameMap(parsed.personNames, members));
  }, [parsed, members]);

  const importableRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.filter((r) => !(skipPayments && r.isPayment));
  }, [parsed, skipPayments]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseSplitwiseCsv(text);
    setFileName(file.name);
    setParsed(result);
    setStatus('idle');
    setError(result.errors[0] || null);
    setProgress('');
  };

  const handleImport = async () => {
    if (!parsed || importableRows.length === 0) return;
    setStatus('importing');
    setError(null);
    triggerHaptic('medium');

    const toCreate = parsed.personNames.filter((n) => nameMap[n] === '__create__');
    for (const name of toCreate) {
      setProgress(`Adding member ${name}…`);
      await addMember(name);
    }

    const store = useTripStore.getState();
    const trip = store.trips.find((t) => t.id === tripId);
    const createdByName: Record<string, string> = {};
    (trip?.memberIds || []).forEach((id) => {
      const member = store.members[id];
      if (member) createdByName[normalizePersonName(member.name)] = id;
    });

    let imported = 0;
    let skipped = 0;
    for (const row of importableRows) {
      const resolved = resolveSplitwiseRow(row, nameMap, createdByName, categories);
      if ('skip' in resolved) {
        skipped += 1;
        continue;
      }
      if ('error' in resolved) {
        setStatus('error');
        setError(resolved.error);
        return;
      }
      setProgress(`Importing ${imported + 1} of ${importableRows.length}…`);
      await addExpense({
        title: resolved.expense.title,
        amount: resolved.expense.amount,
        currency: resolved.expense.currency,
        category: resolved.expense.category,
        date: resolved.expense.date,
        paidBy: resolved.expense.paidBy,
        splitMode: resolved.expense.splitMode,
        splitMemberIds: resolved.expense.splitMemberIds,
        splitConfig: resolved.expense.splitConfig,
      });
      imported += 1;
    }

    setStatus('done');
    setProgress(`Imported ${imported} expense${imported === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`);
    triggerHaptic('success');
    void useTripStore.getState().recordSplitwiseImport(tripId, imported);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="splitwise-import-title"
        className="glass-card fade-in modal-sheet"
        style={{ maxWidth: '440px', background: 'var(--bg-surface)', maxHeight: '88vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 id="splitwise-import-title" style={{ fontSize: '17px', margin: 0 }}>Import Splitwise CSV</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 0 }}>
          Export the group spreadsheet from Splitwise (Date, Description, Cost, then one column per person) and import it into this trip.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="secondary-btn"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => fileRef.current?.click()}
        >
          <IconUpload size={16} />
          {fileName || 'Choose CSV file'}
        </button>

        {parsed && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={skipPayments}
                onChange={(e) => setSkipPayments(e.target.checked)}
              />
              Skip Splitwise payment / settled-up rows
            </label>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {importableRows.length} expense{importableRows.length === 1 ? '' : 's'} ready
              {parsed.rows.length - importableRows.length > 0 ? ` · ${parsed.rows.length - importableRows.length} payment rows skipped` : ''}
            </div>

            {parsed.personNames.map((name) => (
              <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                <select
                  className="input-field"
                  value={nameMap[name] || '__create__'}
                  onChange={(e) => setNameMap((prev) => ({ ...prev, [name]: e.target.value as SplitwiseNameAction }))}
                >
                  <option value="__create__">Create as new member</option>
                  <option value="__skip__">Skip this person</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
            ))}

            {parsed.errors.length > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{parsed.errors.join(' ')}</p>
            )}
          </div>
        )}

        {progress && (
          <p style={{ fontSize: '13px', color: status === 'error' ? 'var(--color-danger)' : 'var(--text-secondary)', marginBottom: 0 }}>
            {progress}
          </p>
        )}
        {error && status !== 'idle' && (
          <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={onClose}>
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            className="gradient-btn"
            style={{ flex: 1 }}
            disabled={!parsed || importableRows.length === 0 || status === 'importing'}
            onClick={() => void handleImport()}
          >
            {status === 'importing' ? 'Importing…' : status === 'done' ? 'Imported' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
