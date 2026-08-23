# Porting: Collapsible Balances & Settlements sections → `main`

Source: `material-ui` branch, `src/components/BalancesSettlements.tsx` (WhatsApp-style
collapsible cards). This is **UI/behavior only** — no color/token retheme. All CSS vars
used below already resolve correctly on `main`'s own palette.

## What changes vs. `main`'s current version

`main` currently renders both sections always-expanded, in this order:

1. Boarding-pass balance summary
2. `.glass-card` "Individual & Group Balances" (heading + flat list, always open)
3. `.glass-card` "Fewest Payments to Clear It" (heading + transfer rows, always open)

The `material-ui` version replaces steps 2 and 3 with two **collapsible** cards, reordered
so Suggested Settlements comes first (it's the actionable one), each with a WhatsApp-style
header row (icon, title, caption, summary value, chevron) that expands/collapses on click:

1. Boarding-pass balance summary (unchanged)
2. **Suggested Settlements** — collapsible, `isTransfersExpanded` (default `true`)
3. **Member & Group Balances** — collapsible, `isMembersSectionExpanded` (default `false`)

Same data (`transfers`, `balanceNodes`, `expandedGroups` for group drill-down) — just a
different header/collapse shell around it. `expandedGroups` (per-group drill-down inside
the balances list) already exists on `main` and is reused as-is.

## 1. State to add

In the component body, alongside the existing `expandedGroups` state:

```tsx
const [isTransfersExpanded, setIsTransfersExpanded] = useState(true);
const [isMembersSectionExpanded, setIsMembersSectionExpanded] = useState(false);
```

## 2. CSS to add (`src/index.css`)

Paste as-is — nothing in here references a Skyline Escape token, all vars already exist
on `main`.

```css
.m3-accordion-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.m3-accordion-chevron.expanded {
  transform: rotate(90deg);
  color: var(--primary-accent);
}

/* ==========================================================================
   WhatsApp-Style Modular Grouped Sections for Balances & Settlements
   ========================================================================== */

.wa-group-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.wa-group-card:hover {
  border-color: rgba(2, 132, 199, 0.35);
}

.wa-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  background: var(--bg-surface);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.wa-group-header:hover {
  background: var(--bg-surface-hover);
}

.wa-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.wa-group-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wa-group-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.wa-group-caption {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 1px;
}

.wa-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 15px;
  transition: background 0.15s ease;
}

.wa-list-item:hover {
  background: var(--bg-surface-hover);
}

.wa-list-divider {
  height: 1px;
  background: var(--border-color);
  margin-left: 54px;
  opacity: 0.6;
}
```

No new icon imports needed — `main`'s existing import line already has everything used
below (`IconArrowDownRight, IconArrowUpRight, IconCheck, IconCheckCircle, IconChevronRight,
IconEdit, IconMembers`).

## 3. JSX — replace both sections

Delete `main`'s two blocks (the `.glass-card` "Individual & Group Balances" card and the
`.glass-card` "Fewest Payments to Clear It" card — everything between the boarding-pass
`</div>` and the `UpiPaymentModal` render) and replace with:

