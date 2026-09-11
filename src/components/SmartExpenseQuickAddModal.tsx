import { useState, useEffect, useRef, useMemo } from 'react';
import type { Category, Expense, Member } from '../types';
import { parseQuickExpense } from '../utils/expenseQuickParser';
import { triggerHaptic } from '../utils/haptics';
import { formatAmount } from '../utils/currency';
import { CategoryIcon } from './CategoryIcon';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { detectDuplicateExpense } from '../utils/duplicateExpenseDetector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  autoListen?: boolean;
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
  autoListen = false,
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
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isVoiceGenerated, setIsVoiceGenerated] = useState(false);
  const [voiceLang, setVoiceLang] = useState<string>(() => {
    const saved = localStorage.getItem('trip_tracker_voice_lang');
    if (saved) return saved;
    if (baseCurrency === 'INR') return 'en-IN';
    const userLang = navigator.language || 'en-IN';
    return userLang.startsWith('en') ? userLang : 'en-IN';
  });

  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  // Initialize browser Web Speech API
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      setSpeechSupported(true);
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = voiceLang;

      rec.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0]?.transcript || '')
          .join('');
        setInputText(text);
        setIsVoiceGenerated(true);
      };

      rec.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
        if (err.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions or type below.');
        } else if (err.error === 'no-speech') {
          setErrorMessage('No speech detected. Tap the mic to try again or type below.');
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Update speech recognition language when voiceLang changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = voiceLang;
    }
    localStorage.setItem('trip_tracker_voice_lang', voiceLang);
  }, [voiceLang]);

  const cancelAutoSaveCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownSeconds(null);
  };

  const startAutoSaveCountdown = () => {
    cancelAutoSaveCountdown();
    setCountdownSeconds(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Trigger speech recognition on modal open if autoListen requested
  useEffect(() => {
    if (isOpen) {
      setInputText('');
      setErrorMessage('');
      cancelAutoSaveCountdown();
      setIsVoiceGenerated(false);

      if (autoListen) {
        const timer = setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsRecording(true);
              setIsVoiceGenerated(true);
              triggerHaptic('medium');
            } catch (e) {
              console.warn('Could not auto-start speech recognition:', e);
            }
          }
        }, 120);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      cancelAutoSaveCountdown();
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch {}
        setIsRecording(false);
      }
    }
  }, [isOpen, autoListen]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    triggerHaptic('medium');
    cancelAutoSaveCountdown();

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setIsVoiceGenerated(true);
        setErrorMessage('');
      } catch (e) {
        console.warn('Could not start speech recognition:', e);
      }
    }
  };

  const parsed = parseQuickExpense(inputText, categories, historicalExpenses, visibleMembers);

  const duplicateMatch = useMemo(() => {
    if (!parsed || !parsed.amount || parsed.amount <= 0) return null;
    return detectDuplicateExpense(
      {
        amount: parsed.amount,
        currency: parsed.currency || baseCurrency,
        title: parsed.title,
        date: parsed.date || new Date().toISOString().slice(0, 10),
        categoryId: parsed.categoryId,
        paidById: parsed.paidById || visibleMembers[0]?.id,
      },
      historicalExpenses,
      categories,
      visibleMembers
    );
  }, [parsed, historicalExpenses, categories, visibleMembers, baseCurrency]);

  // Once voice recognition completes and a valid amount is detected, start 3-second auto-save countdown
  // Pauses automatically if a candidate duplicate is detected to prevent accidental double-logging
  useEffect(() => {
    if (
      !isRecording &&
      isVoiceGenerated &&
      parsed?.amount &&
      parsed.amount > 0 &&
      countdownSeconds === null &&
      !isSubmitting &&
      !duplicateMatch
    ) {
      startAutoSaveCountdown();
    }
  }, [isRecording, isVoiceGenerated, parsed?.amount, isSubmitting, countdownSeconds, duplicateMatch]);

  // Execute auto-save on countdown reach 0
  useEffect(() => {
    if (countdownSeconds === 0) {
      setCountdownSeconds(null);
      handle1TapSave();
    }
  }, [countdownSeconds]);

  const handle1TapSave = async () => {
    cancelAutoSaveCountdown();
    if (!parsed || !parsed.amount || parsed.amount <= 0) {
      setErrorMessage('Please specify a valid expense amount.');
      return;
    }

    const payer = parsed.paidById || visibleMembers[0]?.id;
    if (!payer) {
      setErrorMessage('No valid trip member found for payer.');
      return;
    }

    const splitMembers =
      parsed.splitMemberIds && parsed.splitMemberIds.length > 0
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
    cancelAutoSaveCountdown();
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
        {/* Header */}
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
                cancelAutoSaveCountdown();
                triggerHaptic('light');
                onClose();
              }}
              aria-label="Go back"
              title="Go back"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎙️</span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Voice Quick-Add
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Speak or type in natural language
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {speechSupported && (
              <select
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value)}
                style={{
                  padding: '5px 8px',
                  fontSize: '11.5px',
                  borderRadius: '8px',
                  background: 'var(--bg-subtle, rgba(255,255,255,0.06))',
                  color: 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                  cursor: 'pointer',
                  fontWeight: 600,
                  outline: 'none',
                }}
                title="Voice recognition dialect/accent"
                aria-label="Voice recognition dialect/accent"
              >
                <option value="en-IN">🇮🇳 English (India)</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="en-GB">🇬🇧 English (UK)</option>
                <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
              </select>
            )}
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
                cancelAutoSaveCountdown();
                triggerHaptic('light');
                onClose();
              }}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Pulsing Audio Waveform Bar during Active Recording */}
        {isRecording && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 16px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(249, 115, 22, 0.08))',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px',
              marginBottom: '14px',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px' }}>
              <span className="voice-wave-bar bar-1" />
              <span className="voice-wave-bar bar-2" />
              <span className="voice-wave-bar bar-3" />
              <span className="voice-wave-bar bar-4" />
              <span className="voice-wave-bar bar-5" />
            </div>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ animation: 'pulse 1.2s infinite', display: 'inline-block' }}>🔴</span>
              <span>Listening... Speak naturally (e.g. &ldquo;Dinner 1200 paid by Rahul&rdquo;)</span>
            </div>
          </div>
        )}

        {/* 3-Second Hands-Free Auto-Save Countdown Banner */}
        {countdownSeconds !== null && countdownSeconds > 0 && parsed?.amount && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669' }}>
                  Auto-saving in {countdownSeconds}s...
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Hands-free quick save active
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={cancelAutoSaveCountdown}
                style={{ padding: '4px 8px', fontSize: '11.5px', borderRadius: '7px', fontWeight: 600 }}
              >
                ⏸️ Pause / Edit
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handle1TapSave}
                style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '7px', fontWeight: 700 }}
              >
                Save Now ⚡
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Warning Alert Banner (Pauses Auto-Save) */}
        {duplicateMatch && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: duplicateMatch.confidence === 'high' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${duplicateMatch.confidence === 'high' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: duplicateMatch.confidence === 'high' ? 'var(--color-danger, #ef4444)' : '#d97706' }}>
                Possible Duplicate Found (Auto-Save Paused)
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {duplicateMatch.reason}
              </div>
            </div>
          </div>
        )}

        {/* Input Bar with Voice Microphone Button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <input
            ref={inputRef}
            type="text"
            className="input-field"
            placeholder="e.g. Paid 200 for cab by upi by Rahul, or 1450 dinner"
            value={inputText}
            onChange={(e) => {
              cancelAutoSaveCountdown();
              setInputText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && parsed?.amount) {
                e.preventDefault();
                handle1TapSave();
              }
            }}
            style={{
              paddingRight: speechSupported ? '44px' : '12px',
              fontSize: '14px',
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
                background: isRecording ? 'var(--color-danger, #ef4444)' : 'rgba(239, 68, 68, 0.12)',
                color: isRecording ? '#fff' : 'var(--color-danger, #ef4444)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}
        </div>

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
                Parsed Preview
              </span>
              <span style={{ fontSize: '11px', color: parsed.amount ? 'var(--color-success, #10b981)' : 'var(--text-muted)' }}>
                {parsed.amount ? '✓ Ready to Save' : '⚠️ Need Amount'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
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
              {parsed.paymentMode && (
                <span className="member-badge" style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
                  💳 {parsed.paymentMode}
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
              cancelAutoSaveCountdown();
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
