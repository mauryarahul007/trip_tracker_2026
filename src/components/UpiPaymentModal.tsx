import { useState, useMemo } from 'react';
import type { Member, MemberPaymentHandles } from '../types';
import { getCurrencySymbol, formatMoneyNumber } from '../utils/currency';
import { generateUpiUri, isValidUpiId, POPULAR_UPI_APPS } from '../utils/upiLinks';
import {
  PAYMENT_RAILS,
  type PaymentRailType,
  cleanPaymentHandle,
  buildPaymentLink,
  saveMemberPaymentHandles,
  getSavedMemberPaymentHandles,
} from '../utils/paymentRails';
import { IconClose } from './Icons';
import { triggerHaptic } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useDragToDismiss } from '../hooks/useDragToDismiss';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { ConfettiBurst } from './ConfettiBurst';
import { QrCodeView } from './QrCodeView';
import { useTripStore } from '../store/tripStore';
import { useDataSaverEnabled } from '../hooks/useDataSaverEnabled';

const CELEBRATION_MS = 800;

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
  const globalRailsEnabled = useTripStore((s) => s.isFeatureEnabled('enableGlobalPaymentRails'));
  const isDataSaverFlagEnabled = useTripStore((s) => s.isFeatureEnabled('enableDataSaverMode'));
  const dataSaverPref = useDataSaverEnabled();
  const dataSaverActive = isDataSaverFlagEnabled && dataSaverPref;
  const motionPolish = useTripStore((s) => s.isFeatureEnabled('enableMotionPolish'));

  // Load initial handles from member & local storage
  const savedHandles = toMember ? getSavedMemberPaymentHandles(toMember.id) : {};
  const [handles, setHandles] = useState<MemberPaymentHandles>({
    upiId: toMember?.upiId || savedHandles.upiId || toMember?.paymentHandles?.upiId || '',
    revolutHandle: savedHandles.revolutHandle || toMember?.paymentHandles?.revolutHandle || '',
    venmoHandle: savedHandles.venmoHandle || toMember?.paymentHandles?.venmoHandle || '',
    cashAppHandle: savedHandles.cashAppHandle || toMember?.paymentHandles?.cashAppHandle || '',
    paypalHandle: savedHandles.paypalHandle || toMember?.paymentHandles?.paypalHandle || '',
    iban: savedHandles.iban || toMember?.paymentHandles?.iban || '',
  });

  // Determine initial active rail based on currency and available handles
  const initialRail = useMemo<PaymentRailType>(() => {
    if (!globalRailsEnabled) return 'upi';
    const upperCurr = (currency || 'INR').toUpperCase();
    if (upperCurr === 'INR') return 'upi';
    if (upperCurr === 'EUR' || upperCurr === 'GBP' || upperCurr === 'CHF') {
      return handles.revolutHandle ? 'revolut' : handles.paypalHandle ? 'paypal' : 'revolut';
    }
    if (upperCurr === 'USD') {
      return handles.venmoHandle ? 'venmo' : handles.cashAppHandle ? 'cashapp' : 'venmo';
    }
    // Any other currency: check configured handles
    if (handles.paypalHandle) return 'paypal';
    if (handles.revolutHandle) return 'revolut';
    if (handles.iban) return 'iban';
    return 'upi';
  }, [globalRailsEnabled, currency, handles]);

  const [activeRail, setActiveRail] = useState<PaymentRailType>(initialRail);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const { ref: modalRef, handlers: dragHandlers } = useDragToDismiss<HTMLDivElement>(onClose, { enabled: motionPolish });
  useFocusTrap(modalRef, true, false, onClose);

  useHistoryBack(showQr, () => setShowQr(false));
  useHistoryBack(!showQr, onClose);

  useEscapeKey(showQr, () => setShowQr(false));
  useEscapeKey(!showQr, onClose);

  const currencySymbol = getCurrencySymbol(currency);
  const payerName = fromMember?.name || 'Payer';
  const payeeName = toMember?.name || 'Receiver';
  const upperCurrency = (currency || 'INR').toUpperCase();

  // Active rail value and validation
  const currentHandle = useMemo(() => {
    switch (activeRail) {
      case 'upi': return handles.upiId || '';
      case 'revolut': return handles.revolutHandle || '';
      case 'venmo': return handles.venmoHandle || '';
      case 'cashapp': return handles.cashAppHandle || '';
      case 'paypal': return handles.paypalHandle || '';
      case 'iban': return handles.iban || '';
    }
  }, [activeRail, handles]);

  const isCurrentHandleValid = useMemo(() => {
    const val = currentHandle.trim();
    if (!val) return false;
    if (activeRail === 'upi') return isValidUpiId(val);
    if (activeRail === 'iban') return val.length >= 8;
    return val.length >= 2;
  }, [activeRail, currentHandle]);

  const handleValueChange = (newVal: string) => {
    const cleaned = cleanPaymentHandle(activeRail, newVal);
    const updated: MemberPaymentHandles = { ...handles };
    switch (activeRail) {
      case 'upi': updated.upiId = cleaned; break;
      case 'revolut': updated.revolutHandle = cleaned; break;
      case 'venmo': updated.venmoHandle = cleaned; break;
      case 'cashapp': updated.cashAppHandle = cleaned; break;
      case 'paypal': updated.paypalHandle = cleaned; break;
      case 'iban': updated.iban = cleaned; break;
    }
    setHandles(updated);
    if (toMember?.id) {
      saveMemberPaymentHandles(toMember.id, updated);
    }
  };

  const paymentLinkInfo = useMemo(() => {
    if (!isCurrentHandleValid) return null;
    return buildPaymentLink({
      rail: activeRail,
      handle: currentHandle,
      payeeName,
      amount,
      currency: upperCurrency,
      note: tripName ? `Settlement for ${tripName}` : 'Trip Settlement',
    });
  }, [activeRail, currentHandle, isCurrentHandleValid, payeeName, amount, upperCurrency, tripName]);

  const upiDetails = {
    payeeUpiId: handles.upiId || '',
    payeeName,
    amount,
    note: tripName ? `Settlement for ${tripName}` : 'Trip Settlement',
    currency: 'INR',
  };

  const handleLaunchApp = (scheme: string) => {
    if (!isCurrentHandleValid) return;
    triggerHaptic('medium');
    const uri = generateUpiUri(upiDetails, scheme);
    window.location.href = uri;
  };

  const handleLaunchPaymentLink = () => {
    if (!paymentLinkInfo) return;
    triggerHaptic('medium');
    if (paymentLinkInfo.isDeepLink) {
      window.location.href = paymentLinkInfo.url;
    } else {
      window.open(paymentLinkInfo.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyLink = () => {
    if (!paymentLinkInfo) return;
    triggerHaptic('light');
    const textToCopy = paymentLinkInfo.copyText || paymentLinkInfo.url;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleCopyHandle = () => {
    if (!currentHandle) return;
    triggerHaptic('light');
    navigator.clipboard.writeText(currentHandle).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const availableRailKeys: PaymentRailType[] = globalRailsEnabled
    ? ['upi', 'revolut', 'venmo', 'cashapp', 'paypal', 'iban']
    : ['upi'];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal-card fade-in"
        style={{ maxWidth: '460px', width: '100%', padding: '22px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-settle-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-drag-handle" aria-hidden="true" {...dragHandlers} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {globalRailsEnabled ? '1-Tap Settlement Rails' : '1-Tap UPI Settlement'}
            </span>
            <h3 id="payment-settle-title" style={{ fontSize: '18px', margin: '2px 0 0', color: 'var(--text-primary)' }}>
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
          padding: '12px 14px',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-secondary)',
          border: '1.5px solid var(--border-color)',
          textAlign: 'center',
          marginBottom: '14px',
        }}>
          <span className="u-note">Amount to Transfer</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>
            {currencySymbol}{formatMoneyNumber(amount, currencySymbol)}
          </div>
          <span className="u-hint">
            From <strong>{payerName}</strong> to <strong>{payeeName}</strong>
          </span>
        </div>

        {/* Payment Rails Segment Bar (When Global Rails is ON) */}
        {globalRailsEnabled && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Choose Payment Rail
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
              }}
            >
              {availableRailKeys.map((key) => {
                const rail = PAYMENT_RAILS[key];
                const isActive = activeRail === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveRail(key);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      border: isActive
                        ? '1.5px solid var(--primary-accent)'
                        : '1px solid var(--border-color)',
                      background: isActive ? 'var(--primary-subtle, rgba(15, 111, 99, 0.12))' : 'var(--bg-secondary)',
                      color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{rail.emoji}</span>
                    <span>{rail.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payee Handle / Address Input */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {activeRail === 'upi' && "Receiver's UPI ID / VPA"}
              {activeRail === 'revolut' && "Receiver's Revolut Tag"}
              {activeRail === 'venmo' && "Receiver's Venmo Username"}
              {activeRail === 'cashapp' && "Receiver's $Cashtag"}
              {activeRail === 'paypal' && "Receiver's PayPal.me Username"}
              {activeRail === 'iban' && "Receiver's Bank IBAN / Account"}
            </label>
            {isCurrentHandleValid && (
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '9999px' }}
                onClick={handleCopyHandle}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            )}
          </div>
          <input
            type="text"
            className="input-field"
            placeholder={
              activeRail === 'upi' ? 'e.g. mobile@paytm, name@okhdfcbank' :
              activeRail === 'revolut' ? 'e.g. alex or revolut.me/alex' :
              activeRail === 'venmo' ? 'e.g. alex or @alex' :
              activeRail === 'cashapp' ? 'e.g. $alex or alex' :
              activeRail === 'paypal' ? 'e.g. alex or paypal.me/alex' :
              'e.g. GB29NWBK60161331926819 or Account No.'
            }
            value={currentHandle}
            onChange={(e) => handleValueChange(e.target.value)}
            style={{
              borderColor: currentHandle && !isCurrentHandleValid ? 'var(--color-danger)' : undefined,
              marginBottom: 0,
            }}
          />
          {currentHandle && !isCurrentHandleValid && (
            <p style={{ fontSize: '11px', color: 'var(--color-danger)', margin: '4px 0 0' }}>
              {activeRail === 'upi' ? 'Please enter a valid UPI ID (e.g. username@bank)' : 'Please enter a valid handle or details'}
            </p>
          )}
        </div>

        {/* Rail Specific Details & Actions */}
        {activeRail === 'upi' ? (
          <div>
            {/* NPCI / Bank Security Note */}
            <div
              style={{
                padding: '9px 11px',
                borderRadius: '10px',
                background: 'rgba(255, 122, 0, 0.08)',
                border: '1px solid rgba(255, 122, 0, 0.2)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
                marginBottom: '12px',
              }}
            >
              💡 <strong>Tip for P2P UPI:</strong> If your bank app blocks browser auto-fills, use <strong>Copy</strong> or <strong>Scan Dynamic QR</strong> for instant 100% success.
            </div>

            {isCurrentHandleValid ? (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Choose Payment App
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
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

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
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
                    onClick={() => {
                      triggerHaptic('light');
                      const uri = generateUpiUri(upiDetails);
                      navigator.clipboard.writeText(uri).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                  >
                    {copied ? '✓ Copied Link' : '📋 Copy UPI URI'}
                  </button>
                </div>

                {showQr && (
                  <div className="fade-in" style={{
                    textAlign: 'center',
                    padding: '14px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    marginBottom: '14px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <QrCodeView
                      value={generateUpiUri(upiDetails)}
                      size={180}
                      alt="UPI Payment QR Code"
                    />
                    <p style={{ fontSize: '11px', color: '#1c2a38', fontWeight: 600, margin: '8px 0 0' }}>
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
                marginBottom: '14px'
              }}>
                Enter receiver's UPI ID above to unlock 1-tap app payment deep links and dynamic QR code.
              </div>
            )}
          </div>
        ) : (
          /* Global Rails View: Revolut, Venmo, Cash App, PayPal, IBAN */
          <div>
            {isCurrentHandleValid && paymentLinkInfo ? (
              <div>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '14px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>{PAYMENT_RAILS[activeRail].emoji}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{PAYMENT_RAILS[activeRail].name}</strong>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                    {activeRail === 'revolut' && `Prefilled Revolut Me payment for ${currencySymbol}${formatMoneyNumber(amount, currencySymbol)} directly to @${cleanPaymentHandle('revolut', currentHandle)}.`}
                    {activeRail === 'venmo' && `Direct mobile deep link opens Venmo ready to pay ${currencySymbol}${formatMoneyNumber(amount, currencySymbol)} to @${cleanPaymentHandle('venmo', currentHandle)}.`}
                    {activeRail === 'cashapp' && `Direct payment link for Cash App $${cleanPaymentHandle('cashapp', currentHandle)} with ${currencySymbol}${formatMoneyNumber(amount, currencySymbol)}.`}
                    {activeRail === 'paypal' && `Global PayPal.me settlement link for ${currencySymbol}${formatMoneyNumber(amount, currencySymbol)} to ${cleanPaymentHandle('paypal', currentHandle)}.`}
                    {activeRail === 'iban' && 'Copy verified bank wire transfer instructions below to execute payment in your banking app.'}
                  </p>
                </div>

                {activeRail === 'iban' && paymentLinkInfo.copyText && (
                  <pre style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-family-mono)',
                    background: 'var(--bg-primary)',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginBottom: '12px',
                  }}>
                    {paymentLinkInfo.copyText}
                  </pre>
                )}

                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {activeRail !== 'iban' ? (
                    <>
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ flex: 1.5, padding: '10px', fontSize: '13px' }}
                        onClick={handleLaunchPaymentLink}
                      >
                        🚀 Open {PAYMENT_RAILS[activeRail].name}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                        onClick={handleCopyLink}
                      >
                        {copiedLink ? '✓ Copied Link' : '📋 Copy Link'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                      onClick={handleCopyLink}
                    >
                      {copiedLink ? '✓ Wire Instructions Copied' : '📋 Copy Full Wire Details'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: '14px',
              }}>
                Enter {payeeName}'s {PAYMENT_RAILS[activeRail].name} handle above to generate the payment link.
              </div>
            )}
          </div>
        )}

        {/* Security / Non-Custodial Disclaimer */}
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted, var(--text-secondary))',
          lineHeight: '1.4',
          marginBottom: '14px',
          padding: '8px 10px',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.04))',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
        }}>
          🛡️ <strong>Non-Custodial Notice:</strong> Trip Tracker does not process payments or touch funds. Settlements occur directly via your chosen bank or payment app.
        </div>

        {/* Final Confirmation Bar */}
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
            disabled={celebrating}
            onClick={() => {
              if (celebrating) return;
              triggerHaptic('success');
              setCelebrating(true);
              setTimeout(onConfirmSettled, CELEBRATION_MS);
            }}
          >
            {celebrating ? '✓ Settled!' : '✓ Mark as Settled'}
          </button>
        </div>
        <ConfettiBurst active={celebrating && !dataSaverActive} />
      </div>
    </div>
  );
}

export const PaymentSettlementModal = UpiPaymentModal;
