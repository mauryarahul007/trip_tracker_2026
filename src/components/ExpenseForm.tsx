import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { Category, Group, Member, Trip, Expense, ExpenseLocation } from '../types';
import { IconCheck, IconAlertCircle, IconClose, IconMapPin } from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { initial } from '../utils/initials';
import { getCurrencySymbol } from '../utils/currency';
import { compressImageToDataUrl, compressDataUrlToDataUrl } from '../utils/image';
import { autoSuggestCategory } from '../utils/categoryHelper';
import { captureCurrentExpenseLocation } from '../utils/geolocation';
import { useTripStore } from '../store/tripStore';

type SplitMode = 'equal' | 'custom' | 'exact' | 'percentage';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  editingExpense: Expense | null;
  onSave: (expenseData: {
    title: string;
    amount: number;
    category: string;
    date: string;
    paidBy: string;
    splitMode: SplitMode;
    splitMemberIds: string[];
    splitConfig?: Record<string, number>;
    receiptImage?: string;
    location?: ExpenseLocation | null;
  }) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
};



export function ExpenseForm({
  trip,
  visibleMembers,
  visibleTripGroups,
  categories,
  editingExpense,
  onSave,
  onCancel,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  // Local Form States
  const [title, setTitle] = useState(editingExpense?.title || '');
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : '');
  const [category, setCategory] = useState(editingExpense?.category || (categories[0]?.id || ''));
  const [date, setDate] = useState(editingExpense?.date || getTodayDateString());
  const [payer, setPayer] = useState(editingExpense?.paidBy || (visibleMembers[0]?.id || ''));
  const [splitMode, setSplitMode] = useState<SplitMode>((editingExpense?.splitMode as SplitMode) || 'equal');
  
  const [selectedSplitMembers, setSelectedSplitMembers] = useState<Record<string, boolean>>(() => {
    const initialSplit: Record<string, boolean> = {};
    if (editingExpense) {
      editingExpense.splitMemberIds.forEach((id) => { initialSplit[id] = true; });
    } else {
      visibleMembers.forEach((m) => { initialSplit[m.id] = true; });
    }
    return initialSplit;
  });

  const [splitConfig, setSplitConfig] = useState<Record<string, string>>(() => {
    const initialConfig: Record<string, string> = {};
    if (editingExpense?.splitConfig) {
      Object.entries(editingExpense.splitConfig).forEach(([id, val]) => {
        initialConfig[id] = String(val);
      });
    }
    return initialConfig;
  });

  const [receiptImage, setReceiptImage] = useState('');
  const [receiptProcessing, setReceiptProcessing] = useState(false);
  const [formError, setFormError] = useState('');
  const [honeypotVal, setHoneypotVal] = useState('');

  // Geotagging
  const enableGeotagging = useTripStore((s) => s.enableGeotagging);
  const [location, setLocation] = useState<ExpenseLocation | null>(editingExpense?.location || null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!editingExpense && enableGeotagging && !location) {
      setLocationLoading(true);
      captureCurrentExpenseLocation()
        .then((loc) => {
          if (loc) setLocation(loc);
        })
        .finally(() => setLocationLoading(false));
    }
  }, [editingExpense, enableGeotagging]);

  // Moves focus into the sheet for keyboard/screen-reader users without
  // popping the mobile keyboard open on every mount.
  const sheetRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  // Backdrop click only dismisses while the form is still untouched — once
  // the user has entered anything, a stray tap outside the sheet shouldn't
  // silently discard it (use the explicit Close/Cancel buttons instead).
  const isFormEmpty =
    !title.trim() &&
    !amount &&
    !receiptImage &&
    !location &&
    Object.keys(splitConfig).length === 0;

  // Derived Splits States
  const splitSelectedIds = Object.keys(selectedSplitMembers)
    .filter((id) => selectedSplitMembers[id])
    .filter((id) => visibleMembers.some((m) => m.id === id));

  const splitConfigSum = splitSelectedIds.reduce(
    (sum, id) => sum + (parseFloat(splitConfig[id] || '') || 0),
    0
  );

  const splitConfigTarget = splitMode === 'percentage' ? 100 : splitMode === 'exact' ? (parseFloat(amount) || 0) : null;
  const splitConfigMatches = splitConfigTarget === null || Math.abs(splitConfigSum - splitConfigTarget) < 0.02;

  // Handlers
  const handleReceiptFileChangeLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReceiptProcessing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setReceiptImage(dataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not process that image. Try a different photo.';
      setFormError(msg);
    } finally {
      setReceiptProcessing(false);
    }
  };

  const handleNativeCameraCapture = async () => {
    setReceiptProcessing(true);
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      });
      if (photo.dataUrl) {
        const compressed = await compressDataUrlToDataUrl(photo.dataUrl);
        setReceiptImage(compressed);
      }
    } catch (err) {
      // The Capacitor Camera plugin rejects with this exact message (both
      // iOS and Android) when the user backs out of the picker — that's
      // not an error state, leave receiptImage as-is. Anything else
      // (permission denial, hardware/decode error) is a real failure.
      const message = err instanceof Error ? err.message : '';
      if (message !== 'User cancelled photos app') {
        setFormError('Could not process that image. Try a different photo.');
      }
    } finally {
      setReceiptProcessing(false);
    }
  };

  const handleApplyGroupToSplitLocal = (memberIds: string[], checked: boolean) => {
    const updatedConfig = { ...splitConfig };
    if (checked) {
      const updatedSelection: Record<string, boolean> = {};
      visibleMembers.forEach((m) => {
        const inGroup = memberIds.includes(m.id);
        updatedSelection[m.id] = inGroup;
        if (!inGroup) delete updatedConfig[m.id];
      });
      setSelectedSplitMembers(updatedSelection);
    } else {
      const updatedSelection = { ...selectedSplitMembers };
      memberIds.forEach((id) => {
        updatedSelection[id] = false;
        delete updatedConfig[id];
      });
      setSelectedSplitMembers(updatedSelection);
    }
    setSplitConfig(updatedConfig);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || honeypotVal) return;
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter a title for the expense.');
      return;
    }

    if (splitSelectedIds.length === 0) {
      setFormError('Please select at least one member to split the expense with.');
      return;
    }

    if (!splitConfigMatches) {
      const modeLabel = splitMode === 'percentage' ? 'percentages' : 'exact amounts';
      const targetLabel = splitMode === 'percentage' ? '100%' : `${currencySymbol} ${amountVal.toFixed(2)}`;
      setFormError(`Split ${modeLabel} sum (${splitConfigSum.toFixed(2)}) must equal ${targetLabel}.`);
      return;
    }

    setFormError('');

    const finalSplitConfig: Record<string, number> = {};
    if (splitMode === 'percentage' || splitMode === 'exact') {
      splitSelectedIds.forEach((id) => {
        finalSplitConfig[id] = parseFloat(splitConfig[id] || '') || 0;
      });
    }

    setIsSubmitting(true);
    try {
      const res = await onSave({
        title: title.trim(),
        amount: amountVal,
        category,
        date,
        paidBy: payer,
        splitMode,
        splitMemberIds: splitSelectedIds,
        splitConfig: Object.keys(finalSplitConfig).length > 0 ? finalSplitConfig : undefined,
        receiptImage: receiptImage || undefined,
        location: location || null,
      });

      if (!res.success && res.error) {
        setFormError(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="modal-backdrop" onClick={isFormEmpty ? onCancel : undefined}>
      <form
        ref={sheetRef}
        tabIndex={-1}
        className="modal-sheet expense-form-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-form-title"
        onSubmit={handleSubmitLocal}
        onClick={(e) => e.stopPropagation()}
      >
      {/* Honeypot field for automated bot trap */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
        <input
          type="text"
          name="expense_vendor_code_security"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotVal}
          onChange={(e) => setHoneypotVal(e.target.value)}
        />
      </div>

      <div className="expense-form-scroll">
      <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))' }}>
        <div className="app-header-top">
          <div className="app-title-group">
            <span className="app-eyebrow">{trip?.name}</span>
            <h2 id="expense-form-title" className="app-logo" style={{ fontSize: '22px', color: '#F2ECDC' }}>{editingExpense ? 'Edit Expense' : 'New Expense'}</h2>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '7px 8px', color: '#F2ECDC', borderColor: 'rgba(242,236,220,0.28)', background: 'rgba(242,236,220,0.06)', flexShrink: 0 }}
            aria-label="Close"
            title="Close"
            onClick={onCancel}
          >
            <IconClose size={16} className="icon-sm" />
          </button>
        </div>
      </header>

      <div className="form-group">
        <label className="form-label">Amount ({trip?.baseCurrency})</label>
        <div className="amount-hero">
          <span className="amount-hero-symbol">{currencySymbol}</span>
          <input
            type="text"
            inputMode="decimal"
            required
            className="amount-hero-input"
            placeholder="0.00"
            value={formatAmountDisplay(amount)}
            onChange={(e) => {
              const raw = e.target.value.replace(/,/g, '');
              if (/^\d*\.?\d*$/.test(raw)) setAmount(raw);
            }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Expense Title</label>
        <input
          type="text"
          required
          className="input-field"
          placeholder="e.g. Flight Tickets"
          value={title}
          onChange={(e) => {
            const val = e.target.value;
            setTitle(val);
            const suggested = autoSuggestCategory(val, categories);
            if (suggested) {
              setCategory(suggested);
            }
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <div className="badge-row">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-badge${category === c.id ? ' active' : ''}`}
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
            >
              <CategoryIcon categoryId={c.id} fallbackEmoji={c.icon} size={15} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Paid By</label>
        {payer && !visibleMembers.some((m) => m.id === payer) && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 500, color: 'var(--color-warning)', marginBottom: '4px' }}>
            <IconAlertCircle size={14} className="icon-sm" /> Previous payer was removed — choose someone new.
          </p>
        )}
        <div className="member-grid">
          {visibleMembers.map((m) => {
            const isSelected = payer === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className="member-card"
                style={isSelected ? { borderColor: 'var(--primary-accent)', background: 'rgba(31,110,104,0.07)' } : undefined}
                onClick={() => setPayer(m.id)}
                aria-pressed={isSelected}
              >
                <div className="member-avatar" style={isSelected ? { background: 'var(--primary-accent)' } : undefined}>
                  {initial(m.name)}
                </div>
                <span className="member-name">{m.name}</span>
              </button>
            );
          })}
        </div>
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

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#00BFA5', display: 'flex', alignItems: 'center' }}><IconMapPin size={15} /></span> Location
          </label>
          {!location && !locationLoading && (
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '2px 8px', fontSize: '11.5px', color: '#00BFA5', borderColor: 'rgba(0,191,165,0.3)' }}
              onClick={async () => {
                setLocationLoading(true);
                const loc = await captureCurrentExpenseLocation();
                if (loc) setLocation(loc);
                setLocationLoading(false);
              }}
            >
              + Tag Location
            </button>
          )}
        </div>

        {locationLoading ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #00BFA5', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            Fetching GPS coordinates...
          </div>
        ) : location ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(0,191,165,0.08)',
              border: '1px solid rgba(0,191,165,0.28)',
              fontSize: '12.5px',
              color: 'var(--text-primary)',
            }}
          >
            <span>📍 {location.placeName || `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}</span>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '14px',
                lineHeight: 1,
              }}
              onClick={() => setLocation(null)}
              title="Remove location"
            >
              &times;
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            No GPS location attached.
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Split Mode</label>
        <div className="segmented-control">
          <button type="button" className={splitMode === 'equal' ? 'active' : ''} onClick={() => setSplitMode('equal')}>Equal</button>
          <button type="button" className={splitMode === 'custom' ? 'active' : ''} onClick={() => setSplitMode('custom')}>Weight</button>
          <button type="button" className={splitMode === 'exact' ? 'active' : ''} onClick={() => setSplitMode('exact')}>Exact</button>
          <button type="button" className={splitMode === 'percentage' ? 'active' : ''} onClick={() => setSplitMode('percentage')}>Percent</button>
        </div>
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
        ) : Capacitor.isNativePlatform() ? (
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '8px 14px', fontSize: '13px' }}
            onClick={handleNativeCameraCapture}
            disabled={receiptProcessing}
          >
            📷 Take or Choose Photo
          </button>
        ) : (
          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={handleReceiptFileChangeLocal}
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
            display: 'flex', alignItems: 'center', gap: '5px',
            color: splitMode === 'custom'
              ? 'var(--text-secondary)'
              : splitConfigMatches ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            <span>
              {splitMode === 'percentage'
                ? `${splitConfigSum.toFixed(1)} / 100%`
                : splitMode === 'exact'
                  ? `${currencySymbol}${splitConfigSum.toFixed(2)} / ${currencySymbol}${(parseFloat(amount) || 0).toFixed(2)}`
                  : `Total weight: ${splitConfigSum.toFixed(2)}`}
            </span>
            {splitConfigMatches && (splitMode === 'exact' || splitMode === 'percentage') && <IconCheck size={13} className="icon-sm" />}
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
                onClick={() => handleApplyGroupToSplitLocal(grp.memberIds, true)}
              >
                ＋ {grp.name}
              </button>
            ))}
          </div>
        )}

        {/* Member avatar-card multi-select, with inline config input for non-equal splits */}
        <div className="member-grid">
          {visibleMembers.map((m) => {
            const isChecked = !!selectedSplitMembers[m.id];
            const toggle = () => {
              const nextChecked = !isChecked;
              setSelectedSplitMembers({
                ...selectedSplitMembers,
                [m.id]: nextChecked
              });
              if (!nextChecked) {
                const updatedConfig = { ...splitConfig };
                delete updatedConfig[m.id];
                setSplitConfig(updatedConfig);
              }
            };
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                className="member-card"
                style={isChecked ? { borderColor: 'var(--color-success)', background: 'rgba(44,122,75,0.07)' } : undefined}
                aria-pressed={isChecked}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                  }
                }}
              >
                <div className="member-avatar">
                  {initial(m.name)}
                  {isChecked && (
                    <span className="member-check-badge">
                      <IconCheck size={10} className="icon-sm" />
                    </span>
                  )}
                </div>
                <span className="member-name">{m.name}</span>
                {isChecked && splitMode !== 'equal' && (
                  <input
                    type="text"
                    required
                    placeholder={
                      splitMode === 'custom' ? 'e.g. 1' :
                      splitMode === 'exact' ? 'e.g. 200' : 'e.g. 25'
                    }
                    className="input-field member-config-input"
                    value={splitConfig[m.id] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setSplitConfig({
                        ...splitConfig,
                        [m.id]: e.target.value
                      });
                    }}
                  />
                )}
                {isChecked && (splitMode === 'custom' || splitMode === 'percentage') && splitConfig[m.id] && (
                  <span className="member-config-equiv">
                    = {currencySymbol}{(
                      splitMode === 'percentage'
                        ? ((parseFloat(splitConfig[m.id]) || 0) / 100) * (parseFloat(amount) || 0)
                        : splitConfigSum > 0
                          ? ((parseFloat(splitConfig[m.id]) || 0) / splitConfigSum) * (parseFloat(amount) || 0)
                          : 0
                    ).toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}

          {/* Any checked members that are now deleted — kept visible so they can be unchecked */}
          {Object.keys(selectedSplitMembers)
            .filter((id) => selectedSplitMembers[id] && !visibleMembers.some((m) => m.id === id))
            .map((id) => (
              <button
                key={id}
                type="button"
                className="member-card"
                style={{ borderColor: 'var(--color-danger)', background: 'rgba(184,69,46,0.06)' }}
                onClick={() => {
                  setSelectedSplitMembers({
                    ...selectedSplitMembers,
                    [id]: false
                  });
                  const updatedConfig = { ...splitConfig };
                  delete updatedConfig[id];
                  setSplitConfig(updatedConfig);
                }}
              >
                <div className="member-avatar" style={{ background: 'var(--color-danger)' }}>
                  <IconAlertCircle size={16} className="icon-sm" />
                </div>
                <span className="member-name" style={{ color: 'var(--color-danger)' }}>Removed</span>
              </button>
            ))}
        </div>
      </div>

      {formError && (
        <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '12px' }}>{formError}</p>
      )}
      </div>

      <div className="expense-form-actions">
        <button type="submit" className="gradient-btn" style={{ flex: 1 }} disabled={isSubmitting}>
          {editingExpense ? 'Update Expense' : 'Add Expense'}
        </button>
        <button
          type="button"
          className="secondary-btn"
          style={{ flex: 1 }}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
      </form>
    </div>
  );
}
