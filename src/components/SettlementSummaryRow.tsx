type Props = {
  fromLabel: string;
  toLabel: string;
  /** Pre-formatted, e.g. "₹14,500.00". */
  amountText: string;
  /** Pre-formatted pending amount for a partial settlement, else omitted. */
  remainingText?: string;
  /** Small caption such as "paid by Rohan · received by Priya". */
  caption?: string;
};

/** Compact "who pays whom, how much" row for the settle confirm dialog. */
export function SettlementSummaryRow({ fromLabel, toLabel, amountText, remainingText, caption }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-page)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}>
          {fromLabel} <span aria-hidden="true">→</span><span className="sr-only"> pays </span> {toLabel}
        </span>
        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {amountText}
        </span>
      </div>
      {remainingText ? (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Partial payment. {remainingText} stays pending.
        </div>
      ) : null}
      {caption ? <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{caption}</div> : null}
    </div>
  );
}
