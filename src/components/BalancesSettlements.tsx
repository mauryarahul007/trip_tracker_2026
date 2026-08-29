import { useState, useRef, useEffect } from 'react';
import type { Expense, Group, Member, Trip } from '../types';
import type { MemberBalance, Transfer } from '../utils/settlement';
import { IconEdit, IconShare } from './Icons';
import { getCurrencySymbol } from '../utils/currency';
import { sendPushNotification } from '../services/pushApi';
import { useTripStore } from '../store/tripStore';
import { avatarColorForName } from '../utils/avatarColor';
import { initial } from '../utils/initials';
import { triggerHaptic } from '../utils/haptics';
import { UpiPaymentModal } from './UpiPaymentModal';
import { BoardingPassHeroCard } from './BoardingPassHeroCard';
import { StickyBalanceBar } from './StickyBalanceBar';


type Props = {
  trip: Trip;
  balances: MemberBalance[];
  groups: Group[];
  transfers: Transfer[];
  activeTripExpenses: Expense[];
  onSettle: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string, totalDebt?: number) => void;
  isAdmin: boolean;
  myMemberId: string | null;
  members: Record<string, Member>;
  onOpenSquadBadges?: () => void;
  // Cross-linking: tapping a person's balance routes to the ledger,
  // pre-filtered to transactions involving them.
  onMemberClick?: (memberId: string) => void;
};



