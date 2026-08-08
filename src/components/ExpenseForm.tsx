import React from 'react';
import type { Category, Group, Member, Trip } from '../types';

type SplitMode = 'equal' | 'custom' | 'exact' | 'percentage';

function formatAmountDisplay(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

type Props = {
  trip: Trip | undefined;
  visibleMembers: Member[];
  visibleTripGroups: Group[];
  categories: Category[];
  editingExpenseId: string | null;

  title: string;
  setTitle: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  payer: string;
  setPayer: (v: string) => void;
  splitMode: SplitMode;
  setSplitMode: (v: SplitMode) => void;
  splitConfig: Record<string, string>;
  setSplitConfig: (v: Record<string, string>) => void;
  selectedSplitMembers: Record<string, boolean>;
  setSelectedSplitMembers: (v: Record<string, boolean>) => void;
  receiptImage: string;
  setReceiptImage: (v: string) => void;
  receiptProcessing: boolean;
  formError: string;

  splitSelectedIds: string[];
  splitConfigSum: number;
  splitConfigMatches: boolean;

  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onReceiptFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyGroupToSplit: (memberIds: string[], checked: boolean) => void;
};

export function ExpenseForm({
  trip,
  visibleMembers,
  visibleTripGroups,
  categories,
  editingExpenseId,
  title,
  setTitle,
  amount,
  setAmount,
  category,
  setCategory,
  date,
  setDate,
  payer,
  setPayer,
  splitMode,
  setSplitMode,
  splitConfig,
  setSplitConfig,
  selectedSplitMembers,
  setSelectedSplitMembers,
  receiptImage,
  setReceiptImage,
  receiptProcessing,
  formError,
  splitSelectedIds,
  splitConfigSum,
  splitConfigMatches,
  onSubmit,
  onCancel,
  onReceiptFileChange,
  onApplyGroupToSplit,
}: Props) {
  const currencySymbol = trip?.baseCurrency === 'INR' ? '₹' : trip?.baseCurrency;

  return (
    <form className="glass-card fade-in" onSubmit={onSubmit} style={{ marginBottom: '24px' }}>
      <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>{editingExpenseId ? 'Edit Expense' : 'New Expense'}</h4>

      <div className="form-group">
        <label className="form-label">Expense Title</label>
        <input
          type="text"
          required
          className="input-field"
          placeholder="e.g. Flight Tickets"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">Amount ({trip?.baseCurrency})</label>
          <input
            type="text"
            inputMode="decimal"
            required
            className="input-field"
            placeholder="0.00"
            value={formatAmountDisplay(amount)}
            onChange={(e) => {
              const raw = e.target.value.replace(/,/g, '');
              if (/^\d*\.?\d*$/.test(raw)) setAmount(raw);
            }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="input-field select-field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">Paid By (Payer)</label>
          <select
            className="input-field select-field"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
          >
            {!visibleMembers.some((m) => m.id === payer) && payer && (
              <option value={payer} disabled style={{ color: 'var(--color-danger)' }}>
                ⚠️ Unknown / Deleted Payer (Select a new payer)
              </option>
            )}
            {visibleMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            required
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Split Mode</label>
        <select
          className="input-field select-field"
          value={splitMode}
          onChange={(e) => setSplitMode(e.target.value as SplitMode)}
        >
          <option value="equal">Split Equally</option>
          <option value="custom">Custom Weights (e.g. 1, 2, 0.5)</option>
          <option value="exact">Exact Amounts ({trip?.baseCurrency})</option>
          <option value="percentage">Percentage (100% total)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Receipt (optional)</label>
        {receiptImage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={receiptImage}
              alt="Receipt preview"
              style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}
            />
            <button type="button" className="secondary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setReceiptImage('')}>
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={onReceiptFileChange}
            disabled={receiptProcessing}
          />
        )}
        {receiptProcessing && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Processing image...</p>
        )}
      </div>

      {/* Checkboxes to select division participants */}
      <div className="form-group" style={{ marginTop: '8px' }}>
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Division of Expense</span>
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', textTransform: 'none' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                const allChecked: Record<string, boolean> = {};
                visibleMembers.forEach((m) => { allChecked[m.id] = true; });
                setSelectedSplitMembers(allChecked);
              }}
            >
              Select All
            </button>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                setSelectedSplitMembers({});
                setSplitConfig({});
              }}
            >
              Clear All
            </button>
          </div>
        </label>

        {splitMode !== 'equal' && splitSelectedIds.length > 0 && (
          <div style={{
            fontSize: '12px', fontWeight: 600, marginBottom: '8px',
            color: splitMode === 'custom'
              ? 'var(--text-secondary)'
              : splitConfigMatches ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {splitMode === 'percentage'
              ? `${splitConfigSum.toFixed(1)} / 100%`
              : splitMode === 'exact'
                ? `${currencySymbol}${splitConfigSum.toFixed(2)} / ${currencySymbol}${(parseFloat(amount) || 0).toFixed(2)}`
                : `Total weight: ${splitConfigSum.toFixed(2)}`}
            {splitConfigMatches && (splitMode === 'exact' || splitMode === 'percentage') ? ' ✓' : ''}
          </div>
        )}

        {/* Quick Select Group Buttons */}
        {visibleTripGroups.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Groups:</span>
            {visibleTripGroups.map((grp) => (
              <button
                key={grp.id}
                type="button"
                className="secondary-btn"
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '8px' }}
                onClick={() => onApplyGroupToSplit(grp.memberIds, true)}
              >
                ＋ {grp.name}
              </button>
            ))}
          </div>
        )}

        {/* Individual Member Checklist & Config Inputs */}
        <div className="input-field" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff' }}>
          {visibleMembers.map((m) => {
            const isChecked = !!selectedSplitMembers[m.id];
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      setSelectedSplitMembers({
                        ...selectedSplitMembers,
                        [m.id]: e.target.checked
                      });
                      if (!e.target.checked) {
                        const updatedConfig = { ...splitConfig };
                        delete updatedConfig[m.id];
                        setSplitConfig(updatedConfig);
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary-accent)' }}
                  />
                  {m.name}
                </label>

                {isChecked && splitMode !== 'equal' && (
                  <input
                    type="text"
                    required
                    placeholder={
                      splitMode === 'custom' ? 'Weight (e.g. 1)' :
                      splitMode === 'exact' ? 'Amount (e.g. 200)' : 'Percent (e.g. 25)'
                    }
                    className="input-field"
                    style={{ padding: '6px 10px', fontSize: '13px', width: '125px', height: '32px' }}
                    value={splitConfig[m.id] || ''}
                    onChange={(e) => {
                      setSplitConfig({
                        ...splitConfig,
                        [m.id]: e.target.value
                      });
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Render any checked members that are now deleted */}
          {Object.keys(selectedSplitMembers)
            .filter((id) => selectedSplitMembers[id] && !visibleMembers.some((m) => m.id === id))
            .map((id) => {
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', color: 'var(--color-danger)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => {
                        setSelectedSplitMembers({
                          ...selectedSplitMembers,
                          [id]: false
                        });
                        const updatedConfig = { ...splitConfig };
                        delete updatedConfig[id];
                        setSplitConfig(updatedConfig);
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-danger)' }}
                    />
                    ⚠️ [Deleted Member] (Uncheck to remove)
                  </label>
                </div>
              );
            })}
        </div>
      </div>

      {formError && (
        <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '12px' }}>{formError}</p>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button type="submit" className="gradient-btn" style={{ flex: 1 }}>
          {editingExpenseId ? 'Update Expense' : 'Add Expense'}
        </button>
        <button
          type="button"
          className="secondary-btn"
          style={{ flex: 1 }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
