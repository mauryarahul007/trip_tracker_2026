import { useState } from 'react';
import type { Trip } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { getCurrencySymbol } from '../utils/currency';

type CategoryDatum = { id: string; name: string; icon: string; amount: number; percentage: number };
type MemberSpend = { id: string; name: string; amount: number; percentage: number };
type DailySpend = { rawDate: string; dateLabel: string; amount: number };

type Props = {
  trip: Trip | undefined;
  totalSpent: number;
  averageCost: number;
  biggestSpender: string;
  hasExpenses: boolean;
  categoryData: CategoryDatum[];
  getCatColor: (id: string, idx: number) => string;
  memberSpentList: MemberSpend[];
  dailySpendData: DailySpend[];
};

export function AnalyticsTab({
  trip,
  totalSpent,
  averageCost,
  biggestSpender,
  hasExpenses,
  categoryData,
  getCatColor,
  memberSpentList,
  dailySpendData,
}: Props) {
  const currencySymbol = getCurrencySymbol(trip?.baseCurrency || '');
  const topCategory = categoryData[0];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="fade-in">
      <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Charts & Analytics</h3>

      {/* 1. Key Statistics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Spent</span>
          <strong className="money" style={{ fontSize: '19px', color: 'var(--primary-accent)' }}>
            {currencySymbol} {totalSpent.toFixed(2)}
          </strong>
        </div>
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Per-Head Cost</span>
          <strong className="money" style={{ fontSize: '19px', color: 'var(--text-primary)' }}>
            {currencySymbol} {averageCost.toFixed(2)}
          </strong>
        </div>
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Category</span>
          <strong style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            {topCategory ? (
              <>
                <span style={{ color: 'var(--primary-accent)', flexShrink: 0 }}>
                  <CategoryIcon categoryId={topCategory.id} fallbackEmoji={topCategory.icon} size={15} />
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topCategory.name}</span>
              </>
            ) : 'N/A'}
          </strong>
        </div>
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biggest Spender</span>
          <strong style={{ fontSize: '16px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {biggestSpender}
          </strong>
        </div>
      </div>

      {!hasExpenses ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderStyle: 'dashed' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Log a few expenses and the numbers will show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 2. Spend by Category SVG Donut Chart */}
          <div className="glass-card">
            <h4 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>Spend by Category</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              {/* Donut SVG */}
              <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="50" fill="transparent" stroke="var(--border-color)" strokeWidth="1" />
                  {(() => {
                    let accumPercent = 0;
                    const r = 50;
                    const circ = 2 * Math.PI * r;
                    return categoryData.map((d, idx) => {
                      const strokeDash = `${(d.percentage / 100) * circ} ${circ}`;
                      const strokeOffset = `${- (accumPercent / 100) * circ}`;
                      accumPercent += d.percentage;
                      return (
                        <circle
                          key={d.id}
                          cx="70"
                          cy="70"
                          r={r}
                          fill="transparent"
                          stroke={getCatColor(d.id, idx)}
                          strokeWidth="12"
                          strokeDasharray={strokeDash}
                          strokeDashoffset={strokeOffset}
                          transform="rotate(-90 70 70)"
                          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                      );
                    });
                  })()}
                </svg>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {currencySymbol}
                    {totalSpent > 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Legends */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' }}>
                {categoryData.map((d, idx) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getCatColor(d.id, idx), flexShrink: 0 }} />
                      <span style={{ color: 'var(--primary-accent)', display: 'flex' }}><CategoryIcon categoryId={d.id} fallbackEmoji={d.icon} size={14} /></span>
                      <span>{d.name}</span>
                    </div>
                    <strong style={{ color: 'var(--text-secondary)' }}>
                      {d.percentage.toFixed(0)}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Spend by Member CSS Bar Chart */}
          <div className="glass-card">
            <h4 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>Spend by Member (Paid sums)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {memberSpentList.map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500 }}>
                    <span>{m.name}</span>
                    <span>
                      {currencySymbol} {m.amount.toFixed(2)}{' '}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({m.percentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(15,23,42,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${m.percentage}%`,
                      height: '100%',
                      background: 'var(--primary-accent)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Daily Spend SVG Line Chart */}
          {dailySpendData.length > 0 && (
            <div className="glass-card">
              <h4 style={{ fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>Daily Spending Trend</h4>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ minWidth: '350px' }}>
                  <line x1="30" y1="40" x2="380" y2="40" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="30" y1="100" x2="380" y2="100" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="30" y1="160" x2="380" y2="160" stroke="var(--border-color)" strokeWidth="1" />

                  {(() => {
                    const amounts = dailySpendData.map((d) => d.amount);
                    const maxAmount = Math.max(...amounts, 100);
                    const getCoords = (idx: number, amt: number) => {
                      const totalPoints = dailySpendData.length;
                      const x = totalPoints > 1
                        ? 40 + idx * (330 / (totalPoints - 1))
                        : 200;
                      const y = 160 - (amt / maxAmount) * 110;
                      return { x, y };
                    };

                    const points = dailySpendData.map((d, idx) => getCoords(idx, d.amount));
                    const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

                    return (
                      <>
                        <text x="25" y="44" textAnchor="end" fontSize="9" fill="var(--text-secondary)">{maxAmount.toFixed(0)}</text>
                        <text x="25" y="104" textAnchor="end" fontSize="9" fill="var(--text-secondary)">{(maxAmount / 2).toFixed(0)}</text>
                        <text x="25" y="164" textAnchor="end" fontSize="9" fill="var(--text-secondary)">0</text>

                        {points.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="var(--primary-accent)"
                            strokeWidth="2.5"
                            points={pointsStr}
                            style={{ transition: 'all 0.5s ease' }}
                          />
                        )}

                        {points.map((p, idx) => {
                          const isHovered = hoveredIdx === idx;
                          const showLabel = dailySpendData.length <= 7 || idx % Math.ceil(dailySpendData.length / 5) === 0 || idx === dailySpendData.length - 1;

                          return (
                            <g key={idx}>
                              <rect
                                x={p.x - 15}
                                y={30}
                                width={30}
                                height={150}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                onTouchStart={() => setHoveredIdx(idx)}
                              />
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={isHovered ? "6" : "4"}
                                fill={isHovered ? "var(--secondary-accent)" : "var(--primary-accent)"}
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                style={{ transition: 'all 0.15s ease-out' }}
                              />
                              {(isHovered || dailySpendData.length <= 7) && (
                                <g>
                                  <rect
                                    x={p.x - 22}
                                    y={p.y - 25}
                                    width={44}
                                    height={15}
                                    rx="3"
                                    fill="var(--text-primary)"
                                    opacity="0.9"
                                  />
                                  <text
                                    x={p.x}
                                    y={p.y - 14}
                                    textAnchor="middle"
                                    fontSize="8.5"
                                    fontWeight="700"
                                    fill="var(--bg-surface)"
                                  >
                                    {dailySpendData[idx].amount.toFixed(0)}
                                  </text>
                                </g>
                              )}
                              {showLabel && (
                                <text
                                  x={p.x}
                                  y="178"
                                  textAnchor="middle"
                                  fontSize="9"
                                  fill="var(--text-secondary)"
                                >
                                  {dailySpendData[idx].dateLabel}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
