import { useState, useEffect, useRef } from 'react';
import type { Category, Expense, Member } from '../types';
import { parseQuickExpense } from '../utils/expenseQuickParser';
import { triggerHaptic } from '../utils/haptics';
import { formatAmount } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  historicalExpenses: Expense[];
  visibleMembers: Member[];
  baseCurrency: string;
  onSaveQuickExpense: (expense: {
    title: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    paidBy: string;
    splitMode: 'equal';
    splitMemberIds: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  onOpenFullFormWithTemplate?: (template: {
    title: string;
    amount: number;
    category: string;
    paidBy?: string;
    date?: string;
    splitMemberIds?: string[];
  }) => void;
}

export function SmartExpenseQuickAddModal({
  isOpen,
  onClose,
  categories,
  historicalExpenses,
  visibleMembers,
  baseCurrency,
  onSaveQuickExpense,
  onOpenFullFormWithTemplate,
}: Props) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setSpeechSupported(true);
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0]?.transcript || '')
          .join('');
        setInputText(text);
      };

      rec.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setErrorMessage('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    }
  }, [isOpen]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    triggerHaptic('medium');
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setErrorMessage('');
      } catch (e) {
        console.warn('Could not start speech recognition:', e);
      }
    }
  };

  const parsed = parseQuickExpense(inputText, categories, historicalExpenses, visibleMembers);

  const handle1TapSave = async () => {
    if (!parsed || !parsed.amount || parsed.amount <= 0) {
      setErrorMessage('Please specify a valid expense amount.');
      return;
    }

    const payer = parsed.paidById || visibleMembers[0]?.id;
    if (!payer) {
      setErrorMessage('No valid trip member found for payer.');
      return;
    }

    const splitMembers = parsed.splitMemberIds && parsed.splitMemberIds.length > 0
      ? parsed.splitMemberIds
      : visibleMembers.map((m) => m.id);

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await onSaveQuickExpense({
        title: parsed.title || 'Quick Expense',
        amount: parsed.amount,
        currency: parsed.currency || baseCurrency,
        category: parsed.categoryId || categories[0]?.id || 'cat-misc',
        date: parsed.date || new Date().toISOString().slice(0, 10),
        paidBy: payer,
        splitMode: 'equal',
        splitMemberIds: splitMembers,
      });

      if (res.success) {
        triggerHaptic('success');
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to save quick expense.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomizeInFullForm = () => {
    if (!parsed) return;
    triggerHaptic('light');
    onClose();
    if (onOpenFullFormWithTemplate) {
      onOpenFullFormWithTemplate({
        title: parsed.title,
        amount: parsed.amount || 0,
        category: parsed.categoryId || categories[0]?.id || 'cat-misc',
        paidBy: parsed.paidById || undefined,
        date: parsed.date,
        splitMemberIds: parsed.splitMemberIds,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '92%',
          padding: '24px',
          borderRadius: 'var(--border-radius-lg, 20px)',
          background: 'var(--card-bg, var(--bg-surface))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <button
              type="button"
              className="secondary-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12.5px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              aria-label="Go back"
              title="Go back"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>⚡</span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Smart Quick-Add
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Type or speak in natural language
              </p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{
              padding: '6px 10px',
              fontSize: '13px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Input Bar with Voice Button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <input
            ref={inputRef}
            type="text"
            className="input-field"
            placeholder="e.g. Dinner 1200 food paid by Rahul with Priya"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && parsed?.amount) {
                e.preventDefault();
                handle1TapSave();
              }
            }}
            style={{
              paddingRight: speechSupported ? '44px' : '12px',
              fontSize: '14.5px',
            }}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleRecording}
              aria-label={isRecording ? 'Stop listening' : 'Start voice recording'}
              title={isRecording ? 'Listening...' : 'Voice Quick-Add'}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: isRecording ? 'var(--color-danger, #ef4444)' : 'transparent',
                color: isRecording ? '#fff' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}
        </div>

        {isRecording && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            marginBottom: '14px',
            fontSize: '12.5px',
            color: 'var(--color-danger, #ef4444)',
          }}>
            <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>🎙️</span>
            <span>Listening... speak your expense clearly</span>
          </div>
        )}

        {/* Parsed Result Preview Card */}
        {parsed && (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Parsed Preview
              </span>
              <span style={{ fontSize: '11px', color: parsed.amount ? 'var(--color-success, #10b981)' : 'var(--text-muted)' }}>
                {parsed.amount ? '✓ Ready to Save' : '⚠️ Need Amount'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {parsed.title}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-accent)' }}>
                {parsed.amount ? formatAmount(parsed.amount, parsed.currency || baseCurrency) : '—'}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {parsed.categoryName && (
                <span className="member-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(15, 169, 143, 0.12)', color: 'var(--primary-accent)', border: '1px solid rgba(15, 169, 143, 0.25)' }}>
                  <CategoryIcon categoryId={parsed.categoryId || ''} size={12} />
                  {parsed.categoryName}
                </span>
              )}
              {parsed.paidByName && (
                <span className="member-badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                  👤 Paid by {parsed.paidByName}
                </span>
              )}
              {parsed.splitMemberIds && parsed.splitMemberIds.length > 0 && (
                <span className="member-badge" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                  👥 {parsed.splitMemberIds.length} members
                </span>
              )}
              {parsed.date && (
                <span className="member-badge" style={{ color: 'var(--text-muted)' }}>
                  📅 {parsed.date}
                </span>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div style={{ color: 'var(--color-danger, #ef4444)', fontSize: '12px', marginBottom: '12px' }}>
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="primary-btn"
            style={{ flex: 1, padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}
            disabled={!parsed?.amount || isSubmitting}
            onClick={handle1TapSave}
          >
            {isSubmitting ? 'Saving...' : '⚡ 1-Tap Save'}
          </button>
          {onOpenFullFormWithTemplate && (
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '10px 14px', fontSize: '13px' }}
              onClick={handleCustomizeInFullForm}
            >
              Customize...
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '10px 14px', fontSize: '13px' }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
