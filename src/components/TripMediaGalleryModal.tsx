import React, { useState, useMemo } from 'react';
import type { Expense, Member, Category } from '../types';
import { formatAmount } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  members: Record<string, Member>;
  categories: Category[];
  currencySymbol: string;
  tripName: string;
}

interface MediaItem {
  id: string;
  url: string;
  expense: Expense;
}

export function TripMediaGalleryModal({
  isOpen,
  onClose,
  expenses,
  members,
  categories,
  currencySymbol,
  tripName,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEscapeKey(isOpen, () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(null);
    } else {
      onClose();
    }
  });

  const mediaItems: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = [];
    expenses.forEach((e) => {
      const url = e.receiptImage || (e.receiptPath ? e.receiptPath : null);
      if (url) {
        items.push({
          id: e.id,
          url,
          expense: e,
        });
      }
    });
    return items;
  }, [expenses]);

  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      if (selectedCategory !== 'all' && item.expense.category !== selectedCategory) return false;
      if (selectedMember !== 'all' && item.expense.paidBy !== selectedMember) return false;
      return true;
    });
  }, [mediaItems, selectedCategory, selectedMember]);

  if (!isOpen) return null;

  const currentLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    triggerHaptic('light');
    setZoomLevel(1);
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex === null) return;
    triggerHaptic('light');
    setZoomLevel(1);
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  };

  const handleShare = async (item: MediaItem) => {
    triggerHaptic('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${item.expense.title} - Receipt`,
          text: `${item.expense.title} (${currencySymbol} ${item.expense.amount.toFixed(2)}) from ${tripName}`,
          url: item.url,
        });
      } catch (err) {
        console.warn('Share cancelled or failed', err);
      }
    } else {
      window.open(item.url, '_blank');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '94%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: 'var(--border-radius-lg, 20px)',
          background: 'var(--card-bg, var(--bg-surface))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>📸</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Receipts & Memories Gallery</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {filteredItems.length} receipt{filteredItems.length === 1 ? '' : 's'} & photo{filteredItems.length === 1 ? '' : 's'} in {tripName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: '4px 10px', fontSize: '13px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <select
            className="secondary-btn"
            aria-label="Filter by category"
            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '8px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="secondary-btn"
            aria-label="Filter by member"
            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '8px' }}
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
          >
            <option value="all">All Members</option>
            {Object.values(members).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Grid Wall */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px',
            paddingRight: '4px',
          }}
        >
          {filteredItems.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No receipts or photos found</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Attach receipts when adding expenses to see them here.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const payer = members[item.expense.paidBy]?.name || 'Unknown';
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setLightboxIndex(index);
                  }}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'rgba(0, 0, 0, 0.05)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <img
                    src={item.url}
                    alt={item.expense.title}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '6px 8px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.expense.title}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.9 }}>
                      {currencySymbol} {item.expense.amount.toFixed(2)} • {payer}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Lightbox Fullscreen Modal */}
        {currentLightboxItem && (
          <div
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100000,
              background: 'rgba(0, 0, 0, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            {/* Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>{currentLightboxItem.expense.title}</div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  {formatAmount(currentLightboxItem.expense.amount, currentLightboxItem.expense.currency)} • {currentLightboxItem.expense.date}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
                  className="secondary-btn"
                  style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'transparent' }}
                >
                  {zoomLevel === 1 ? '🔍 Zoom In' : '🔍 Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(currentLightboxItem)}
                  className="secondary-btn"
                  style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'transparent' }}
                >
                  📤 Share
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="secondary-btn"
                  style={{ padding: '6px 12px', fontSize: '13px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderColor: 'transparent' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Image Container */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxHeight: '75vh',
                maxWidth: '90vw',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={currentLightboxItem.url}
                alt={currentLightboxItem.expense.title}
                style={{
                  maxHeight: '70vh',
                  maxWidth: '85vw',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease',
                  cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
                }}
                onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
              />
            </div>

            {/* Navigation Arrows */}
            {filteredItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
