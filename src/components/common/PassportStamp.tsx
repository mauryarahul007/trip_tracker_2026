import React from 'react';

interface PassportStampProps {
  destination?: string;
  tripName?: string;
  date?: string;
  variant?: 'entry' | 'departure' | 'settled';
  color?: 'teal' | 'red' | 'navy' | 'amber' | 'cyan' | 'purple' | 'auto';
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Known destination keywords to airport / IATA / city codes
const DEST_CODE_MAP: Record<string, string> = {
  goa: 'GOI',
  mumbai: 'BOM',
  delhi: 'DEL',
  bangalore: 'BLR',
  bengaluru: 'BLR',
  hyderabad: 'HYD',
  dubai: 'DXB',
  singapore: 'SIN',
  bali: 'DPS',
  bangkok: 'BKK',
  paris: 'CDG',
  london: 'LHR',
  tokyo: 'HND',
  kyoto: 'KIX',
  newyork: 'JFK',
  manali: 'KUU',
  leh: 'IXL',
  ladakh: 'IXL',
  jaipur: 'JAI',
  udaipur: 'UDR',
  kerala: 'COK',
  kochi: 'COK',
  thailand: 'BKK',
  vietnam: 'HAN',
  rome: 'FCO',
  amsterdam: 'AMS',
  switzerland: 'ZRH',
  zurich: 'ZRH',
};

function deriveDestCode(dest?: string, name?: string): string {
  const text = `${dest || ''} ${name || ''}`.toLowerCase();
  for (const [key, code] of Object.entries(DEST_CODE_MAP)) {
    if (text.includes(key)) return code;
  }
  // Fallback: clean 3 uppercase letters from destination or name
  const clean = (dest || name || 'TRP').replace(/[^a-zA-Z]/g, '').toUpperCase();
  return clean.slice(0, 3) || 'TRP';
}

function formatStampDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
    if (isNaN(d.getTime())) return dateStr.toUpperCase();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  } catch {
    return dateStr.toUpperCase();
  }
}

const INK_PALETTE = {
  teal: { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.18)', text: '#34D399', bg: 'rgba(6, 44, 34, 0.65)' },
  amber: { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.20)', text: '#FBBF24', bg: 'rgba(56, 34, 4, 0.65)' },
  cyan: { stroke: '#06B6D4', fill: 'rgba(6, 182, 212, 0.18)', text: '#38BDF8', bg: 'rgba(8, 47, 73, 0.65)' },
  coral: { stroke: '#F43F5E', fill: 'rgba(244, 63, 94, 0.18)', text: '#FB7185', bg: 'rgba(60, 10, 20, 0.65)' },
  purple: { stroke: '#A855F7', fill: 'rgba(168, 85, 247, 0.18)', text: '#C084FC', bg: 'rgba(46, 16, 75, 0.65)' },
  navy: { stroke: '#38BDF8', fill: 'rgba(56, 189, 248, 0.18)', text: '#7DD3FC', bg: 'rgba(12, 34, 56, 0.65)' },
  red: { stroke: '#F43F5E', fill: 'rgba(244, 63, 94, 0.18)', text: '#FB7185', bg: 'rgba(60, 10, 20, 0.65)' },
};

const DYNAMIC_KEYS: Array<keyof typeof INK_PALETTE> = ['cyan', 'amber', 'purple', 'coral'];

/**
 * Dynamic Vector Passport Entry/Settled Ink Stamp
 * Authentic dual-ring stamp with destination code, date, dynamic ink tone, and realistic angle tilt
 */
export const PassportStamp: React.FC<PassportStampProps> = ({
  destination,
  tripName,
  date,
  variant = 'entry',
  color = 'auto',
  size = 68,
  className = '',
  style = {},
}) => {
  const arcPathId = React.useId().replace(/:/g, '_');
  const code = deriveDestCode(destination, tripName);
  const formattedDate = formatStampDate(date);

  // Deterministic tilt based on code string (-6deg to +6deg)
  const tiltDeg = ((code.charCodeAt(0) + (code.charCodeAt(1) || 0)) % 13) - 6;

  // Derive dynamic color: settled trips always get vibrant emerald teal; active trips dynamically cycle through vivid ink tones
  let activeColor = INK_PALETTE.amber;
  if (variant === 'settled') {
    activeColor = INK_PALETTE.teal;
  } else if (color && color !== 'auto' && INK_PALETTE[color]) {
    activeColor = INK_PALETTE[color];
  } else {
    // Dynamic seed based on destination + tripName
    const seed = (code.charCodeAt(0) + (tripName?.length || 0)) % DYNAMIC_KEYS.length;
    activeColor = INK_PALETTE[DYNAMIC_KEYS[seed]];
  }

  const topText = variant === 'settled' ? '• SETTLED •' : variant === 'departure' ? '• DEPARTURE •' : '• IMMIGRATION •';

  return (
    <div
      className={`passport-stamp ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `rotate(${tiltDeg}deg)`,
        transformOrigin: 'center center',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 1px rgba(0, 0, 0, 0.9))',
        ...style,
      }}
      title={`${variant.toUpperCase()}: ${code} - ${formattedDate}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Soft tinted backdrop circle for guaranteed high contrast on any card photo */}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill={activeColor.bg}
          style={{ backdropFilter: 'blur(6px)' }}
        />

        {/* Outer Distressed Border */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke={activeColor.stroke}
          strokeWidth="2.4"
          strokeDasharray="90 3 40 2 20 4"
          fill={activeColor.fill}
        />

        {/* Inner Solid Border */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke={activeColor.stroke}
          strokeWidth="1.2"
          strokeDasharray="45 2 30 1"
          opacity="0.85"
        />

        {/* Curved Header Path for text with unique ID */}
        <path
          id={arcPathId}
          d="M 22 50 A 28 28 0 0 1 78 50"
          fill="none"
        />
        <text
          fontSize="7"
          fontWeight="700"
          letterSpacing="0.12em"
          fill={activeColor.text}
          fontFamily="var(--font-family-mono)"
          opacity="0.95"
        >
          <textPath href={`#${arcPathId}`} startOffset="50%" textAnchor="middle">
            {topText}
          </textPath>
        </text>

        {/* Center Airport Code */}
        <text
          x="50"
          y="52"
          fontSize="17"
          fontWeight="800"
          letterSpacing="0.08em"
          fill={activeColor.text}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-family-mono)"
        >
          {code}
        </text>

        {/* Star Accents */}
        <text
          x="28"
          y="53"
          fontSize="8"
          fill={activeColor.text}
          textAnchor="middle"
          dominantBaseline="central"
          opacity="0.65"
        >
          ★
        </text>
        <text
          x="72"
          y="53"
          fontSize="8"
          fill={activeColor.text}
          textAnchor="middle"
          dominantBaseline="central"
          opacity="0.65"
        >
          ★
        </text>

        {/* Stamped Date at Bottom */}
        <text
          x="50"
          y="71"
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="0.06em"
          fill={activeColor.text}
          textAnchor="middle"
          fontFamily="var(--font-family-mono)"
          opacity="0.85"
        >
          {formattedDate}
        </text>
      </svg>
    </div>
  );
};