type TransferRowProps = {
  transfer: Transfer;
  rowKey: string;
  tripId: string;
  tripName?: string;
  note?: string;
  currencySymbol: string;
  myMemberId: string | null;
  isSettled: boolean;
  canSettle: boolean;
  customValue: string;
  customOpen: boolean;
  onToggleCustom: () => void;
  onCustomChange: (v: string) => void;
  onSettle: (fromMemberId: string, toMemberId: string, amount: number, fromLabel: string, toLabel: string, totalDebt?: number) => void;
  onOpenUpi?: (transfer: Transfer) => void;
  isUpiEnabled?: boolean;
  balances: MemberBalance[];
  groups: Group[];
  activeTripExpenses: Expense[];
  members: Record<string, Member>;
  onMemberClick?: (memberId: string) => void;
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
  myMemberId,
  canSettle,
  customValue,
  customOpen,
  onToggleCustom,
  onCustomChange,
  onSettle,
  onOpenUpi,
  isUpiEnabled,
  balances,
  groups,
  activeTripExpenses,
  members,
  onMemberClick,
}: Omit<TransferRowProps, 'isSettled'> & { isSettled?: boolean }) {
  const settleAmount = parseFloat(customValue) || t.amount;
  const [showAudit, setShowAudit] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'sending' | 'sent' | 'rateLimited'>('idle');

  const fromAudit = getAuditDetailsForNode(t.from, t.fromLabel, balances, groups, activeTripExpenses);
  const toAudit = getAuditDetailsForNode(t.to, t.toLabel, balances, groups, activeTripExpenses);

  const isYouPayer = !t.from.startsWith('group:') && t.fromMemberId === myMemberId;
  const isYouReceiver = !t.to.startsWith('group:') && t.toMemberId === myMemberId;
  const otherMemberId = isYouPayer ? t.toMemberId : t.fromMemberId;
  const debtorMember = members[t.fromMemberId];
  const creditorMember = members[t.toMemberId];

  const displayAvatarUrl = isYouPayer
    ? creditorMember?.avatarUrl
    : isYouReceiver
    ? debtorMember?.avatarUrl
    : debtorMember?.avatarUrl;

  const displayName = isYouPayer
    ? t.toLabel
    : isYouReceiver
    ? t.fromLabel
    : t.fromLabel;

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
    reminderStatus === 'rateLimited' ? 'Already reminded' :
    '🔔 Remind';

  const [shareCopied, setShareCopied] = useState(false);

  const handleShareReminder = async () => {
    triggerHaptic('light');
    const shareText = `Hey ${t.fromLabel}, just a reminder to settle ${currencySymbol}${settleAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${t.toLabel} for our trip "${tripName || 'Trip'}".`;

    const copyToClipboard = () => {
      navigator.clipboard.writeText(shareText).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trip Settlement Reminder',
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div
      className="traveler-settlement-card"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '28px',
        padding: '18px 20px',
        marginBottom: '12px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="traveler-settlement-main-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          width: '100%',
        }}
      >
        {/* Large 56px Avatar */}
        <div
          onClick={onMemberClick ? () => onMemberClick(otherMemberId) : undefined}
          style={{ cursor: onMemberClick ? 'pointer' : undefined, flexShrink: 0 }}
        >
          {displayAvatarUrl ? (
            <img
              src={displayAvatarUrl}
              alt={displayName}
              className="traveler-settlement-avatar"
              style={{
                width: '56px',
                height: '56px',
                minWidth: '56px',
                minHeight: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--bg-surface)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.14)',
                display: 'block',
              }}
            />
          ) : (
            <div
              className="traveler-settlement-avatar"
              style={{
                width: '56px',
                height: '56px',
                minWidth: '56px',
                minHeight: '56px',
                borderRadius: '50%',
                background: avatarColorForName(displayName),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '20px',
                border: '2px solid var(--bg-surface)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.14)',
              }}
            >
              {initial(displayName)}
            </div>
          )}
        </div>

        {/* Member Name & Debt Info */}
        <div
          className="traveler-settlement-info"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <h3
            className="traveler-settlement-name"
            onClick={onMemberClick ? () => onMemberClick(otherMemberId) : undefined}
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              cursor: onMemberClick ? 'pointer' : undefined,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isYouPayer ? t.toLabel : isYouReceiver ? t.fromLabel : t.fromLabel}
          </h3>
          <p
            className="traveler-settlement-desc"
            style={{
              fontSize: '13.5px',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {isYouPayer ? (
              <>
                You owe{' '}
                <strong
                  className="traveler-settlement-amount owe"
                  style={{
                    color: 'var(--accent-orange, #FF7A00)',
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  {currencySymbol}
                  {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </>
            ) : isYouReceiver ? (
              <>
                Owes you{' '}
                <strong
                  className="traveler-settlement-amount owed"
                  style={{
                    color: 'var(--primary-accent, #0F6F63)',
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  {currencySymbol}
                  {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </>
            ) : (
              <>
                Owes {t.toLabel}{' '}
                <strong
                  className="traveler-settlement-amount owed"
                  style={{
                    color: 'var(--primary-accent, #0F6F63)',
                    fontFamily: 'var(--font-family-mono)',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  {currencySymbol}
                  {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </>
            )}
          </p>
          {note && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {note}
            </p>
          )}
        </div>

        {/* Audit breakdown button */}
        <button
          type="button"
          onClick={() => setShowAudit(!showAudit)}
          aria-expanded={showAudit}
          aria-label={showAudit ? 'Hide settlement breakdown' : 'Why this amount?'}
          title={showAudit ? 'Hide settlement breakdown' : 'Why this amount?'}
          className="traveler-settlement-audit-btn"
          style={{
            width: '28px',
            height: '28px',
            minWidth: '28px',
            borderRadius: '50%',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ⓘ
        </button>
      </div>

      {/* Main Settle Up Action Button */}
      {canSettle ? (
        !customOpen ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('success');
              onSettle(t.fromMemberId, t.toMemberId, t.amount, t.fromLabel, t.toLabel, t.amount);
            }}
            className="traveler-settlement-btn-settle"
            style={{
              width: '100%',
              padding: '13px 20px',
              background: 'linear-gradient(135deg, #FF7A00 0%, #EA580C 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(255, 122, 0, 0.28)',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, filter 0.15s ease',
            }}
          >
            <span>Settle Up</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', paddingTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ flex: 1, padding: '8px 12px', fontSize: '14px', height: '38px', margin: 0 }}
              />
              <button
                type="button"
                className="gradient-btn"
                style={{ padding: '0 16px', height: '38px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}
                onClick={() => {
                  triggerHaptic('success');
                  onSettle(t.fromMemberId, t.toMemberId, settleAmount, t.fromLabel, t.toLabel, t.amount);
                  onToggleCustom();
                  onCustomChange('');
                }}
              >
                Settle {currencySymbol}{settleAmount.toFixed(2)}
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '0 12px', height: '38px', borderRadius: '9999px', fontSize: '12px' }}
                onClick={onToggleCustom}
                aria-label="Cancel custom amount"
              >
                Cancel
              </button>
            </div>

            {/* Quick Percentage Split Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Split:</span>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className="split-preset-chip"
                  style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px' }}
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
        )
      ) : (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Settlement recorded by {t.fromLabel} or admins
        </div>
      )}

      {/* Auxiliary Action Pill Bar */}
      <div
        className="traveler-settlement-actions-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-color)',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isUpiEnabled && canSettle && (
            <button
              type="button"
              className="traveler-settlement-action-chip upi"
              style={{
                padding: '5px 10px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: 'rgba(63, 203, 189, 0.1)',
                color: 'var(--primary-accent)',
                border: '1px solid rgba(63, 203, 189, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
              onClick={() => onOpenUpi?.(t)}
              title="1-Tap UPI Settlement (GPay, PhonePe, Paytm, or Dynamic QR)"
            >
              ⚡ UPI Pay
            </button>
          )}

          {canSettle && !customOpen && (
            <button
              type="button"
              className="traveler-settlement-action-chip"
              style={{
                padding: '5px 10px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
              onClick={onToggleCustom}
            >
              <IconEdit size={12} />
              <span>Custom Amt</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {members[t.fromMemberId]?.linkedUserId && (
            <button
              type="button"
              className="traveler-settlement-action-chip"
              style={{
                padding: '5px 10px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                opacity: reminderStatus === 'sending' || reminderStatus === 'sent' || reminderStatus === 'rateLimited' ? 0.5 : 1,
              }}
              onClick={handleRemind}
              disabled={reminderStatus === 'sending' || reminderStatus === 'sent' || reminderStatus === 'rateLimited'}
            >
              {remindLabel}
            </button>
          )}

          <button
            type="button"
            className="traveler-settlement-action-chip"
            style={{
              padding: '5px 10px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
            onClick={handleShareReminder}
            title="Share reminder text via WhatsApp or system share"
          >
            <IconShare size={12} />
            <span>{shareCopied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Audit Breakdown dropdown */}
      {showAudit && (
        <div
          className="traveler-settlement-audit-panel"
          style={{
            marginTop: '8px',
            padding: '12px 14px',
            background: 'rgba(15, 23, 42, 0.03)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <h5 style={{ fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', margin: 0 }}>
            Settlement Calculation Details
          </h5>

          <div>
            <strong style={{ color: 'var(--color-danger, #F87171)' }}>{fromAudit.nodeName} debt source:</strong>
            <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {fromAudit.members.map((m) => (
                <div key={m.memberId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                      (Paid: {currencySymbol}{m.totalPaid.toFixed(2)}, Share: {currencySymbol}{m.totalOwed.toFixed(2)})
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-family-mono)',
                      color: m.netBalance < 0 ? 'var(--color-danger, #F87171)' : 'var(--color-success, #34D399)',
                    }}
                  >
                    {m.netBalance >= 0 ? '+' : ''}{currencySymbol}{m.netBalance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <strong style={{ color: 'var(--color-success, #34D399)' }}>{toAudit.nodeName} credit source:</strong>
            <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {toAudit.members.map((m) => (
                <div key={m.memberId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                  <span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                      (Paid: {currencySymbol}{m.totalPaid.toFixed(2)}, Share: {currencySymbol}{m.totalOwed.toFixed(2)})
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-family-mono)',
                      color: m.netBalance < 0 ? 'var(--color-danger, #F87171)' : 'var(--color-success, #34D399)',
                    }}
                  >
                    {m.netBalance >= 0 ? '+' : ''}{currencySymbol}{m.netBalance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
  onSettle,
  isAdmin,
  myMemberId,
  members,
  onOpenSquadBadges,
  onMemberClick,
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
  const [upiTargetTransfer, setUpiTargetTransfer] = useState<Transfer | null>(null);


  const isUpiEnabled = useTripStore((s) => s.isFeatureEnabled('enableUpiPayments', { tripId: trip.id }));

  const setCustom = (rowKey: string, v: string) => setCustomAmounts({ ...customAmounts, [rowKey]: v });
  const toggleCustomOpen = (rowKey: string) => setCustomOpenKeys({ ...customOpenKeys, [rowKey]: !customOpenKeys[rowKey] });

  const [remindAllStatus, setRemindAllStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const remindableTransfers = transfers.filter((t) => members[t.fromMemberId]?.linkedUserId);
  const remindableCount = remindableTransfers.length;
  const handleRemindAll = async () => {
    triggerHaptic('light');
    setRemindAllStatus('sending');
    // Each send is independently best-effort (sendPushNotification never
    // throws) and the server's 24h-per-pair cooldown still applies per
    // transfer -- so this just fans out the same single reminder every
    // row's own button already sends, batched into one tap.
    await Promise.all(
      remindableTransfers.map((t) =>
        sendPushNotification(
          [members[t.fromMemberId]!.linkedUserId as string],
          trip.name || 'Trip Tracker',
          'settlement_reminder',
          { toLabel: t.toLabel, amount: t.amount.toFixed(2), currency: currencySymbol, fromMemberId: t.fromMemberId, toMemberId: t.toMemberId },
          trip.id
        )
      )
    );
    setRemindAllStatus('done');
    setTimeout(() => setRemindAllStatus('idle'), 3000);
  };

  const heroRef = useRef<HTMLDivElement>(null);
  const [isStickyBarVisible, setIsStickyBarVisible] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isPast = !entry.isIntersecting && entry.boundingClientRect.top < 80;
        setIsStickyBarVisible(isPast);
      },
      { threshold: 0 }
    );
    observer.observe(el);

    const pane = document.querySelector('.tab-pane');
    const handlePaneScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setIsStickyBarVisible(rect.bottom <= 60);
      }
    };
    pane?.addEventListener('scroll', handlePaneScroll, { passive: true });

    return () => {
      observer.disconnect();
      pane?.removeEventListener('scroll', handlePaneScroll);
    };
  }, []);


  const totalOutstanding = transfers.reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = activeTripExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isFullySettled = transfers.length === 0;

  const myBalanceObj = myMemberId ? balances.find((b) => b.memberId === myMemberId) : null;
  const myNetBalance = myBalanceObj ? myBalanceObj.balance : 0;

  const handleScrollToTop = () => {
    const pane = document.querySelector('.tab-pane');
    if (pane) {
      pane.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div id="balances-section">
      <StickyBalanceBar
        trip={trip}
        currencySymbol={currencySymbol}
        totalSpent={totalSpent}
        myNetBalance={myNetBalance}
        isFullySettled={isFullySettled}
        isVisible={isStickyBarVisible}
        onScrollToTop={handleScrollToTop}
      />

      {/* 3D Flip Boarding-pass balance summary */}
      <div ref={heroRef} style={{ marginTop: '16px' }}>
        <BoardingPassHeroCard
          trip={trip}
          currencySymbol={currencySymbol}
          totalOutstanding={totalOutstanding}
          isFullySettled={isFullySettled}
          transfers={transfers}
          balancesCount={balances.length}
          currentMember={myMemberId ? members[myMemberId] : undefined}
          onOpenSquadBadges={onOpenSquadBadges}
        />
      </div>

      {/* 1. Suggested Settlements Section ("Who Owes Who") */}
      <section className="settlements-section" style={{ marginTop: '20px' }} aria-label="Who owes who settlements">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            padding: '0 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Who owes who
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '9999px',
                background: isFullySettled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(63, 203, 189, 0.12)',
                color: isFullySettled ? 'var(--color-success)' : 'var(--primary-accent)',
              }}
            >
              {isFullySettled ? 'All Settled' : `${transfers.length} Action${transfers.length === 1 ? '' : 's'}`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdmin && remindableCount >= 2 && (
              <button
                type="button"
                className="secondary-btn"
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '9999px' }}
                disabled={remindAllStatus === 'sending'}
                onClick={handleRemindAll}
              >
                {remindAllStatus === 'sending' ? 'Sending…' : remindAllStatus === 'done' ? '✓ Reminded' : `🔔 Remind all (${remindableCount})`}
              </button>
            )}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'var(--font-family-mono)',
                color: isFullySettled ? 'var(--color-success)' : 'var(--accent-orange, #FF7A00)',
              }}
            >
              {isFullySettled ? '₹0.00' : `${currencySymbol}${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>



        {/* Transfer Cards List with Smart Grouping */}
        {transfers.length === 0 ? (
          <div
            className="traveler-settlement-card"
            style={{
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              ✓
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              All Balances Settled
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Every member is squared away — nothing left to settle!
            </p>
          </div>
        ) : (
          (() => {
            const myTransfers = transfers.filter(
              (t) => (!t.from.startsWith('group:') && t.fromMemberId === myMemberId) || (!t.to.startsWith('group:') && t.toMemberId === myMemberId)
            );
            const otherTransfers = transfers.filter(
              (t) => !myTransfers.includes(t)
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {myTransfers.length > 0 && (
                  <>
                    {otherTransfers.length > 0 && (
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 4px', marginBottom: '4px' }}>
                        Your Settlements
                      </div>
                    )}
                    {myTransfers.map((t) => {
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
                          myMemberId={myMemberId}
                          canSettle={canSettleTransfer(t)}
                          customValue={customAmounts[rowKey] || ''}
                          customOpen={!!customOpenKeys[rowKey]}
                          onToggleCustom={() => toggleCustomOpen(rowKey)}
                          onCustomChange={(v) => setCustom(rowKey, v)}
                          onSettle={onSettle}
                          onOpenUpi={(t) => setUpiTargetTransfer(t)}
                          isUpiEnabled={isUpiEnabled}
                          balances={balances}
                          groups={groups}
                          activeTripExpenses={activeTripExpenses}
                          members={members}
                          onMemberClick={onMemberClick}
                        />
                      );
                    })}
                  </>
                )}

                {otherTransfers.length > 0 && (
                  <>
                    {myTransfers.length > 0 && (
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 4px', marginTop: '12px', marginBottom: '4px' }}>
                        Other Group Settlements
                      </div>
                    )}
                    {otherTransfers.map((t) => {
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
                          myMemberId={myMemberId}
                          canSettle={canSettleTransfer(t)}
                          customValue={customAmounts[rowKey] || ''}
                          customOpen={!!customOpenKeys[rowKey]}
                          onToggleCustom={() => toggleCustomOpen(rowKey)}
                          onCustomChange={(v) => setCustom(rowKey, v)}
                          onSettle={onSettle}
                          onOpenUpi={(t) => setUpiTargetTransfer(t)}
                          isUpiEnabled={isUpiEnabled}
                          balances={balances}
                          groups={groups}
                          activeTripExpenses={activeTripExpenses}
                          members={members}
                          onMemberClick={onMemberClick}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            );
          })()
        )}
      </section>

      {/* 1-Tap UPI Payment Deep Link & QR Code Modal */}
      {upiTargetTransfer && (
        <UpiPaymentModal
          fromMember={members[upiTargetTransfer.fromMemberId]}
          toMember={members[upiTargetTransfer.toMemberId]}
          amount={parseFloat(customAmounts[`${upiTargetTransfer.from}|${upiTargetTransfer.to}`]) || upiTargetTransfer.amount}
          currency={trip.baseCurrency}
          tripName={trip.name}
          onClose={() => setUpiTargetTransfer(null)}
          onConfirmSettled={() => {
            const amt = parseFloat(customAmounts[`${upiTargetTransfer.from}|${upiTargetTransfer.to}`]) || upiTargetTransfer.amount;
            onSettle(
              upiTargetTransfer.fromMemberId,
              upiTargetTransfer.toMemberId,
              amt,
              upiTargetTransfer.fromLabel,
              upiTargetTransfer.toLabel,
              upiTargetTransfer.amount
            );
            setUpiTargetTransfer(null);
          }}
        />
      )}
    </div>
  );
}
