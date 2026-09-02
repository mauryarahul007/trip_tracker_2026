import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { Category, Group, Member, Trip, Expense, ExpenseLocation } from '../types';
import { IconCheck, IconAlertCircle, IconClose, IconMapPin, IconMic } from './Icons';
import { CategoryIcon } from './CategoryIcon';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { getCurrencySymbol } from '../utils/currency';
import { compressImageToDataUrl, compressDataUrlToDataUrl } from '../utils/image';
import { autoSuggestCategory } from '../utils/categoryHelper';
import { captureCurrentExpenseLocation } from '../utils/geolocation';
import { useTripStore } from '../store/tripStore';
import { triggerHaptic } from '../utils/haptics';
import { convertCurrency, POPULAR_CURRENCIES } from '../utils/currencyConverter';
import { parseReceiptText, type ExtractedReceiptData } from '../utils/receiptOcr';
import { useFocusTrap } from '../hooks/useFocusTrap';

type SplitMode = 'equal' | 'custom' | 'exact' | 'percentage';

// Minimal Web Speech API surface -- not in the default TS DOM lib, and
// vendor-prefixed on most browsers that support it (Chrome/Edge/Safari).
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

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
    currency: string;
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
  initialTemplate?: { title?: string; category?: string };
};



export function ExpenseForm({
  trip,
  visibleMembers,
  visibleTripGroups,
  categories,
  editingExpense,
  onSave,
  onCancel,
  initialTemplate,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');

  // Local Form States
  const [title, setTitle] = useState(editingExpense?.title || initialTemplate?.title || '');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [amount, setAmount] = useState(editingExpense ? String(editingExpense.amount) : '');
  const [category, setCategory] = useState(
    editingExpense?.category ||
    (initialTemplate?.category && categories.some((c) => c.id === initialTemplate.category) ? initialTemplate.category : (categories[0]?.id || ''))
  );
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
  const [showReceiptSection, setShowReceiptSection] = useState(!!editingExpense?.receiptImage);
  const [formError, setFormError] = useState('');
  const [honeypotVal, setHoneypotVal] = useState('');

  // Currency conversion state
  const baseCurrency = trip?.baseCurrency || 'INR';
  const [selectedCurrency, setSelectedCurrency] = useState(editingExpense?.currency || baseCurrency);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Receipt OCR suggestion state
  const [ocrSuggestion, setOcrSuggestion] = useState<ExtractedReceiptData | null>(null);

  // Duplicate warning interactives state
  const [ignoredDuplicateId, setIgnoredDuplicateId] = useState<string | null>(null);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate expense detection
  const expenses = useTripStore((s) => s.expenses);
  const allTripExpenses = useMemo(() => expenses.filter((e) => e.tripId === trip?.id), [expenses, trip?.id]);

  // Snapshot initial expense IDs on mount so we never match against newly submitted/optimistic items
  const initialExpenseIdsRef = useRef<Set<string> | null>(null);
  if (!initialExpenseIdsRef.current) {
    initialExpenseIdsRef.current = new Set(allTripExpenses.map((e) => e.id));
  }

  const duplicateExpense = !isSubmitting && !editingExpense && parseFloat(amount) > 0 && title.trim().length > 1
    ? allTripExpenses.find((e) =>
        initialExpenseIdsRef.current?.has(e.id) &&
        e.date === date &&
        Math.abs(e.amount - parseFloat(amount)) < 0.05 &&
        (e.category === category || e.title.toLowerCase().includes(title.trim().toLowerCase()) || title.trim().toLowerCase().includes(e.title.toLowerCase()))
      )
    : null;

  // Reset details expansion if the duplicate target changes
  useEffect(() => {
    setShowDuplicateDetails(false);
  }, [duplicateExpense?.id]);

  // Live conversion calculation
  const numericAmount = parseFloat(amount) || 0;
  const currencyConversion = selectedCurrency !== baseCurrency && numericAmount > 0
    ? convertCurrency(numericAmount, selectedCurrency, baseCurrency)
    : null;

  // One-time nudge toward the split presets, shown only on the first-ever
  // new expense a person creates — dismissed permanently after they see it
  // once (or use a preset), same plain-localStorage pattern App.tsx uses
  // for theme-pref rather than pulling in a store for one boolean.
  const [showPresetsTip, setShowPresetsTip] = useState(
    () => !editingExpense && !localStorage.getItem('expense-presets-tip-seen')
  );
  const dismissPresetsTip = () => {
    localStorage.setItem('expense-presets-tip-seen', '1');
    setShowPresetsTip(false);
  };

  // Feature Flags & Role Governance
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const enableGeotagging = isFeatureEnabled('enableGeotagging');
  const enableAdvancedLocationSearch = isFeatureEnabled('enableAdvancedLocationSearch');

  // Geotagging
  const [location, setLocation] = useState<ExpenseLocation | null>(editingExpense?.location || null);
  const [locationLoading, setLocationLoading] = useState(false);
  const hasAttemptedGeoRef = useRef(false);

  useEffect(() => {
    if (!editingExpense && enableGeotagging && !location && !hasAttemptedGeoRef.current) {
      hasAttemptedGeoRef.current = true;
      setLocationLoading(true);
      captureCurrentExpenseLocation()
        .then((loc) => {
          if (loc) setLocation(loc);
        })
        .finally(() => setLocationLoading(false));
    }
  }, [editingExpense, enableGeotagging, location]);

  const sheetRef = useRef<HTMLFormElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(sheetRef, true, true, onCancel);

  useEffect(() => {
    // Automatically focus and select the amount field on open so the user can immediately type
    const timer = setTimeout(() => {
      if (amountInputRef.current) {
        amountInputRef.current.focus();
        amountInputRef.current.select();
      } else {
        sheetRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
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
      const parsed = parseReceiptText(file.name.replace(/[-_.]/g, ' '));
      if (parsed.amount || parsed.merchant) {
        setOcrSuggestion(parsed);
      }
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

  const applyPresetEqualAll = () => {
    triggerHaptic('light');
    dismissPresetsTip();
    const allChecked: Record<string, boolean> = {};
    visibleMembers.forEach((m) => { allChecked[m.id] = true; });
    setSelectedSplitMembers(allChecked);
    setSplitConfig({});
    setSplitMode('equal');
  };

  const applyPresetPayerFiftyGroup = () => {
    triggerHaptic('medium');
    dismissPresetsTip();
    if (!payer) return;
    const allChecked: Record<string, boolean> = {};
    const newConfig: Record<string, string> = {};
    const otherMembers = visibleMembers.filter((m) => m.id !== payer);
    allChecked[payer] = true;
    newConfig[payer] = '50';
    if (otherMembers.length > 0) {
      const sharePerOther = (50 / otherMembers.length).toFixed(1);
      otherMembers.forEach((m) => {
        allChecked[m.id] = true;
        newConfig[m.id] = sharePerOther;
      });
    }
    setSelectedSplitMembers(allChecked);
    setSplitConfig(newConfig);
    setSplitMode('percentage');
  };

  const applyPresetOnlyPayer = () => {
    triggerHaptic('warning');
    dismissPresetsTip();
    if (!payer) return;
    const selection: Record<string, boolean> = { [payer]: true };
    setSelectedSplitMembers(selection);
    setSplitConfig({});
    setSplitMode('equal');
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const handleToggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    triggerHaptic('light');
    const recognition = new Ctor();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setTitle(transcript);
        const suggested = autoSuggestCategory(transcript, categories);
        if (suggested) setCategory(suggested);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

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
      // Amount is always persisted in the trip's base currency -- every
      // other total/balance/settlement calc assumes that. If the user
      // picked a different currency, convert now rather than trusting them
      // to have clicked "Use {base}" first (that button was the only path
      // to a correct save; forgetting it silently saved the foreign number
      // as if it were base-currency).
      const finalAmount = selectedCurrency !== baseCurrency && currencyConversion
        ? currencyConversion.convertedAmount
        : amountVal;

      const res = await onSave({
        title: title.trim(),
        amount: finalAmount,
        currency: selectedCurrency,
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

  // Single classification for where formError renders, so amount/title
  // validation failures show once near their field instead of duplicating
  // at the bottom -- any error that isn't specifically about amount or
  // title (split sum, membership, API errors) falls through to the
  // bottom banner.
  const isAmountFormError = Boolean(formError) && (!amount || parseFloat(amount) <= 0);
  const isTitleFormError = Boolean(formError) && !isAmountFormError && !title.trim() && parseFloat(amount) > 0;
  const isGeneralFormError = Boolean(formError) && !isAmountFormError && !isTitleFormError;

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
      <div className="sheet-drag-handle" aria-hidden="true" />
      <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))', viewTransitionName: editingExpense ? 'expense-shared-title' : undefined }}>
        <div className="app-header-top">
          <div className="app-title-group">
            <span className="app-eyebrow">{trip?.name}</span>
            <h2 id="expense-form-title" className="app-logo" style={{ fontSize: '22px', color: '#FFFFFF', viewTransitionName: editingExpense ? 'expense-shared-title' : undefined }}>{editingExpense ? 'Edit Expense' : 'New Expense'}</h2>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '7px 8px', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
            aria-label="Close"
            title="Close"
            onClick={onCancel}
          >
            <IconClose size={16} className="icon-sm" />
          </button>
        </div>
      </header>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label" style={{ margin: 0 }} htmlFor="expense-amount">
            Amount ({selectedCurrency})
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="currency-pill-btn"
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '12px',
                background: selectedCurrency !== baseCurrency ? 'var(--primary-accent)' : 'var(--bg-card-hover)',
                color: selectedCurrency !== baseCurrency ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
              title="Change Currency"
            >
              <span>{getCurrencySymbol(selectedCurrency)}</span>
              <span>{selectedCurrency}</span>
            </button>
          </div>
        </div>

        {showCurrencyPicker && (
          <div className="fade-in" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '10px',
            padding: '8px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            {POPULAR_CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={`pill-chip ${selectedCurrency === c.code ? 'active' : ''}`}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: selectedCurrency === c.code ? 'var(--primary-accent)' : 'var(--bg-primary)',
                  color: selectedCurrency === c.code ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: selectedCurrency === c.code ? 700 : 500
                }}
                onClick={() => {
                  setSelectedCurrency(c.code);
                  setShowCurrencyPicker(false);
                }}
              >
                {c.symbol} {c.code}
              </button>
            ))}
          </div>
        )}

        <div className={`amount-hero ${formError && (!amount || parseFloat(amount) <= 0) ? 'amount-hero-error' : ''}`}>
          <span className="amount-hero-symbol">{getCurrencySymbol(selectedCurrency)}</span>
          <input
            id="expense-amount"
            ref={amountInputRef}
            type="text"
            inputMode="decimal"
            autoFocus
            className="amount-hero-input"
            placeholder="0.00"
            value={formatAmountDisplay(amount)}
            onChange={(e) => {
              const raw = e.target.value.replace(/,/g, '');
              if (/^\d*\.?\d*$/.test(raw)) setAmount(raw);
              if (formError) setFormError('');
            }}
          />
        </div>

        {/* Quick Amount Increment / Rounding Chips */}
        <div className="quick-amount-chips">
          {[10, 50, 100, 500].map((inc) => (
            <button
              key={inc}
              type="button"
              className="quick-amount-chip"
              onClick={() => {
                const current = parseFloat(amount) || 0;
                setAmount(String(Math.round((current + inc) * 100) / 100));
                if (formError) setFormError('');
              }}
            >
              +{inc}
            </button>
          ))}
          {parseFloat(amount) > 0 && Math.round(parseFloat(amount)) !== parseFloat(amount) && (
            <button
              type="button"
              className="quick-amount-chip"
              onClick={() => {
                const current = parseFloat(amount) || 0;
                setAmount(String(Math.ceil(current)));
              }}
            >
              Round ↑
            </button>
          )}
        </div>

        {/* Live Currency Conversion Preview */}
        {currencyConversion && (
          <div className="fade-in" style={{
            marginTop: '6px',
            padding: '6px 10px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'rgba(47,111,237,0.08)',
            border: '1px solid rgba(47,111,237,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-primary)'
          }}>
            <span>
              ≈ <strong>{getCurrencySymbol(baseCurrency)} {currencyConversion.convertedAmount.toFixed(2)}</strong> {baseCurrency} (1 {selectedCurrency} = {currencyConversion.rate} {baseCurrency})
            </span>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-accent)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '11px',
                textDecoration: 'underline'
              }}
              onClick={() => {
                setAmount(String(currencyConversion.convertedAmount));
                setSelectedCurrency(baseCurrency);
              }}
            >
              Use {baseCurrency}
            </button>
          </div>
        )}

        {/* Receipt OCR Auto-Fill Suggestion Chip */}
        {ocrSuggestion && (
          <div className="fade-in" style={{
            marginTop: '8px',
            padding: '8px 10px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'rgba(230,162,60,0.12)',
            border: '1px solid rgba(230,162,60,0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px'
          }}>
            <span style={{ color: 'var(--text-primary)' }}>
              ⚡ <strong>Receipt OCR:</strong> Found {ocrSuggestion.amount ? `${currencySymbol}${ocrSuggestion.amount}` : ''} {ocrSuggestion.merchant ? `at ${ocrSuggestion.merchant}` : ''}
            </span>
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={() => {
                if (ocrSuggestion.amount) setAmount(String(ocrSuggestion.amount));
                if (ocrSuggestion.merchant) {
                  setTitle(ocrSuggestion.merchant);
                  const suggestedCat = autoSuggestCategory(ocrSuggestion.merchant, categories);
                  if (suggestedCat) setCategory(suggestedCat);
                }
                if (ocrSuggestion.date) setDate(ocrSuggestion.date);
                setOcrSuggestion(null);
              }}
            >
              Apply
            </button>
          </div>
        )}

        {/* Duplicate Expense Warning */}
        {duplicateExpense && ignoredDuplicateId !== duplicateExpense.id && (
          <div className="fade-in" style={{
            marginTop: '6px',
            padding: '8px 10px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'rgba(235,107,86,0.1)',
            border: '1px solid rgba(235,107,86,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--color-danger)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
              <IconAlertCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ marginRight: 'auto' }}>
                <strong>Duplicate check:</strong> Similar expense found on {duplicateExpense.date}.
              </span>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '2px 6px', fontSize: '10px', height: '20px', display: 'flex', alignItems: 'center', minWidth: '42px', justifyContent: 'center' }}
                onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
              >
                {showDuplicateDetails ? 'Hide' : 'Details'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '2px 6px', fontSize: '10px', height: '20px', display: 'flex', alignItems: 'center', background: 'rgba(235,107,86,0.15)', minWidth: '42px', justifyContent: 'center' }}
                onClick={() => {
                  triggerHaptic('light');
                  setIgnoredDuplicateId(duplicateExpense.id);
                }}
              >
                Ignore
              </button>
            </div>

            {showDuplicateDetails && (
              <div className="fade-in" style={{
                padding: '8px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px'
              }}>
                <div>Title: <strong>{duplicateExpense.title}</strong></div>
                <div>Amount: <strong>{currencySymbol}{duplicateExpense.amount.toFixed(2)}</strong></div>
                <div>Date: <strong>{duplicateExpense.date}</strong></div>
                <div>Paid By: <strong>{visibleMembers.find(m => m.id === duplicateExpense.paidBy)?.name || 'Unknown'}</strong></div>
                <div style={{ gridColumn: 'span 2' }}>
                  Split mode: <strong>{duplicateExpense.splitMode}</strong> ({duplicateExpense.splitMemberIds.length} members)
                </div>
              </div>
            )}
          </div>
        )}

        {isAmountFormError && (
          <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
            {formError}
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="expense-title">Expense Title</label>
        <div style={{ position: 'relative' }}>
          <input
            id="expense-title"
            type="text"
            className="input-field"
            placeholder="e.g. Flight Tickets"
            value={title}
            style={getSpeechRecognitionCtor() ? { paddingRight: '40px' } : undefined}
            onChange={(e) => {
              const val = e.target.value;
              setTitle(val);
              if (formError) setFormError('');
              const suggested = autoSuggestCategory(val, categories);
              if (suggested) {
                setCategory(suggested);
              }
            }}
          />
          {getSpeechRecognitionCtor() && (
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              aria-label={isListening ? 'Stop voice input' : 'Fill title by voice'}
              aria-pressed={isListening}
              title={isListening ? 'Listening… tap to stop' : 'Speak expense title'}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                color: isListening ? 'var(--color-danger)' : 'var(--text-muted)',
                animation: isListening ? 'pulse-dot 1.2s ease-in-out infinite' : undefined,
              }}
            >
              <IconMic size={16} />
            </button>
          )}
        </div>
        {isTitleFormError && (
          <p style={{ color: 'var(--color-danger)', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
            {formError}
          </p>
        )}
      </div>

      <fieldset className="form-group">
        <legend className="form-label">Category</legend>
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
      </fieldset>

      <fieldset className="form-group">
        <legend className="form-label">Paid By</legend>
        {payer && !visibleMembers.some((m) => m.id === payer) && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 500, color: 'var(--color-warning-text)', marginBottom: '4px' }}>
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
                style={isSelected ? { borderColor: 'var(--primary-accent)', background: 'rgba(47,111,237,0.07)' } : undefined}
                onClick={() => setPayer(m.id)}
                aria-pressed={isSelected}
              >
                <div className="member-avatar" style={{ background: isSelected ? 'var(--primary-accent)' : avatarColorForName(m.name) }}>
                  {initial(m.name)}
                </div>
                <span className="member-name">{m.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="form-group">
        <label className="form-label" htmlFor="expense-date">Date</label>
        <input
          id="expense-date"
          type="date"
          className="input-field"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Hidden entirely when the trip's Geotag Expenses setting is off and
          there's no pre-existing location to display/remove — this is the
          only thing that can trigger a location-permission prompt, so
          keeping it out of the DOM keeps that prompt from ever firing
          unless the setting is on, advanced search is on, or the user
          explicitly tagged a location. */}
      {(enableGeotagging || enableAdvancedLocationSearch || location) && (
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#17B6A6', display: 'flex', alignItems: 'center' }}><IconMapPin size={15} /></span> Location
            </span>
            {enableGeotagging && !location && !locationLoading && (
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '2px 8px', fontSize: '11.5px', color: '#17B6A6', borderColor: 'rgba(23,182,166,0.3)' }}
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
              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #17B6A6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              Fetching GPS coordinates...
            </div>
          ) : location ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--border-radius-pill)',
                background: 'rgba(23,182,166,0.08)',
                border: '1px solid rgba(23,182,166,0.28)',
                fontSize: '12.5px',
                color: 'var(--text-primary)',
              }}
            >
              <span>📍 {location.placeName || `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}</span>
              <button
                type="button"
                className="dismiss-glyph-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1,
                }}
                onClick={() => setLocation(null)}
                title="Remove location"
                aria-label="Remove location"
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
      )}

      <fieldset className="form-group">
        <legend className="form-label">Split Mode</legend>
        <div className="segmented-control">
          <button type="button" className={splitMode === 'equal' ? 'active' : ''} onClick={() => { triggerHaptic('light'); setSplitMode('equal'); }}>Equal</button>
          <button type="button" className={splitMode === 'custom' ? 'active' : ''} onClick={() => { triggerHaptic('light'); setSplitMode('custom'); }}>Weight</button>
          <button type="button" className={splitMode === 'exact' ? 'active' : ''} onClick={() => { triggerHaptic('light'); setSplitMode('exact'); }}>Exact</button>
          <button type="button" className={splitMode === 'percentage' ? 'active' : ''} onClick={() => { triggerHaptic('light'); setSplitMode('percentage'); }}>Percent</button>
        </div>
      </fieldset>

      <div className="form-group">
        {!showReceiptSection && !receiptImage ? (
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '8px 14px', fontSize: '13px' }}
            onClick={() => setShowReceiptSection(true)}
          >
            + Add Receipt
          </button>
        ) : (
          <>
            <label className="form-label" id="expense-receipt-label">Receipt (optional)</label>
            {receiptImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={receiptImage}
                  alt="Receipt preview"
                  decoding="async"
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
                aria-labelledby="expense-receipt-label"
                onChange={handleReceiptFileChangeLocal}
                disabled={receiptProcessing}
              />
            )}
            {receiptProcessing && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Processing image...</p>
            )}
          </>
        )}
      </div>

      {/* One-time tip pointing new users at the presets below, dismissed
          permanently on first sight or first preset tap. */}
      {showPresetsTip && (
        <div
          className="fade-in"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '8px',
            padding: '8px 10px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'rgba(47,111,237,0.07)',
            border: '1px solid rgba(47,111,237,0.2)',
            fontSize: '12px',
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ flex: 1 }}>
            <strong>Tip:</strong> use a Preset below for common splits — equal, 50/50, or a personal expense — instead of checking members one by one.
          </span>
          <button
            type="button"
            onClick={dismissPresetsTip}
            aria-label="Dismiss tip"
            title="Dismiss"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1, flexShrink: 0 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Smart Split Presets Bar */}
      <div className="form-group" style={{ marginTop: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '2px' }}>Presets:</span>
          <button
            type="button"
            className="split-preset-chip"
            onClick={applyPresetEqualAll}
            title="Split expense equally among all members"
          >
            ⚡ Equal All
          </button>
          <button
            type="button"
            className="split-preset-chip"
            onClick={applyPresetPayerFiftyGroup}
            title="Payer pays 50%, remaining members split 50%"
          >
            ⚖️ 50% Payer / 50% Group
          </button>
          <button
            type="button"
            className="split-preset-chip"
            onClick={applyPresetOnlyPayer}
            title="Payer pays 100% (personal expense)"
          >
            👤 Only Payer
          </button>
        </div>
      </div>

      {/* Checkboxes to select division participants */}
      <div className="form-group" style={{ marginTop: '8px' }}>
        <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Division of Expense</span>
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', textTransform: 'none' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                triggerHaptic('light');
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
                triggerHaptic('light');
                setSelectedSplitMembers({});
                setSplitConfig({});
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        {splitMode !== 'equal' && splitSelectedIds.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{
              fontSize: '12px', fontWeight: 600, marginBottom: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: splitMode === 'custom'
                ? 'var(--text-secondary)'
                : splitConfigMatches ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              <span>
                {splitMode === 'percentage'
                  ? `${splitConfigSum.toFixed(1)}% / 100%`
                  : splitMode === 'exact'
                    ? `${currencySymbol}${splitConfigSum.toFixed(2)} / ${currencySymbol}${(parseFloat(amount) || 0).toFixed(2)}`
                    : `Total weight: ${splitConfigSum.toFixed(2)}`}
              </span>
              {splitConfigMatches && (splitMode === 'exact' || splitMode === 'percentage') && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--color-success)', fontSize: '11px' }}>
                  <IconCheck size={13} className="icon-sm" /> Balanced
                </span>
              )}
            </div>

            {/* Split Proportion Visual Segmented Bar */}
            <div className="split-proportion-bar">
              {splitSelectedIds.map((id) => {
                const member = visibleMembers.find((m) => m.id === id);
                const rawVal = parseFloat(splitConfig[id] || '0') || 0;
                let pct = 0;
                if (splitMode === 'percentage') {
                  pct = rawVal;
                } else if (splitMode === 'exact') {
                  const tot = parseFloat(amount) || 0;
                  pct = tot > 0 ? (rawVal / tot) * 100 : 0;
                } else if (splitMode === 'custom') {
                  pct = splitConfigSum > 0 ? (rawVal / splitConfigSum) * 100 : (100 / splitSelectedIds.length);
                }
                return (
                  <div
                    key={id}
                    className="split-proportion-segment"
                    style={{
                      width: `${Math.max(0, Math.min(100, pct))}%`,
                      backgroundColor: avatarColorForName(member?.name || id),
                    }}
                    title={`${member?.name || id}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>
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
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                  }
                }}
              >
                <div className="member-avatar" style={{ background: avatarColorForName(m.name) }}>
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
                    inputMode="decimal"
                    placeholder={
                      splitMode === 'custom' ? 'e.g. 1' :
                      splitMode === 'exact' ? 'e.g. 200' : 'e.g. 25'
                    }
                    className="input-field member-config-input"
                    aria-label={`${splitMode === 'custom' ? 'Split share' : splitMode === 'exact' ? 'Exact amount' : 'Percentage'} for ${m.name}`}
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
                {isChecked && splitMode === 'equal' && splitSelectedIds.length > 0 && (
                  <span className="member-config-equiv">
                    = {currencySymbol}{((parseFloat(amount) || 0) / splitSelectedIds.length).toFixed(2)}
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

      {/* Receipt & Travel Polaroid Attachment */}
      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            📸 Receipt / Travel Photo
          </span>
          {receiptImage && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setReceiptImage('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              Remove Photo
            </button>
          )}
        </div>

        {receiptImage ? (
          <div
            style={{
              position: 'relative',
              width: '100px',
              height: '100px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid var(--primary-accent)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <img src={receiptImage} alt="Receipt preview" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1.5px dashed var(--border-color)',
              background: 'var(--bg-surface-hover)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptFileChangeLocal}
              style={{ display: 'none' }}
              disabled={receiptProcessing}
            />
            <span>{receiptProcessing ? '⏳ Compressing...' : '＋ Attach Photo / Bill'}</span>
          </label>
        )}
      </div>

      {isGeneralFormError && (
        <p id="expense-form-error" role="alert" aria-live="assertive" style={{ color: 'var(--color-danger)', fontSize: '13px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconAlertCircle size={15} />
          <span>{formError}</span>
        </p>
      )}
      </div>


      <div className="expense-form-actions">
        <button type="submit" className="gradient-btn" style={{ flex: 1 }} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : editingExpense ? 'Update Expense' : 'Add Expense'}
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
