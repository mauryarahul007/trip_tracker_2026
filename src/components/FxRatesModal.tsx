import { useState, useEffect } from 'react';
import type { Trip, TripFxConfig } from '../types';
import { fetchExchangeRates, convertCurrency, type ExchangeRatesData } from '../utils/currencyFx';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { formatAmount } from '../utils/currency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSaveFxConfig: (config: TripFxConfig) => Promise<void>;
  isAdmin: boolean;
}

const COMMON_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳' },
];

export function FxRatesModal({
  isOpen,
  onClose,
  trip,
  onSaveFxConfig,
  isAdmin: _isAdmin,
}: Props) {
  const [ratesData, setRatesData] = useState<ExchangeRatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcFrom, setCalcFrom] = useState<string>('USD');
  const [calcTo, setCalcTo] = useState<string>(trip.baseCurrency || 'INR');

  // Rate Lock State
  const [lockCurrency, setLockCurrency] = useState<string>('USD');
  const [customRateInput, setCustomRateInput] = useState<string>('');
  const [markupPercent, setMarkupPercent] = useState<string>(trip.fxConfig?.markupPercent ? String(trip.fxConfig.markupPercent) : '0');
  const [activeCustomRates, setActiveCustomRates] = useState<Record<string, number>>(trip.fxConfig?.customRates || {});

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchExchangeRates(trip.baseCurrency || 'INR')
        .then((data) => {
          setRatesData(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen, trip.baseCurrency]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(calcAmount) || 0;
  const rates = ratesData?.rates || {};
  const currentFxConfig: TripFxConfig = {
    customRates: activeCustomRates,
    markupPercent: parseFloat(markupPercent) || 0,
  };

  const conversion = convertCurrency(parsedAmount, calcFrom, calcTo, rates, currentFxConfig);

  const handleAddCustomRate = () => {
    const rate = parseFloat(customRateInput);
    if (!rate || rate <= 0) return;
    triggerHaptic('light');

    const next = { ...activeCustomRates, [lockCurrency]: rate };
    setActiveCustomRates(next);
    setCustomRateInput('');
  };

  const handleRemoveCustomRate = (curr: string) => {
    triggerHaptic('light');
    const next = { ...activeCustomRates };
    delete next[curr];
    setActiveCustomRates(next);
  };

  const handleSaveAll = async () => {
    triggerHaptic('success');
    await onSaveFxConfig({
      customRates: activeCustomRates,
      markupPercent: parseFloat(markupPercent) || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
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
            <span style={{ fontSize: '20px' }}>💱</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Multi-Currency FX Engine</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Base: {trip.baseCurrency || 'INR'} • 30-day offline rate cache & custom rate lock
              </span>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 1. Live Currency Converter Tool */}
          <div
            style={{
              background: 'rgba(15, 169, 143, 0.05)',
              border: '1px solid rgba(15, 169, 143, 0.2)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> Quick Currency Converter
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                step="any"
                className="input-field"
                style={{ fontSize: '15px', fontWeight: 700 }}
                placeholder="Amount"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
              />

              <select
                className="input-field"
                style={{ fontSize: '13px', fontWeight: 600 }}
                value={calcFrom}
                onChange={(e) => setCalcFrom(e.target.value)}
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>

              <select
                className="input-field"
                style={{ fontSize: '13px', fontWeight: 600 }}
                value={calcTo}
                onChange={(e) => setCalcTo(e.target.value)}
              >
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Conversion Result Banner */}
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Converted Result</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-accent)' }}>
                  {formatAmount(conversion.convertedAmount, calcTo)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{conversion.formula}</span>
                {conversion.isCustomRate && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', background: 'rgba(217, 119, 6, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    🔒 Rate Locked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Custom Trip Rate Locking */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>🔒 Trip Rate Lock & Forex Fee</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Freeze custom rates (e.g. airport cash exchange) or add bank markup %
                </div>
              </div>
            </div>

            {/* Rate Lock Input */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: '8px', marginBottom: '10px' }}>
              <select
                className="input-field"
                style={{ fontSize: '12.5px' }}
                value={lockCurrency}
                onChange={(e) => setLockCurrency(e.target.value)}
              >
                {COMMON_CURRENCIES.filter((c) => c.code !== trip.baseCurrency).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="0.0001"
                className="input-field"
                placeholder={`1 ${lockCurrency} = ? ${trip.baseCurrency || 'INR'}`}
                style={{ fontSize: '12.5px' }}
                value={customRateInput}
                onChange={(e) => setCustomRateInput(e.target.value)}
              />

              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                disabled={!customRateInput}
                onClick={handleAddCustomRate}
              >
                Lock Rate
              </button>
            </div>

            {/* Active Locked Rates list */}
            {Object.keys(activeCustomRates).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {Object.entries(activeCustomRates).map(([curr, rate]) => (
                  <span
                    key={curr}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: 'rgba(217, 119, 6, 0.1)',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#d97706',
                    }}
                  >
                    <span>1 {curr} = {rate} {trip.baseCurrency}</span>
                    <button
                      type="button"
                      style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                      onClick={() => handleRemoveCustomRate(curr)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Forex Card Markup slider */}
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '10px 12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Forex Card / Bank Markup %</span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>e.g. +2.0% bank conversion charge</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  className="input-field"
                  style={{ width: '64px', textAlign: 'right', padding: '4px 6px', fontSize: '12px' }}
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>%</span>
              </div>
            </div>
          </div>

          {/* 3. Live FX Rates Matrix Overview */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📊 Live Travel Currencies ({ratesData?.date || 'Today'})</span>
              {isLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updating...</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px' }}>
              {COMMON_CURRENCIES.slice(0, 8).map((c) => {
                const res = convertCurrency(1, c.code, trip.baseCurrency || 'INR', rates, currentFxConfig);
                return (
                  <div
                    key={c.code}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface, #fff)',
                      border: '1px solid var(--border-color)',
                      fontSize: '11.5px',
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                      {c.flag} 1 {c.code}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {formatAmount(res.convertedAmount, trip.baseCurrency || 'INR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="gradient-btn"
              style={{ width: '100%', padding: '10px' }}
              onClick={handleSaveAll}
            >
              ✓ Save FX Rate Settings to Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
