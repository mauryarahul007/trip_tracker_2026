import { useState, useRef } from 'react';
import type { ItemizedReceiptConfig } from '../types';
import {
  parseScannedReceipt,
  scanReceiptImage,
  toItemizedConfig,
  ReceiptOcrError,
  type ParsedReceiptData,
} from '../utils/receiptOcr';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { formatAmount } from '../utils/currency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  defaultMemberIds: string[];
  onApplyReceipt: (config: ItemizedReceiptConfig, detectedTotal: number, receiptBase64?: string) => void;
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  currencySymbol,
  defaultMemberIds,
  onApplyReceipt,
}: Props) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const [manualTextMode, setManualTextMode] = useState(false);
  const [rawText, setRawText] = useState('');
  const [scanError, setScanError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    resetFileInput();
    if (!file) return;

    triggerHaptic('medium');
    setIsScanning(true);
    setScanError('');
    setParsedData(null);

    try {
      const { parsed, previewBase64 } = await scanReceiptImage(file, defaultMemberIds, {
        onPreview: setImagePreview,
      });
      setImagePreview(previewBase64);
      setParsedData(parsed);
      triggerHaptic('success');
    } catch (err) {
      triggerHaptic('warning');
      const message =
        err instanceof ReceiptOcrError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't read this receipt. Try a clearer photo, or paste the text.";
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = () => {
    if (!parsedData) return;
    triggerHaptic('success');
    const config = toItemizedConfig(parsedData);
    onApplyReceipt(config, parsedData.total, imagePreview || undefined);
    onClose();
  };

  const handleParseManualText = () => {
    if (!rawText.trim()) return;
    triggerHaptic('medium');
    setScanError('');
    try {
      const parsed = parseScannedReceipt(rawText, defaultMemberIds);
      setParsedData(parsed);
    } catch (err) {
      triggerHaptic('warning');
      setScanError(
        err instanceof ReceiptOcrError
          ? err.message
          : "We couldn't find prices in that text. Check the lines and try again."
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, rgba(15,23,42,0.03))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📷</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Receipt OCR Scanner</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Auto-detect items, tax, tip & total from receipt bill
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {scanError && !isScanning && (
            <div
              role="alert"
              style={{
                marginBottom: parsedData ? '12px' : '16px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              {scanError}
            </div>
          )}

          {scanError && imagePreview && !parsedData && !isScanning && (
            <div style={{ marginBottom: '16px', maxWidth: '240px', margin: '0 auto 16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <img src={imagePreview} alt="Receipt that could not be read" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          {!parsedData && !isScanning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <div
                style={{
                  padding: '32px 16px',
                  border: '2px dashed var(--border-color)',
                  borderRadius: '16px',
                  background: 'rgba(15, 169, 143, 0.03)',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleImageSelected}
                />
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🧾</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Take Photo or Upload Receipt
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '320px', margin: '4px auto 14px' }}>
                  Works on restaurant bills, grocery slips, and bar tabs. Pre-processed on-device for high contrast.
                </div>
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Snap / Choose Photo
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              </div>

              {/* Paste Raw Text Fallback */}
              {!manualTextMode ? (
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '8px', fontSize: '12px' }}
                  onClick={() => setManualTextMode(true)}
                >
                  📝 Paste Receipt Text Manually
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                  <label className="form-label" style={{ margin: 0 }}>Paste receipt lines with prices:</label>
                  <textarea
                    rows={4}
                    className="input-field"
                    style={{ fontSize: '12.5px', resize: 'vertical' }}
                    placeholder={`Pasta 320.00\nPizza 450.00\nTax 38.50\nTotal 808.50`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <button
                    type="button"
                    className="gradient-btn"
                    style={{ padding: '8px', fontSize: '12.5px' }}
                    disabled={!rawText.trim()}
                    onClick={handleParseManualText}
                  >
                    Parse Text to Items
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scanning Animation */}
          {isScanning && (
            <div style={{ textAlign: 'center', padding: '30px 16px' }}>
              <div style={{ fontSize: '36px', animation: 'spin 2s linear infinite', display: 'inline-block', marginBottom: '12px' }}>
                🔍
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Reading this receipt…</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                On-device OCR — extracting items, tax, tip, and total from the photo
              </div>
              {imagePreview && (
                <div style={{ marginTop: '16px', maxWidth: '240px', margin: '16px auto 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={imagePreview} alt="Receipt Scan" style={{ width: '100%', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              )}
            </div>
          )}

          {/* Detected Items Review */}
          {parsedData && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success, #10b981)' }}>
                    {parsedData.items.length > 0
                      ? `✓ ${parsedData.items.length} item${parsedData.items.length === 1 ? '' : 's'} detected`
                      : '✓ Total detected'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {parsedData.items.length > 0
                      ? 'Review detected items before applying to split'
                      : 'No line items found — total was read. Add items manually after applying if needed.'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-accent)' }}>
                    {formatAmount(parsedData.total, currencySymbol)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Grand Total</div>
                </div>
              </div>

              {/* Detected Line Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Line Items:</div>
                {parsedData.items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface, #fff)',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                    }}
                  >
                    <input
                      type="text"
                      value={item.name}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        flex: 1,
                      }}
                      onChange={(e) => {
                        const next = [...parsedData.items];
                        next[idx].name = e.target.value;
                        setParsedData({ ...parsedData, items: next });
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{currencySymbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        style={{
                          width: '70px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '13px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '2px 6px',
                        }}
                        onChange={(e) => {
                          const next = [...parsedData.items];
                          next[idx].amount = parseFloat(e.target.value) || 0;
                          const sum = next.reduce((s, i) => s + i.amount, 0);
                          setParsedData({
                            ...parsedData,
                            items: next,
                            subtotal: sum,
                            total: sum + parsedData.tax + parsedData.tip - parsedData.discount,
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tax / Tip / Discount Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px', margin: 0 }}>Tax / GST</label>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {formatAmount(parsedData.tax, currencySymbol)}
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px', margin: 0 }}>Service Tip</label>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {formatAmount(parsedData.tip, currencySymbol)}
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '10.5px', margin: 0 }}>Discount</label>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-danger, #ef4444)' }}>
                    {parsedData.discount > 0 ? `-${formatAmount(parsedData.discount, currencySymbol)}` : '—'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                  onClick={handleApply}
                >
                  ✓ Apply {parsedData.items.length} Items to Split Form
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '10px 14px', fontSize: '12px' }}
                  onClick={() => {
                    setParsedData(null);
                    setScanError('');
                    setImagePreview(null);
                  }}
                >
                  Rescan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
