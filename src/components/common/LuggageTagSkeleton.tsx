import React from 'react';

interface LuggageTagSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  count?: number;
}

/**
 * Luggage-Tag Skeleton Loader
 * A travel-document inspired placeholder with ticket punch cutout and barcode shimmer
 */
export const LuggageTagSkeleton: React.FC<LuggageTagSkeletonProps> = ({
  className = '',
  style = {},
  count = 1,
}) => {
  return (
    <div className={`luggage-skeleton-wrapper ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', ...style }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="luggage-tag-skeleton"
          style={{
            position: 'relative',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '18px 20px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Shimmer overlay */}
          <div className="luggage-skeleton-shimmer" />

          {/* Top Luggage Hole & String */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'var(--bg-app)',
                  border: '2px solid var(--border-color)',
                }}
              />
              <div style={{ width: '80px', height: '12px', background: 'var(--border-color)', borderRadius: '4px', opacity: 0.7 }} />
            </div>
            <div style={{ width: '45px', height: '18px', background: 'var(--border-color)', borderRadius: '9999px', opacity: 0.6 }} />
          </div>

          {/* Middle Content */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ width: '60%', height: '18px', background: 'var(--border-color)', borderRadius: '6px', opacity: 0.9 }} />
              <div style={{ width: '35%', height: '12px', background: 'var(--border-color)', borderRadius: '4px', opacity: 0.5 }} />
            </div>
            <div style={{ width: '70px', height: '22px', background: 'var(--border-color)', borderRadius: '6px', opacity: 0.8 }} />
          </div>

          {/* Perforated Divider */}
          <div
            style={{
              height: '1px',
              borderTop: '1px dashed var(--border-color)',
              margin: '12px -20px',
              opacity: 0.8,
            }}
          />

          {/* Bottom Barcode Motif */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '16px', opacity: 0.4 }}>
              {[3, 1, 4, 2, 5, 2, 4, 1, 3, 2, 4, 1, 5, 2].map((w, bIdx) => (
                <div key={bIdx} style={{ width: `${w}px`, height: '100%', background: 'var(--text-primary)' }} />
              ))}
            </div>
            <div style={{ width: '65px', height: '10px', background: 'var(--border-color)', borderRadius: '3px', opacity: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
};
