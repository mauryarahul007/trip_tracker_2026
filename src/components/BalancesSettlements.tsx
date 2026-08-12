import { useState } from 'react';
import type { Expense, Group, Trip } from '../types';
import { buildSettlementNodes, calculateGroupInternalTransfers, type MemberBalance, type Transfer } from '../utils/settlement';
import { IconArrowDownRight, IconArrowUpRight, IconCheck, IconCheckCircle, IconChevronRight, IconEdit, IconMembers } from './Icons';
import { getCurrencySymbol } from '../utils/currency';

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
  isAdmin: boolean;
  myMemberId: string | null;
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

// Icon backs up the colour so owes-vs-gets-back doesn't rely on colour alone.
function BalanceIcon({ balance, settled }: { balance: number; settled?: boolean }) {
  if (settled || Math.abs(balance) < 0.01) return <IconCheck size={12} className="icon-sm" />;
  return balance > 0 ? <IconArrowUpRight size={12} className="icon-sm" /> : <IconArrowDownRight size={12} className="icon-sm" />;
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
  canSettle: boolean;
  customValue: string;
  customOpen: boolean;
  onToggleCustom: () => void;
  onCustomChange: (v: string) => void;
  onSettle: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string) => void;
};

function TransferRow({ transfer: t, note, currencySymbol, isSettled, canSettle, customValue, customOpen, onToggleCustom, onCustomChange, onSettle }: TransferRowProps) {
  const settleAmount = parseFloat(customValue) || t.amount;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1.5px dashed var(--border-color)' }}>
      <div style={{ fontSize: '14px', flex: '1 1 auto', minWidth: 0 }}>
        <strong>{t.fromLabel}</strong> owes <strong>{t.toLabel}</strong>
        {note && (
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{note}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        {!isSettled && !customOpen && (
          <span className="money" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-danger)' }}>
            {currencySymbol} {t.amount.toFixed(2)}
          </span>
        )}
        {isSettled ? (
          <span className="carbon-receipt" title="Recorded once, kept twice — your copy and theirs now match.">
            <span className="cr-back" aria-hidden="true" />
            <span className="cr-front">
              <IconCheck size={13} className="icon-sm" />
              <span>
                <span className="cr-amount">{currencySymbol} {t.amount.toFixed(2)}</span>
                <span className="cr-caption">your copy &middot; their copy</span>
              </span>
            </span>
          </span>
        ) : !canSettle ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Only {t.fromLabel} or {t.toLabel} can settle this</span>
        ) : customOpen ? (
          <>
            <input
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder={t.amount.toFixed(2)}
              title="Custom settlement amount (leave blank to use the suggested amount)"
              autoFocus
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
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 8px' }}
              aria-label="Cancel custom amount"
              title="Use the suggested amount instead"
              onClick={onToggleCustom}
            >
              <span style={{ display: 'flex', transform: 'rotate(90deg)' }}>
                <IconChevronRight size={12} className="icon-sm" />
              </span>
            </button>
          </>
        ) : (
          <>
            <button
              className="gradient-btn"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
              onClick={() => onSettle(t.fromMemberId, t.toMemberId, t.amount, t.fromLabel, t.toLabel)}
            >
              Settle
            </button>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: '6px 8px' }}
              aria-label="Settle for a different amount"
              title="Settle for a different amount"
              onClick={onToggleCustom}
            >
              <IconEdit size={12} className="icon-sm" />
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
  isAdmin,
  myMemberId,
}: Props) {
  const canSettleTransfer = (t: Transfer) => {
    if (isAdmin) return true;
    if (!myMemberId) return false;

    // Check direct involvement
    if (t.fromMemberId === myMemberId || t.toMemberId === myMemberId) return true;

    // If the debtor node is a group, any participant of that group can settle
    if (t.from.startsWith('group:')) {
      const fromGroupId = t.from.slice('group:'.length);
      const fromGroup = groups.find((g) => g.id === fromGroupId);
      if (fromGroup && fromGroup.memberIds.includes(myMemberId)) {
        return true;
      }
    }

    // If the creditor node is a group, any participant of that group can settle
    if (t.to.startsWith('group:')) {
      const toGroupId = t.to.slice('group:'.length);
      const toGroup = groups.find((g) => g.id === toGroupId);
      if (toGroup && toGroup.memberIds.includes(myMemberId)) {
        return true;
      }
    }

    return false;
  };
  const currencySymbol = getCurrencySymbol(trip.baseCurrency);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customOpenKeys, setCustomOpenKeys] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const balanceNodes = buildSettlementNodes(balances, groups);

  const setCustom = (rowKey: string, v: string) => setCustomAmounts({ ...customAmounts, [rowKey]: v });
  const toggleCustomOpen = (rowKey: string) => setCustomOpenKeys({ ...customOpenKeys, [rowKey]: !customOpenKeys[rowKey] });

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
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}><strong>{n.name}</strong></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: balanceColor(n.balance), fontWeight: '700', flexShrink: 0, marginLeft: '8px' }}>
                    <BalanceIcon balance={n.balance} />
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
                ? 'var(--color-warning)'
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto' }}>
                    <span style={{ display: 'flex', color: 'var(--text-muted)', flexShrink: 0, transition: 'transform 0.15s ease', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                      <IconChevronRight size={12} className="icon-sm" />
                    </span>
                    <IconMembers size={15} className="icon-sm" />
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{n.name}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: statusColor, fontWeight: '700', flexShrink: 0, marginLeft: '8px' }}>
                    {!isNetZero && <BalanceIcon balance={n.balance} />}
                    {fullySettled && <BalanceIcon balance={0} settled />}
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
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>{memberBalance.name}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: balanceColor(memberBalance.balance), fontWeight: '600', flexShrink: 0, marginLeft: '8px' }}>
                            <BalanceIcon balance={memberBalance.balance} />
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
                              canSettle={canSettleTransfer(it)}
                              customValue={customAmounts[rowKey] || ''}
                              customOpen={!!customOpenKeys[rowKey]}
                              onToggleCustom={() => toggleCustomOpen(rowKey)}
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
          Fewest Payments to Clear It
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
                  canSettle={canSettleTransfer(t)}
                  customValue={customAmounts[rowKey] || ''}
                  customOpen={!!customOpenKeys[rowKey]}
                  onToggleCustom={() => toggleCustomOpen(rowKey)}
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
