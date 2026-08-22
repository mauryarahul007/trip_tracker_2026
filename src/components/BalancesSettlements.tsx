import { useState } from 'react';
import type { Expense, Group, Member, Trip } from '../types';
import { buildSettlementNodes, calculateGroupInternalTransfers, type MemberBalance, type Transfer } from '../utils/settlement';
import { IconArrowDownRight, IconArrowUpRight, IconCheck, IconCheckCircle, IconChevronRight, IconEdit, IconMembers } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { sendPushNotification } from '../services/pushApi';
import { usePrivacyStore, formatMaskedAmount } from '../store/privacyStore';
import { triggerHaptic } from '../utils/haptics';
import { BalanceFlowGraph } from './BalanceFlowGraph';

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
  members: Record<string, Member>;
};

function balanceColor(balance: number): string {
  if (balance > 0.01) return 'var(--color-success)';
  if (balance < -0.01) return 'var(--color-danger)';
  return 'var(--text-secondary)';
}

function balanceLabel(balance: number, currencySymbol: string, isBlindMode: boolean = false): string {
  const absVal = formatMaskedAmount(Math.abs(balance).toFixed(2), currencySymbol, isBlindMode);
  if (balance > 0.01) return `gets back ${absVal}`;
  if (balance < -0.01) return `owes ${absVal}`;
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
  tripId: string;
  tripName?: string;
  note?: string;
  currencySymbol: string;
  isSettled: boolean;
  canSettle: boolean;
  customValue: string;
  customOpen: boolean;
  onToggleCustom: () => void;
  onCustomChange: (v: string) => void;
  onSettle: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string) => void;
  balances: MemberBalance[];
  groups: Group[];
  activeTripExpenses: Expense[];
  members: Record<string, Member>;
};

interface MemberAuditDetails {
  memberId: string;
  name: string;
  netBalance: number;
  totalPaid: number;
  totalOwed: number;
  contributions: {
    expenseId: string;
    title: string;
    date: string;
    paid: number;
    owed: number;
    net: number;
  }[];
}

interface NodeAuditDetails {
  nodeName: string;
  isGroup: boolean;
  combinedBalance: number;
  members: MemberAuditDetails[];
}

function getAuditDetailsForNode(
  nodeId: string,
  nodeName: string,
  balances: MemberBalance[],
  groups: Group[],
  activeTripExpenses: Expense[]
): NodeAuditDetails {
  const isGroup = nodeId.startsWith('group:');
  let memberIds: string[] = [];

  if (isGroup) {
    const groupId = nodeId.slice('group:'.length);
    const group = groups.find((g) => g.id === groupId);
    memberIds = group ? group.memberIds : [];
  } else {
    memberIds = [nodeId.slice('member:'.length)];
  }

  const memberAudits: MemberAuditDetails[] = memberIds.map((mid) => {
    const name = balances.find((b) => b.memberId === mid)?.name || 'Deleted Member';
    const netBalance = balances.find((b) => b.memberId === mid)?.balance || 0;

    const contributions = activeTripExpenses
      .map((exp) => {
        const paid = exp.paidBy === mid ? exp.amount : 0;
        const owed = exp.resolvedShares[mid] || 0;
        return {
          expenseId: exp.id,
          title: exp.title,
          date: exp.date,
          paid,
          owed,
          net: paid - owed
        };
      })
      .filter((c) => Math.abs(c.paid) > 0.01 || Math.abs(c.owed) > 0.01);

    const totalPaid = contributions.reduce((sum, c) => sum + c.paid, 0);
    const totalOwed = contributions.reduce((sum, c) => sum + c.owed, 0);

    return {
      memberId: mid,
      name,
      netBalance,
      totalPaid,
      totalOwed,
      contributions
    };
  });

  const combinedBalance = memberAudits.reduce((sum, m) => sum + m.netBalance, 0);

  return {
    nodeName,
    isGroup,
    combinedBalance,
    members: memberAudits
  };
}

