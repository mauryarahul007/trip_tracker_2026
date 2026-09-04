import React, { useState, useEffect } from 'react';
import { generateQrCodeDataUrl } from '../utils/qrGenerator';

interface QrCodeViewProps {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  value,
  size = 220,
  alt = 'QR Code',
  className = '',
  darkColor = '#0f172a',
  lightColor = '#ffffff'
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setDataUrl('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    generateQrCodeDataUrl(value, {
      size: size * 2, // 2x for retina crispness
      margin: 2,
      darkColor,
      lightColor
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code view:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor]);

  return (
    <div
      className={`qr-code-display-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '16px',
        overflow: 'hidden',
        background: lightColor
      }}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={alt}
          width={size}
          height={size}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'block',
            objectFit: 'contain',
            imageRendering: 'crisp-edges'
          }}
        />
      ) : isLoading ? (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#64748b'
          }}
        >
          <div
            className="qr-loading-spinner"
            style={{
              width: '28px',
              height: '28px',
              border: '3px solid rgba(0,0,0,0.08)',
              borderTopColor: '#0ea5e9',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Generating QR...</span>
        </div>
      ) : (
        <div
          style={{
            fontSize: '12px',
            color: '#ef4444',
            padding: '12px',
            textAlign: 'center'
          }}
        >
          Unable to generate QR
        </div>
      )}
    </div>
  );
};
