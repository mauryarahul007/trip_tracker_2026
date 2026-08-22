import { useState } from 'react';
import type { Member } from '../types';
import type { Transfer } from '../utils/settlement';
import { initial } from '../utils/initials';
import { avatarColorForName } from '../utils/avatarColor';
import { getCurrencySymbol } from '../utils/currency';
import { triggerHaptic } from '../utils/haptics';

interface BalanceFlowGraphProps {
  transfers: Transfer[];
  members: Record<string, Member>;
  currency: string;
  onSettle?: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string) => void;
  canSettle?: boolean;
}

export function BalanceFlowGraph({
  transfers,
  members,
  currency,
  onSettle,
  canSettle = true,
}: BalanceFlowGraphProps) {
  const [selectedTransferIdx, setSelectedTransferIdx] = useState<number | null>(null);
  const currencySymbol = getCurrencySymbol(currency);

  if (!transfers || transfers.length === 0) {
    return (
      <div style={{
        padding: '32px 16px',
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderRadius: 'var(--border-radius)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-secondary)'
      }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>🎉 All balances are settled!</p>
        <p style={{ margin: '4px 0 0', fontSize: '12px' }}>No pending transfers in this group.</p>
      </div>
    );
  }

  // Collect unique involved members
  const uniqueMemberIds = Array.from(
    new Set(transfers.flatMap((t) => [t.fromMemberId, t.toMemberId]))
  );

  // Layout parameters for SVG
  const width = 360;
  const height = Math.max(260, uniqueMemberIds.length * 60);
  const centerX = width / 2;
  const radius = Math.min(width, height) / 2 - 40;

  // Calculate circular node positions
  const nodePositions = new Map<string, { x: number; y: number; angle: number }>();
  uniqueMemberIds.forEach((id, index) => {
    const angle = (index / uniqueMemberIds.length) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = height / 2 + radius * Math.sin(angle);
    nodePositions.set(id, { x, y, angle });
  });

  const selectedTransfer = selectedTransferIdx !== null ? transfers[selectedTransferIdx] : null;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)',
      padding: '16px 12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interactive Settlement Flow
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Tap any flow to inspect / settle
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', maxHeight: '340px', display: 'block' }}
      >
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-danger, #EB6B56)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-success, #2BA89E)" stopOpacity="0.9" />
          </linearGradient>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="4"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="var(--primary-accent, #2BA89E)" />
          </marker>
        </defs>

        {/* Draw Curved Flow Lines */}
        {transfers.map((t, idx) => {
          const fromPos = nodePositions.get(t.fromMemberId);
          const toPos = nodePositions.get(t.toMemberId);
          if (!fromPos || !toPos) return null;

          const isSelected = selectedTransferIdx === idx;
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;
          const ctrlX = midX + (centerX - midX) * 0.35;
          const ctrlY = midY + (height / 2 - midY) * 0.35;

          return (
            <g key={`flow-${idx}`} onClick={() => {
              triggerHaptic('light');
              setSelectedTransferIdx(isSelected ? null : idx);
            }} style={{ cursor: 'pointer' }}>
              <path
                d={`M ${fromPos.x} ${fromPos.y} Q ${ctrlX} ${ctrlY} ${toPos.x} ${toPos.y}`}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />
              <path
                d={`M ${fromPos.x} ${fromPos.y} Q ${ctrlX} ${ctrlY} ${toPos.x} ${toPos.y}`}
                fill="none"
                stroke={isSelected ? 'var(--primary-accent)' : 'url(#flowGrad)'}
                strokeWidth={isSelected ? '3.5' : '2'}
                strokeDasharray={isSelected ? 'none' : '4,3'}
                markerEnd="url(#arrowhead)"
                style={{
                  transition: 'stroke-width 0.2s, stroke 0.2s',
                  opacity: selectedTransferIdx === null || isSelected ? 0.95 : 0.25,
                }}
              />
              <rect
                x={ctrlX - 26}
                y={ctrlY - 10}
                width="52"
                height="18"
                rx="9"
                fill="var(--bg-card)"
                stroke={isSelected ? 'var(--primary-accent)' : 'var(--border-color)'}
                strokeWidth="1"
              />
              <text
                x={ctrlX}
                y={ctrlY + 3}
                fontSize="10"
                fontWeight="700"
                fill="var(--text-primary)"
                textAnchor="middle"
              >
                {currencySymbol}{Math.round(t.amount)}
              </text>
            </g>
          );
        })}

        {/* Draw Member Nodes */}
        {uniqueMemberIds.map((id) => {
          const pos = nodePositions.get(id);
          if (!pos) return null;
          const member = members[id];
          const name = member?.name || 'Member';
          const bg = avatarColorForName(name);

          return (
            <g key={`node-${id}`} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle
                r="18"
                fill={bg}
                stroke="var(--bg-card)"
                strokeWidth="2.5"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
              />
              <text
                y="4"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#ffffff"
              >
                {initial(name)}
              </text>
              <text
                y="28"
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="var(--text-primary)"
              >
                {name.length > 8 ? `${name.substring(0, 7)}…` : name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Selected Transfer Action Card */}
      {selectedTransfer && (
        <div className="fade-in" style={{
          marginTop: '12px',
          padding: '10px 12px',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--primary-accent)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <strong>{members[selectedTransfer.fromMemberId]?.name || 'Payer'}</strong> owes{' '}
              <strong>{members[selectedTransfer.toMemberId]?.name || 'Receiver'}</strong>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-danger)', marginTop: '2px' }}>
              {currencySymbol}{selectedTransfer.amount.toFixed(2)}
            </div>
          </div>
          {canSettle && onSettle && (
            <button
              type="button"
              className="primary-btn"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => {
                triggerHaptic('medium');
                const fromName = members[selectedTransfer.fromMemberId]?.name || 'Payer';
                const toName = members[selectedTransfer.toMemberId]?.name || 'Receiver';
                onSettle(
                  selectedTransfer.fromMemberId,
                  selectedTransfer.toMemberId,
                  selectedTransfer.amount,
                  fromName,
                  toName
                );
              }}
            >
              Settle Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