function TransferRow({
  transfer: t,
  tripId,
  tripName,
  note,
  currencySymbol,
  isSettled,
  canSettle,
  customValue,
  customOpen,
  onToggleCustom,
  onCustomChange,
  onSettle,
  balances,
  groups,
  activeTripExpenses,
  members
}: TransferRowProps) {
  const settleAmount = parseFloat(customValue) || t.amount;
  const [showAudit, setShowAudit] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'sending' | 'sent' | 'rateLimited'>('idle');

  const fromAudit = getAuditDetailsForNode(t.from, t.fromLabel, balances, groups, activeTripExpenses);
  const toAudit = getAuditDetailsForNode(t.to, t.toLabel, balances, groups, activeTripExpenses);

  const handleRemind = async () => {
    const fromLinkedUserId = members[t.fromMemberId]?.linkedUserId;
    if (!fromLinkedUserId) return;
    setReminderStatus('sending');
    const result = await sendPushNotification(
      [fromLinkedUserId],
      tripName || 'Trip Tracker',
      'settlement_reminder',
      { toLabel: t.toLabel, amount: t.amount.toFixed(2), currency: currencySymbol, fromMemberId: t.fromMemberId, toMemberId: t.toMemberId },
      tripId
    );
    setReminderStatus(result.ok ? 'sent' : result.rateLimited ? 'rateLimited' : 'idle');
  };

  const remindLabel =
    reminderStatus === 'sending' ? 'Sending…' :
    reminderStatus === 'sent' ? '✓ Reminded' :
    reminderStatus === 'rateLimited' ? 'Already reminded today' :
    '🔔 Remind';

  return (
    <div style={{
      padding: '12px 0',
      borderBottom: '1.5px dashed var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {/* Top Row: Flow of money and Amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '14px', minWidth: 0, flex: '1 1 auto' }}>
          <span style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>
            <strong style={{ fontWeight: '600' }}>{t.fromLabel}</strong>
            <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>➔</span>
            <strong style={{ fontWeight: '600' }}>{t.toLabel}</strong>
          </span>
          {note && (
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {note}
            </span>
          )}
        </div>

        {/* Amount Display */}
        {!isSettled && !customOpen && (
          <span className="amount-mono privacy-blur" style={{
            fontSize: '16px',
            fontWeight: '700',
            color: 'var(--color-danger)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {currencySymbol}{t.amount.toFixed(2)}
          </span>
        )}

        {isSettled && (
          <span className="carbon-receipt" style={{ flexShrink: 0 }} title="Recorded once, kept twice — your copy and theirs now match.">
            <span className="cr-back" aria-hidden="true" />
            <span className="cr-front" style={{ padding: '4px 8px' }}>
              <IconCheck size={12} className="icon-sm" />
              <span>
                <span className="cr-amount privacy-blur" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>{currencySymbol}{t.amount.toFixed(2)}</span>
                <span className="cr-caption" style={{ fontSize: '9px' }}>your copy &middot; their copy</span>
              </span>
            </span>
          </span>
        )}
      </div>

      {/* Audit Trail Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={() => setShowAudit(!showAudit)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-accent)',
            fontSize: '11.5px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '2px 0',
            textDecoration: 'underline',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {showAudit ? 'Hide calculation details' : 'Show calculation details'}
        </button>
      </div>

      {/* Collapsible Audit Trail breakdown view */}
      {showAudit && (
        <div style={{
          background: 'rgba(15,23,42,0.015)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          padding: '12px 14px',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '2px'
        }}>
          <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: 0 }}>
            Simplified Settlement Audit Trail
          </h5>

          {/* Debtor Info */}
          <div>
            <strong style={{ color: 'var(--color-danger)' }}>{fromAudit.nodeName} combined debt source:</strong>
            <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {fromAudit.members.map((m) => (
                <div key={m.memberId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span className="privacy-blur" style={{ color: 'var(--text-secondary)' }}>
                      {' '}(Paid: {currencySymbol}{m.totalPaid.toFixed(2)}, Share: {currencySymbol}{m.totalOwed.toFixed(2)})
                    </span>
                  </span>
                  <span className="privacy-blur" style={{ fontWeight: 600, color: m.netBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {m.netBalance >= 0 ? '+' : ''}{currencySymbol}{m.netBalance.toFixed(2)}
                  </span>
                </div>
              ))}
              {fromAudit.members.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 600 }}>
                  <span>Combined Net:</span>
                  <span className="privacy-blur" style={{ color: fromAudit.combinedBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {fromAudit.combinedBalance >= 0 ? '+' : ''}{currencySymbol}{fromAudit.combinedBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Creditor Info */}
          <div>
            <strong style={{ color: 'var(--color-success)' }}>{toAudit.nodeName} combined credit source:</strong>
            <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {toAudit.members.map((m) => (
                <div key={m.memberId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span className="privacy-blur" style={{ color: 'var(--text-secondary)' }}>
                      {' '}(Paid: {currencySymbol}{m.totalPaid.toFixed(2)}, Share: {currencySymbol}{m.totalOwed.toFixed(2)})
                    </span>
                  </span>
                  <span className="privacy-blur" style={{ fontWeight: 600, color: m.netBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {m.netBalance >= 0 ? '+' : ''}{currencySymbol}{m.netBalance.toFixed(2)}
                  </span>
                </div>
              ))}
              {toAudit.members.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '2px', fontWeight: 600 }}>
                  <span>Combined Net:</span>
                  <span className="privacy-blur" style={{ color: toAudit.combinedBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {toAudit.combinedBalance >= 0 ? '+' : ''}{currencySymbol}{toAudit.combinedBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Algorithm Explanation */}
          <div style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '6px',
            marginTop: '2px',
            fontStyle: 'italic',
            lineHeight: '1.4'
          }}>
            The simplification engine combined and matched these balances ({fromAudit.nodeName}: <span className="privacy-blur">{currencySymbol}{fromAudit.combinedBalance.toFixed(2)}</span> and {toAudit.nodeName}: <span className="privacy-blur">{currencySymbol}{toAudit.combinedBalance.toFixed(2)}</span>) to reduce total payment transactions on this trip.
          </div>
        </div>
      )}

      {/* Bottom Row: Actions or helper message */}
      {!isSettled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {!canSettle ? (
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              background: 'rgba(15,23,42,0.03)',
              padding: '4px 8px',
              borderRadius: '4px',
              width: '100%',
              textAlign: 'left'
            }}>
              Only members of either group can record this settlement
            </span>
          ) : customOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: 'auto' }}>Custom amount:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-field"
                  placeholder={t.amount.toFixed(2)}
                  title="Custom settlement amount"
                  autoFocus
                  value={customValue}
                  onChange={(e) => {
                     const v = e.target.value;
                     if (/^\d*\.?\d*$/.test(v)) onCustomChange(v);
                  }}
                  style={{ width: '80px', padding: '4px 8px', fontSize: '12px', height: '28px', margin: 0 }}
                />
                <button
                  className="gradient-btn"
                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: 'var(--border-radius-sm)', height: '28px' }}
                  onClick={() => {
                    triggerHaptic('success');
                    onSettle(t.fromMemberId, t.toMemberId, settleAmount, t.fromLabel, t.toLabel);
                  }}
                >
                  Settle
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '6px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Cancel custom amount"
                  title="Use suggested amount"
                  onClick={onToggleCustom}
                >
                  <span style={{ display: 'flex', transform: 'rotate(90deg)' }}>
                    <IconChevronRight size={10} className="icon-sm" />
                  </span>
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  onClick={handleRemind}
                  disabled={!members[t.fromMemberId]?.linkedUserId || reminderStatus === 'sending' || reminderStatus === 'sent' || reminderStatus === 'rateLimited'}
                  title={members[t.fromMemberId]?.linkedUserId ? 'Send a reminder' : 'This member has no linked account to notify'}
                >
                  {remindLabel}
                </button>
              </div>

              {/* Partial Settlement Quick Chips & Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Split:</span>
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="split-preset-chip"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => {
                      triggerHaptic('light');
                      const amt = Math.round((t.amount * (pct / 100)) * 100) / 100;
                      onCustomChange(String(amt));
                    }}
                  >
                    {pct}% ({currencySymbol}{Math.round(t.amount * (pct / 100))})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="gradient-btn"
                style={{ padding: '6px 14px', fontSize: '11px', borderRadius: 'var(--border-radius-sm)', height: '28px' }}
                onClick={() => {
                  triggerHaptic('success');
                  onSettle(t.fromMemberId, t.toMemberId, t.amount, t.fromLabel, t.toLabel);
                }}
              >
                Settle
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '6px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Settle for a different amount"
                title="Settle for a different amount"
                onClick={onToggleCustom}
              >
                <IconEdit size={10} className="icon-sm" />
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                onClick={handleRemind}
                disabled={!members[t.fromMemberId]?.linkedUserId || reminderStatus === 'sending' || reminderStatus === 'sent' || reminderStatus === 'rateLimited'}
                title={members[t.fromMemberId]?.linkedUserId ? 'Send a reminder' : 'This member has no linked account to notify'}
              >
                {remindLabel}
              </button>
            </div>
          )}
        </div>
      )}
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
  members,
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
  const isBlindMode = usePrivacyStore((s) => s.isBlindMode);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customOpenKeys, setCustomOpenKeys] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [settlementViewMode, setSettlementViewMode] = useState<'list' | 'graph'>('list');
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
          <div className="bp-amount privacy-blur" style={{ color: isFullySettled ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatMaskedAmount(totalOutstanding.toFixed(2), currencySymbol, isBlindMode)}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
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
                <span style={{ minWidth: 0, flex: '1 1 auto', lineHeight: '1.3', paddingRight: '8px' }}><strong>{n.name}</strong></span>
                <span className="privacy-blur" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: balanceColor(n.balance), fontWeight: '700', flexShrink: 0, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  <BalanceIcon balance={n.balance} />
                  {balanceLabel(n.balance, currencySymbol, isBlindMode)}
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
              : balanceLabel(n.balance, currencySymbol, isBlindMode);
          const statusColor = fullySettled
            ? 'var(--color-success)'
            : isNetZero
              ? 'var(--color-warning)'
              : balanceColor(n.balance);
          const isExpanded = !!expandedGroups[groupId];

          return (
            <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                className="balance-row"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setExpandedGroups({ ...expandedGroups, [groupId]: !isExpanded })}
                title="Click to toggle group member breakdown"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto', lineHeight: '1.3', paddingRight: '8px' }}>
                  <IconMembers size={14} className="icon-sm" />
                  <strong>{n.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
                    <IconChevronRight size={12} className="icon-sm" />
                  </span>
                </span>
                <span className="privacy-blur" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: statusColor, fontWeight: '700', flexShrink: 0, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  <BalanceIcon balance={n.balance} settled={fullySettled} />
                  {statusLabel}
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginLeft: '16px', paddingLeft: '10px', borderLeft: '2px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px', marginBottom: '4px' }}>
                  {n.memberIds.map((memId) => {
                    const memberBalance = balances.find((b) => b.memberId === memId);
                    const bal = memberBalance ? memberBalance.balance : 0;
                    return (
                      <div
                        key={memId}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', padding: '4px 0', cursor: 'pointer' }}
                        onClick={() => onMemberClick(memId)}
                        title={`View ${members[memId]?.name || 'Member'}'s expenses`}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>{members[memId]?.name || 'Member'}</span>
                        <span className="privacy-blur" style={{ color: balanceColor(bal), fontWeight: '600' }}>
                          {balanceLabel(bal, currencySymbol, isBlindMode)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settlements Section with View Switcher */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Fewest Payments to Clear It
          </h4>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className={`pill-chip ${settlementViewMode === 'list' ? 'active' : ''}`}
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '12px',
                border: 'none',
                background: settlementViewMode === 'list' ? 'var(--primary-accent)' : 'transparent',
                color: settlementViewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => setSettlementViewMode('list')}
            >
              📋 List
            </button>
            <button
              type="button"
              className={`pill-chip ${settlementViewMode === 'graph' ? 'active' : ''}`}
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '12px',
                border: 'none',
                background: settlementViewMode === 'graph' ? 'var(--primary-accent)' : 'transparent',
                color: settlementViewMode === 'graph' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => setSettlementViewMode('graph')}
            >
              🕸️ Flow Graph
            </button>
          </div>
        </div>

        {settlementViewMode === 'graph' ? (
          <BalanceFlowGraph
            transfers={transfers}
            members={members}
            currency={trip.baseCurrency}
            onSettle={onSettle}
            canSettle={isAdmin || !!myMemberId}
          />
        ) : transfers.length === 0 ? (
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
                  tripId={trip.id}
                  tripName={trip.name}
                  note={isGroupInvolved ? 'group settlement — combined balance' : undefined}
                  currencySymbol={currencySymbol}
                  isSettled={isTransferSettled(t, activeTripExpenses)}
                  canSettle={canSettleTransfer(t)}
                  customValue={customAmounts[rowKey] || ''}
                  customOpen={!!customOpenKeys[rowKey]}
                  onToggleCustom={() => toggleCustomOpen(rowKey)}
                  onCustomChange={(v) => setCustom(rowKey, v)}
                  onSettle={onSettle}
                  balances={balances}
                  groups={groups}
                  activeTripExpenses={activeTripExpenses}
                  members={members}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
