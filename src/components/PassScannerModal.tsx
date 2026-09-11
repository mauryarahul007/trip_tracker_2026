import React, { useEffect, useState } from 'react';
import type { TravelPass } from '../types';
import { QrCodeView } from './QrCodeView';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pass: TravelPass | null;
}

export const PassScannerModal: React.FC<Props> = ({ isOpen, onClose, pass }) => {
  const [copied, setCopied] = useState(false);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  // Screen Wake Lock API: Keep screen awake while traveler is in boarding/ticket queue
  useEffect(() => {
    if (!isOpen) return;

    let wakeLockSentinel: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock
        .request('screen')
        .then((sentinel: any) => {
          wakeLockSentinel = sentinel;
        })
        .catch(() => {
          // Ignore wake lock request rejections (e.g. low battery mode)
        });
    }

    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen || !pass) return null;

  const handleCopyCode = (code: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeValue = pass.qrData || pass.referenceCode || pass.bookingId || pass.title;
  const isFlight = pass.type === 'flight';
  const isTrain = pass.type === 'train';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#FFFFFF',
          color: '#0F172A',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>{isFlight ? '✈️' : isTrain ? '🚆' : '🎫'}</span>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>
              {isFlight ? 'Boarding Pass Scanner' : isTrain ? 'Railway Ticket Scanner' : 'Entry Voucher Scanner'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Passenger & Flight Details */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            {pass.passengerName || pass.title}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
            {pass.provider || pass.legIdentifier || pass.referenceCode || ''}
          </div>

          {(pass.origin || pass.destination) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: 800, color: '#334155', marginTop: '6px' }}>
              <span>{pass.origin || 'Origin'}</span>
              <span style={{ color: '#94A3B8' }}>➔</span>
              <span>{pass.destination || 'Destination'}</span>
            </div>
          )}
        </div>

        {/* Seat / Gate / Time Pill Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {pass.seatOrRoom && (
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '6px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                {isFlight ? 'Seat' : isTrain ? 'Berth' : 'Room'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                {pass.seatOrRoom}
              </div>
            </div>
          )}

          {pass.startDateTime && (
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '6px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Departure
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                {pass.startDateTime}
              </div>
            </div>
          )}
        </div>

        {/* High-Contrast Optical Scanner Area */}
        <div
          style={{
            background: '#FFFFFF',
            border: '2px dashed #CBD5E1',
            borderRadius: '18px',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCodeView
              value={codeValue}
              size={220}
              darkColor="#000000"
              lightColor="#FFFFFF"
            />
          </div>

          {pass.referenceCode && (
            <button
              type="button"
              onClick={() => handleCopyCode(pass.referenceCode!)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Tap to copy barcode reference"
            >
              <span>{pass.referenceCode}</span>
              <span style={{ fontSize: '11px', color: copied ? '#10B981' : '#94A3B8' }}>
                {copied ? '✓ Copied' : '📋'}
              </span>
            </button>
          )}
        </div>

        {/* Offline Readiness Shield */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#065F46',
            marginBottom: '14px',
          }}
        >
          <span>🛡️</span>
          <span>Offline Scanner Ready · Stored in Device Memory</span>
        </div>

        {/* Done Action Button */}
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: '14px',
            background: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};
