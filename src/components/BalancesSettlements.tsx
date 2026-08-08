import { useState } from 'react';
import type { Expense, Group, Trip } from '../types';
import { buildSettlementNodes, calculateGroupInternalTransfers, type MemberBalance, type Transfer } from '../utils/settlement';
import { IconCheck, IconCheckCircle, IconMembers } from './Icons';

type Props = {
  trip: Trip;
  balances: MemberBalance[];
  groups: Group[];
  transfers: Transfer[];
  activeTripExpenses: Expense[];
  topCategoryName?: string;
  topCategoryPercentage?: number;
  onMemberClick: (memberId: string) => void;
  onSettle: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string) => void;
};

function balanceColor(balance: number): string {
  if (balance > 0.01) return 'var(--color-success)';
  if (balance < -0.01) return 'var(--color-danger)';
  return 'var(--text-secondary)';
}

function balanceLabel(balance: number, currencySymbol: string): string {
  const absVal = Math.abs(balance).toFixed(2);
  if (balance > 0.01) return `gets back ${currencySymbol}${absVal}`;
  if (balance < -0.01) return `owes ${currencySymbol}${absVal}`;
  return 'settled';
}

function isTransferSettled(t: Transfer, activeTripExpenses: Expense[]): boolean {
  return activeTripExpenses.some(
    (e) =>
      e.title.startsWith('Settlement:') &&
      e.paidBy === t.fromMemberId &&
      e.splitMemberIds.includes(t.toMemberId) &&
      Math.abs(e.amount - t.amount) < 0.02
  );
}

type TransferRowProps = {
  transfer: Transfer;
  rowKey: string;
  note?: string;
  currencySymbol: string;
  isSettled: boolean;
  customValue: string;
  onCustomChange: (v: string) => void;
  onSettle: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string) => void;
};

