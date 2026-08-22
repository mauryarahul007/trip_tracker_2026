import { useState } from 'react';
import type { Trip, Expense, Member, Category } from '../types';
import { getCurrencySymbol } from '../utils/currency';
import { IconClose, IconDownload, IconCheck } from './Icons';
import { triggerHaptic } from '../utils/haptics';

interface TripWrappedModalProps {
  trip: Trip;
  expenses: Expense[];
  members: Member[];
  categories: Category[];
  onClose: () => void;
}

export function TripWrappedModal({
  trip,
  expenses,
  members,
  categories,
  onClose,
}: TripWrappedModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  const currencySymbol = getCurrencySymbol(trip.baseCurrency);
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPersonAvg = members.length > 0 ? totalSpend / members.length : totalSpend;

  // Calculate top spender
  const memberPaidMap: Record<string, number> = {};
  expenses.forEach((e) => {
    memberPaidMap[e.paidBy] = (memberPaidMap[e.paidBy] || 0) + e.amount;
  });

  let topSpenderId = '';
  let topSpenderAmount = 0;
  Object.entries(memberPaidMap).forEach(([id, amt]) => {
    if (amt > topSpenderAmount) {
      topSpenderAmount = amt;
      topSpenderId = id;
    }
  });
  const topSpenderName = members.find((m) => m.id === topSpenderId)?.name || 'Everyone';

  // Calculate top category
  const categorySpendMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categorySpendMap[e.category] = (categorySpendMap[e.category] || 0) + e.amount;
  });

  let topCategoryId = '';
  let topCategoryAmount = 0;
  Object.entries(categorySpendMap).forEach(([id, amt]) => {
    if (amt > topCategoryAmount) {
      topCategoryAmount = amt;
      topCategoryId = id;
    }
  });
  const topCategoryName = categories.find((c) => c.id === topCategoryId)?.name || 'General';
  const topCategoryPercent = totalSpend > 0 ? Math.round((topCategoryAmount / totalSpend) * 100) : 0;

  // Render canvas card
  const generateCanvas = (): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background Gradient (Dark Teal Luxury Aesthetic)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#0F1E24');
    bgGrad.addColorStop(0.5, '#142931');
    bgGrad.addColorStop(1, '#09151A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Accent Orbs
    ctx.beginPath();
    ctx.arc(900, 200, 350, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(43, 168, 158, 0.15)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(150, 1700, 400, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(235, 107, 86, 0.12)';
    ctx.fill();

    // App Branding Header
    ctx.font = '600 36px sans-serif';
    ctx.fillStyle = '#2BA89E';
    ctx.fillText('TRIP TRACKER · 2026', 100, 180);

    ctx.font = '800 64px serif';
    ctx.fillStyle = '#F2ECDC';
    ctx.fillText('Trip Wrapped ✈️', 100, 260);

    // Trip Name Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.roundRect(100, 320, 880, 240, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 52px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(trip.name, 140, 410);

    ctx.font = '400 34px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${trip.startDate} to ${trip.endDate} · ${members.length} Travelers`, 140, 490);

    // Metric 1: Total Trip Spend
    ctx.fillStyle = 'rgba(43, 168, 158, 0.12)';
    ctx.strokeStyle = '#2BA89E';
    ctx.roundRect(100, 600, 880, 260, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 32px sans-serif';
    ctx.fillStyle = '#2BA89E';
    ctx.fillText('TOTAL TRIP EXPENDITURE', 140, 670);

    ctx.font = '800 72px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${currencySymbol}${totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 140, 770);

    ctx.font = '400 32px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`Average: ${currencySymbol}${Math.round(perPersonAvg).toLocaleString('en-IN')} / person`, 140, 825);

    // Metric 2: Top Spender (Crown)
    ctx.fillStyle = 'rgba(235, 107, 86, 0.1)';
    ctx.strokeStyle = '#EB6B56';
    ctx.roundRect(100, 900, 880, 260, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 32px sans-serif';
    ctx.fillStyle = '#EB6B56';
    ctx.fillText('👑 CHIEF FINANCIER / TOP SPENDER', 140, 970);

    ctx.font = '800 60px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(topSpenderName, 140, 1060);

    ctx.font = '400 32px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`Covered ${currencySymbol}${Math.round(topSpenderAmount).toLocaleString('en-IN')} across ${expenses.length} expenses`, 140, 1115);

    // Metric 3: Top Category
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.roundRect(100, 1200, 880, 240, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 32px sans-serif';
    ctx.fillStyle = '#D69E2E';
    ctx.fillText('🍕 TOP CATEGORY SPEND', 140, 1270);

    ctx.font = '800 52px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${topCategoryName} (${topCategoryPercent}%)`, 140, 1350);

    ctx.font = '400 32px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(`${currencySymbol}${Math.round(topCategoryAmount).toLocaleString('en-IN')} total spent`, 140, 1405);

    // Footer Branding
    ctx.font = '500 28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Tracked with Trip Tracker · trip-tracker.blackmaroon.in', 540, 1820);

    return canvas;
  };

  const handleDownload = () => {
    triggerHaptic('medium');
    setDownloading(true);
    try {
      const canvas = generateCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${trip.name.replace(/\s+/g, '_')}_Wrapped_2026.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    triggerHaptic('success');
    const canvas = generateCanvas();
    if (!canvas) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${trip.name}_Wrapped.png`, { type: 'image/png' });
        try {
          await navigator.share({
            title: `${trip.name} - Trip Wrapped`,
            text: `Check out our Trip Wrapped stats for ${trip.name}! Total: ${currencySymbol}${Math.round(totalSpend)}`,
            files: [file],
          });
          setShared(true);
        } catch {
          // Fallback to download
          handleDownload();
        }
      });
    } else {
      handleDownload();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card fade-in"
        style={{ maxWidth: '440px', padding: '24px', background: '#0F1E24', color: '#F2ECDC' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#2BA89E', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Story Card
            </span>
            <h3 style={{ fontSize: '20px', margin: '2px 0 0', color: '#FFFFFF' }}>Trip Wrapped ✨</h3>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '6px 8px', color: '#F2ECDC', borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}
            onClick={onClose}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Live Card Preview */}
        <div style={{
          padding: '20px',
          borderRadius: 'var(--border-radius)',
          background: 'linear-gradient(145deg, #142931 0%, #0B171C 100%)',
          border: '1px solid rgba(43, 168, 158, 0.3)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>{trip.name}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{trip.startDate} to {trip.endDate}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#2BA89E', fontWeight: 600 }}>Total Spent</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{currencySymbol}{Math.round(totalSpend)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#2BA89E', fontWeight: 600 }}>Avg / Person</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{currencySymbol}{Math.round(perPersonAvg)}</div>
            </div>
          </div>

          <div style={{ background: 'rgba(235, 107, 86, 0.1)', border: '1px solid rgba(235,107,86,0.25)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#EB6B56', fontWeight: 600 }}>👑 Top Spender</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>{topSpenderName}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Paid {currencySymbol}{Math.round(topSpenderAmount)}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#D69E2E', fontWeight: 600 }}>🍕 Top Category</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>{topCategoryName} ({topCategoryPercent}%)</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1, padding: '10px', color: '#F2ECDC', borderColor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleDownload}
            disabled={downloading}
          >
            <IconDownload size={15} />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            className="primary-btn"
            style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleShare}
          >
            {shared ? <IconCheck size={15} /> : null}
            <span>{shared ? 'Shared!' : 'Share Story'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
