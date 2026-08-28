import { useState, useRef } from 'react';
import type { Member } from '../types';
import { getCurrencySymbol } from '../utils/currency';
import { generateUpiUri, getQrCodeUrl, isValidUpiId, POPULAR_UPI_APPS } from '../utils/upiLinks';
import { IconClose } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface UpiPaymentModalProps {
  fromMember: Member | undefined;
  toMember: Member | undefined;
  amount: number;
  currency: string;
  tripName?: string;
  onClose: () => void;
  onConfirmSettled: () => void;
}

export function UpiPaymentModal({
  fromMember,
  toMember,
  amount,
  currency,
  tripName,
  onClose,
  onConfirmSettled,
}: UpiPaymentModalProps) {
  const [upiId, setUpiId] = useState(toMember?.upiId || '');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true, false, onClose);

  const currencySymbol = getCurrencySymbol(currency);
  const payerName = fromMember?.name || 'Payer';
  const payeeName = toMember?.name || 'Receiver';

  const valid = isValidUpiId(upiId);

  const upiDetails = {
    payeeUpiId: upiId,
    payeeName,
    amount,
    note: tripName ? `Settlement for ${tripName}` : 'Trip Settlement',
    currency: 'INR',
  };

  const handleLaunchApp = (scheme: string) => {
    if (!valid) return;
    triggerHaptic('medium');
    const uri = generateUpiUri(upiDetails, scheme);
    window.location.href = uri;
  };

  const handleCopyUri = () => {
    if (!valid) return;
    triggerHaptic('light');
    const uri = generateUpiUri(upiDetails);
    navigator.clipboard.writeText(uri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-card fade-in"
        style={{ maxWidth: '440px', width: '100%', padding: '22px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1-Tap UPI Settlement
            </span>
            <h3 style={{ fontSize: '18px', margin: '2px 0 0', color: 'var(--text-primary)' }}>
              Pay {payeeName}
            </h3>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 8px', borderRadius: '50%' }}
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Amount Pill */}
        <div style={{
          padding: '14px',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-secondary)',
          border: '1.5px solid var(--border-color)',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Amount to Transfer</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>
            {currencySymbol}{amount.toFixed(2)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            From <strong>{payerName}</strong> to <strong>{payeeName}</strong>
          </span>
        </div>

        {/* Payee UPI ID Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Receiver's UPI ID / VPA
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. mobile@paytm, name@okhdfcbank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value.trim())}
            style={{
              borderColor: upiId && !valid ? 'var(--color-danger)' : undefined,
            }}
          />
          {upiId && !valid && (
            <p style={{ fontSize: '11px', color: 'var(--color-danger)', margin: '4px 0 0' }}>
              Please enter a valid UPI ID (e.g. username@bank)
            </p>
          )}
        </div>

        {/* App Launch Options */}
        {valid ? (
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Choose Payment App
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {POPULAR_UPI_APPS.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className="secondary-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    justifyContent: 'flex-start',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                  onClick={() => handleLaunchApp(app.scheme)}
                >
                  <span style={{ fontSize: '15px' }}>{app.emoji}</span>
                  <span>{app.name}</span>
                </button>
              ))}
            </div>

            {/* Toggle QR Code View */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setShowQr(!showQr)}
              >
                {showQr ? 'Hide QR' : '📷 Show Dynamic QR'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={handleCopyUri}
              >
                {copied ? '✓ Copied Link' : '📋 Copy UPI URI'}
              </button>
            </div>

            {showQr && (
              <div className="fade-in" style={{
                textAlign: 'center',
                padding: '14px',
                background: '#ffffff',
                borderRadius: 'var(--border-radius-sm)',
                marginBottom: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <img
                  src={getQrCodeUrl(generateUpiUri(upiDetails), 200)}
                  alt="UPI QR Code"
                  decoding="async"
                  style={{ width: '180px', height: '180px', display: 'inline-block' }}
                />
                <p style={{ fontSize: '11px', color: '#1c2a38', fontWeight: 600, margin: '6px 0 0' }}>
                  Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            Enter receiver's UPI ID above to unlock 1-tap app payment deep links and dynamic QR code.
          </div>
        )}

        {/* Final Confirmation */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            style={{ flex: 1.5 }}
            onClick={() => {
              triggerHaptic('success');
              onConfirmSettled();
            }}
          >
            ✓ Mark as Settled
          </button>
        </div>
      </div>
    </div>
  );
}