function TransferRow({ transfer: t, note, currencySymbol, isSettled, customValue, onCustomChange, onSettle }: TransferRowProps) {
  const settleAmount = parseFloat(customValue) || t.amount;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1.5px dashed var(--border-color)' }}>
      <div style={{ fontSize: '14px' }}>
        <strong>{t.fromLabel}</strong> owes <strong>{t.toLabel}</strong>
        {note && (
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{note}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="money" style={{ fontSize: '14px', fontWeight: '600', color: isSettled ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {currencySymbol} {t.amount.toFixed(2)}
        </span>
        {isSettled ? (
          <span className="settle-pop" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-success)' }}><IconCheck size={14} className="icon-sm" /> Settled</span>
        ) : (
          <>
            <input
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder={t.amount.toFixed(2)}
              title="Custom settlement amount (leave blank to use the suggested amount)"
              value={customValue}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v)) onCustomChange(v);
              }}
              style={{ width: '90px', padding: '6px 8px', fontSize: '12px', height: '32px' }}
            />
            <button
              className="gradient-btn"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
              onClick={() => onSettle(t.fromMemberId, t.toMemberId, settleAmount, t.fromLabel, t.toLabel)}
            >
              Settle
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function BalancesSettlements({
  trip,
  balances,
  groups,
  transfers,
  activeTripExpenses,
  topCategoryName,
  topCategoryPercentage,
  onMemberClick,
  onSettle,
}: Props) {
  const currencySymbol = trip.baseCurrency === 'INR' ? '₹' : trip.baseCurrency;
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const balanceNodes = buildSettlementNodes(balances, groups);

  const setCustom = (rowKey: string, v: string) => setCustomAmounts({ ...customAmounts, [rowKey]: v });

  const totalOutstanding = transfers.reduce((sum, t) => sum + t.amount, 0);
  const isFullySettled = transfers.length === 0;
  const topTransfer = transfers.length > 0 ? [...transfers].sort((a, b) => b.amount - a.amount)[0] : null;
  const topTransferShare = topTransfer && totalOutstanding > 0 ? topTransfer.amount / totalOutstanding : 0;
  const transferIsDominant = transfers.length === 1 || topTransferShare >= 0.5;
  const categoryIsDominant = !!topCategoryName && (topCategoryPercentage ?? 0) >= 50;
  const categoryClause = categoryIsDominant ? `, driven by ${topCategoryName} spend` : '';

  return (
    <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Balances & Settlements</h3>

      {/* Boarding-pass balance summary */}
      <div className="boarding-pass">
        <div className="bp-top">
          <div>
            <div className="bp-eyebrow">{trip.name}</div>
            <div className="bp-title">Balance summary</div>
          </div>
          <div className="bp-meta">{trip.baseCurrency}</div>
          <div className="bp-stamp-pos">
            <span key={isFullySettled ? 'settled' : 'unsettled'} className="stamp-badge" style={{ color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {isFullySettled && <IconCheckCircle size={14} className="icon-sm" />}
              {isFullySettled ? 'Settled' : 'Unsettled'}
            </span>
          </div>
        </div>
        <div className="bp-perf" />
        <div className="bp-body">
          <div className="bp-who">{isFullySettled ? 'Outstanding' : 'Outstanding to settle'}</div>
          <div className="bp-amount" style={{ color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {currencySymbol} {totalOutstanding.toFixed(2)}
          </div>
          <div className="bp-sub">
            {isFullySettled
              ? 'Every balance is settled — nothing left to pay.'
              : topTransfer && transferIsDominant
                ? `${transfers.length > 1 ? 'Mostly ' : ''}${topTransfer.fromLabel} owes ${topTransfer.toLabel}${categoryClause}.`
                : categoryIsDominant
                  ? `${transfers.length} transfers to settle, driven mostly by ${topCategoryName} spend.`
                  : `${transfers.length} transfer${transfers.length === 1 ? '' : 's'} will clear every balance.`}
          </div>
        </div>
        <div className="bp-foot">
          <span>{balances.length} members</span>
          <span>{transfers.length} transfer{transfers.length === 1 ? '' : 's'} left</span>
        </div>
      </div>

      {/* Balances List */}
      <div className="glass-card" style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Member Balances
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {balanceNodes.map((n) => {
            const isGroup = n.id.startsWith('group:');

            if (!isGroup) {
              return (
                <div
                  key={n.id}
                  className="balance-row"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => onMemberClick(n.memberIds[0])}
                  title={`View ${n.name}'s expenses`}
                >
                  <span><strong>{n.name}</strong></span>
                  <span style={{ color: balanceColor(n.balance), fontWeight: '700' }}>
                    {balanceLabel(n.balance, currencySymbol)}
                  </span>
                </div>
              );
            }

            const groupId = n.id.slice('group:'.length);
            const groupObj = groups.find((g) => g.id === groupId);
            const internalTransfers = groupObj ? calculateGroupInternalTransfers(balances, groupObj) : [];
            const isNetZero = Math.abs(n.balance) < 0.01;
            const fullySettled = isNetZero && internalTransfers.length === 0;
            const statusLabel = fullySettled
              ? 'settled'
              : isNetZero
                ? 'internal settlement pending'
                : balanceLabel(n.balance, currencySymbol);
            const statusColor = fullySettled
              ? 'var(--color-success)'
              : isNetZero
                ? 'var(--color-warning, #d97706)'
                : balanceColor(n.balance);

            const isExpanded = !!expandedGroups[n.id];
            return (
              <div key={n.id}>
                <div
                  className="balance-row"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => setExpandedGroups({ ...expandedGroups, [n.id]: !isExpanded })}
                  title={`${isExpanded ? 'Collapse' : 'Expand'} ${n.name} group members`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '10px', color: 'var(--text-muted)' }}>{isExpanded ? '▾' : '▸'}</span>
                    <IconMembers size={15} className="icon-sm" />
                    <strong>{n.name}</strong>
                  </span>
                  <span style={{ color: statusColor, fontWeight: '700' }}>
                    {statusLabel}
                  </span>
                </div>
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '22px', marginTop: '4px' }}>
                    {n.memberIds.map((mid) => {
                      const memberBalance = balances.find((b) => b.memberId === mid);
                      if (!memberBalance) return null;
                      return (
                        <div
                          key={mid}
                          className="balance-row"
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px', borderRadius: '8px', cursor: 'pointer' }}
                          onClick={() => onMemberClick(mid)}
                          title={`View ${memberBalance.name}'s expenses`}
                        >
                          <span>{memberBalance.name}</span>
                          <span style={{ color: balanceColor(memberBalance.balance), fontWeight: '600' }}>
                            {balanceLabel(memberBalance.balance, currencySymbol)}
                          </span>
                        </div>
                      );
                    })}

                    {internalTransfers.length > 0 && (
                      <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed rgba(15,23,42,0.08)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Internal settlement needed
                        </span>
                        {internalTransfers.map((it) => {
                          const rowKey = `internal:${it.from}|${it.to}`;
                          return (
                            <TransferRow
                              key={rowKey}
                              transfer={it}
                              rowKey={rowKey}
                              currencySymbol={currencySymbol}
                              isSettled={isTransferSettled(it, activeTripExpenses)}
                              customValue={customAmounts[rowKey] || ''}
                              onCustomChange={(v) => setCustom(rowKey, v)}
                              onSettle={onSettle}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlements List */}
      <div className="glass-card">
        <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Settlement Actions (Minimized)
        </h4>
        {transfers.length === 0 ? (
          <p style={{ color: 'var(--color-success)', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconCheckCircle size={17} className="icon" /> All settlements complete — no outstanding debts.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transfers.map((t) => {
              const rowKey = `${t.from}|${t.to}`;
              const isGroupInvolved = t.from.startsWith('group:') || t.to.startsWith('group:');
              return (
                <TransferRow
                  key={rowKey}
                  transfer={t}
                  rowKey={rowKey}
                  note={isGroupInvolved ? 'group settlement — combined balance' : undefined}
                  currencySymbol={currencySymbol}
                  isSettled={isTransferSettled(t, activeTripExpenses)}
                  customValue={customAmounts[rowKey] || ''}
                  onCustomChange={(v) => setCustom(rowKey, v)}
                  onSettle={onSettle}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