```tsx
{/* 1. WhatsApp-Style Suggested Settlements Section */}
<div className="wa-group-card">
  <div
    className="wa-group-header"
    onClick={() => {
      triggerHaptic('light');
      setIsTransfersExpanded(!isTransfersExpanded);
    }}
    role="button"
    tabIndex={0}
    aria-expanded={isTransfersExpanded}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsTransfersExpanded(!isTransfersExpanded);
      }
    }}
  >
    <div className="wa-group-title">
      <div className="wa-group-icon" style={{ background: isFullySettled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 122, 0, 0.12)', color: isFullySettled ? '#10B981' : '#FF7A00' }}>
        {isFullySettled ? <IconCheckCircle size={18} /> : <span>⚡</span>}
      </div>
      <div>
        <div className="wa-group-name">Suggested Settlements</div>
        <div className="wa-group-caption">
          {isFullySettled ? 'All debts cleared — nothing to pay' : `${transfers.length} payment${transfers.length === 1 ? '' : 's'} to clear all balances`}
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span
        style={{
          fontSize: '12.5px',
          fontWeight: 700,
          fontFamily: 'var(--font-family-mono)',
          color: isFullySettled ? 'var(--color-success)' : 'var(--accent-orange)',
        }}
      >
        {isFullySettled ? 'Settled' : `${currencySymbol}${totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
      </span>
      <span className={`m3-accordion-chevron ${isTransfersExpanded ? 'expanded' : ''}`}>
        <IconChevronRight size={16} />
      </span>
    </div>
  </div>

  {isTransfersExpanded && (
    <div className="fade-in" style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--border-color)' }}>
      {transfers.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 6px', color: 'var(--color-success)', fontSize: '13.5px', fontWeight: 600 }}>
          <IconCheckCircle size={18} />
          <span>Every balance is settled — all set!</span>
        </div>
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
                onOpenUpi={(t) => setUpiTargetTransfer(t)}
                isUpiEnabled={isUpiEnabled}
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
  )}
</div>

{/* 2. WhatsApp-Style Member & Group Balances Section */}
<div className="wa-group-card">
  <div
    className="wa-group-header"
    onClick={() => {
      triggerHaptic('light');
      setIsMembersSectionExpanded(!isMembersSectionExpanded);
    }}
    role="button"
    tabIndex={0}
    aria-expanded={isMembersSectionExpanded}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsMembersSectionExpanded(!isMembersSectionExpanded);
      }
    }}
  >
    <div className="wa-group-title">
      <div className="wa-group-icon" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284C7' }}>
        <IconMembers size={18} />
      </div>
      <div>
        <div className="wa-group-name">Member & Group Balances</div>
        <div className="wa-group-caption">
          {balances.length} member{balances.length === 1 ? '' : 's'} · Tap to see who owes what
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
        {isMembersSectionExpanded ? 'Hide' : 'Show'}
      </span>
      <span className={`m3-accordion-chevron ${isMembersSectionExpanded ? 'expanded' : ''}`}>
        <IconChevronRight size={16} />
      </span>
    </div>
  </div>

  {isMembersSectionExpanded && (
    <div className="fade-in" style={{ borderTop: '1px solid var(--border-color)', padding: '6px 0' }}>
      {balanceNodes.map((n, idx) => {
        const isGroup = n.id.startsWith('group:');

        if (!isGroup) {
          return (
            <div key={n.id}>
              {idx > 0 && <div className="wa-list-divider" />}
              <div
                className="wa-list-item"
                onClick={() => onMemberClick(n.memberIds[0])}
                style={{ cursor: 'pointer' }}
                title={`View ${n.name}'s expenses`}
              >
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {n.name}
                </span>
                <span
                  className="privacy-blur"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: balanceColor(n.balance),
                    fontWeight: '700',
                    fontSize: '13px',
                    fontFamily: 'var(--font-family-mono)',
                  }}
                >
                  <BalanceIcon balance={n.balance} />
                  {balanceLabel(n.balance, currencySymbol, isBlindMode)}
                </span>
              </div>
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
        const isGroupExpanded = !!expandedGroups[groupId];

        return (
          <div key={n.id}>
            {idx > 0 && <div className="wa-list-divider" />}
            <div
              className="wa-list-item"
              onClick={() => setExpandedGroups({ ...expandedGroups, [groupId]: !isGroupExpanded })}
              style={{ cursor: 'pointer' }}
              title="Click to toggle group member breakdown"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <IconMembers size={14} className="icon-sm" />
                {n.name}
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', transform: isGroupExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
                  <IconChevronRight size={12} className="icon-sm" />
                </span>
              </span>
              <span
                className="privacy-blur"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: statusColor,
                  fontWeight: '700',
                  fontSize: '13px',
                  fontFamily: 'var(--font-family-mono)',
                }}
              >
                <BalanceIcon balance={n.balance} settled={fullySettled} />
                {statusLabel}
              </span>
            </div>

            {isGroupExpanded && (
              <div style={{ marginLeft: '24px', paddingLeft: '12px', borderLeft: '2px solid var(--border-color)', marginBottom: '6px' }}>
                {n.memberIds.map((memId) => {
                  const memberBalance = balances.find((b) => b.memberId === memId);
                  const bal = memberBalance ? memberBalance.balance : 0;
                  return (
                    <div
                      key={memId}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', padding: '5px 12px', cursor: 'pointer' }}
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
  )}
</div>
```

Note: on `main` this JSX must sit right after the boarding-pass card's closing `</div>`,
before the `UpiPaymentModal` render at the bottom of the return.

## 4. Porting checklist

1. Add the two `useState` lines (§1) next to `expandedGroups`.
2. Append the CSS block (§2) to `src/index.css` — anywhere near the existing
   `.m3-accordion-*` rules if `main` already has some, otherwise anywhere is fine.
3. Delete `main`'s current "Individual & Group Balances" `.glass-card` block and
   "Fewest Payments to Clear It" `.glass-card` block.
4. Paste the replacement JSX (§3) in their place, keeping it after the boarding-pass card.
5. `npx tsc --noEmit` — should be clean, no new props/types introduced.
6. `npm run build` — should be clean.
7. Manually test: toggle both cards open/closed, drill into a group inside Member & Group
   Balances, confirm Settle/Remind/UPI actions inside Suggested Settlements still work
   unchanged (that logic — `TransferRow`, `canSettleTransfer`, `isTransferSettled` — is
   untouched by this change).
