import type {
  CloseoutPulseSummary,
  FlagUsageRow,
  FunnelStep,
  GhostTripRow,
  InviteAttribution,
  LoopHealth,
  SignupSourceRow,
  SliceLoopRow,
  SplitwiseImportSummary,
  WinBackRow,
} from '../../utils/opsGrowthMetrics';

function Bar({ pct, tone = 'amber' }: { pct: number; tone?: 'amber' | 'safe' | 'warn' }) {
  const color = tone === 'safe' ? 'var(--safe)' : tone === 'warn' ? 'var(--orange)' : 'var(--amber)';
  return (
    <div className="ops-bar-track">
      <div className="ops-bar-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export function LoopHealthStrip({ health, onOpenGrowth }: { health: LoopHealth; onOpenGrowth?: () => void }) {
  return (
    <section className="ops-loop-strip" aria-label="Trip loop health">
      <div className="ops-loop-strip-head">
        <div>
          <h3 className="ops-section-title" style={{ margin: 0 }}>Loop health</h3>
          <p className="ops-section-sub" style={{ margin: '2px 0 0' }}>
            First 60s → last 5 min → same squad next trip. {health.tripCount} unarchived trip{health.tripCount === 1 ? '' : 's'}.
          </p>
        </div>
        {onOpenGrowth && (
          <button type="button" className="ops-btn" onClick={onOpenGrowth}>
            Open Growth
          </button>
        )}
      </div>
      <div className="ops-loop-strip-grid">
        {health.steps.map((step) => (
          <div key={step.key} className="ops-loop-chip">
            <div className="ops-loop-chip-val">{step.pct.toFixed(0)}%</div>
            <div className="ops-loop-chip-label">{step.label}</div>
            <div className="ops-loop-chip-count">{step.count}/{health.tripCount}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ActivationFunnelCard({ funnel }: { funnel: FunnelStep[] }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Activation funnel</h3>
      <p className="ops-section-sub">Signup → trip → invite → claim → first expense → first settle. Drop-off is % of the previous step.</p>
      {funnel.map((step) => (
        <div key={step.key} className="ops-bar-row">
          <span className="ops-bar-label">{step.label}</span>
          <Bar pct={step.pctOfPrev} />
          <span className="ops-bar-val">{step.count} · {step.pctOfPrev.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export function GhostQueueCard({ ghosts }: { ghosts: GhostTripRow[] }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Ghost trip queue</h3>
      <p className="ops-section-sub">1 member / 0 expenses after 24h, or ended with bills and never a settlement. Not a campaign list.</p>
      {ghosts.length === 0 ? (
        <div className="ops-empty">No ghost trips right now.</div>
      ) : (
        ghosts.slice(0, 20).map((g) => (
          <div key={g.tripId} className="ops-leader-row">
            <span className="ops-leader-rank">{g.kind === 'idle' ? '👻' : '💸'}</span>
            <span className="ops-leader-name">{g.name}</span>
            <span className="ops-leader-amt">{g.kind === 'idle' ? `${g.ageDays}d idle` : `${g.expenseCount} unpaid · ${g.ageDays}d`}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function FlagUsedVsArmedCard({ rows }: { rows: FlagUsageRow[] }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Flag used vs armed</h3>
      <p className="ops-section-sub">Core ON is not the same as clone-last tapped. These are proxies from existing trip data, not a Mixpanel clone.</p>
      {rows.map((row) => (
        <div key={row.key} className="ops-bar-row" title={row.proxy}>
          <span className="ops-bar-label">
            {row.label}
            <span style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-tertiary)' }}>
              {row.armed ? 'armed' : 'safed'} · {row.proxy}
            </span>
          </span>
          <Bar pct={row.pct} tone={row.armed && row.pct < 10 ? 'warn' : 'amber'} />
          <span className="ops-bar-val">{row.used}/{row.eligible}</span>
        </div>
      ))}
    </div>
  );
}

export function InviteAttributionCard({ attr, inviteSignups = 0 }: { attr: InviteAttribution; inviteSignups?: number }) {
  const items = [
    { label: 'Join-code claimed', value: attr.joinCodeClaimed },
    { label: 'Share link created', value: attr.shareLinkCreated },
    { label: 'Share link views', value: attr.shareLinkViews },
    { label: 'Signed-out invite previews', value: attr.joinPreviews },
    { label: 'New signups via invite link', value: inviteSignups },
    { label: 'WA settle (proxy)', value: attr.waSettleProxy },
    { label: 'Placeholder members', value: attr.placeholderMembers },
  ];
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Invite &amp; share attribution</h3>
      <p className="ops-section-sub">Viral loop from existing tokens and claims. Share views need migration 0107. Invite previews need migration 0108 and Growth Telemetry ON, and count from the day it is armed. Signups via invite need Invite Conversion ON.</p>
      {items.map((item) => (
        <div key={item.label} className="ops-bar-row">
          <span className="ops-bar-label">{item.label}</span>
          <Bar pct={attr.tripCount > 0 ? (item.value / Math.max(attr.tripCount, item.value, 1)) * 100 : 0} />
          <span className="ops-bar-val">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TripTypeSlicesCard({ slices }: { slices: SliceLoopRow[] }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Trip-type slices</h3>
      <p className="ops-section-sub">Cafe vs pass-holder vs multi-currency. Do not sell radar to cafe groups.</p>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Slice</th>
              <th>Trips</th>
              <th>≤10m</th>
              <th>2nd member</th>
              <th>Settle</th>
              <th>Next trip</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.slice}>
                <td>{s.label}</td>
                <td>{s.tripCount}</td>
                <td>{s.firstExpense10mPct.toFixed(0)}%</td>
                <td>{s.secondMemberPct.toFixed(0)}%</td>
                <td>{s.firstSettlePct.toFixed(0)}%</td>
                <td>{s.nextTrip90dPct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WinBackCard({ rows }: { rows: WinBackRow[] }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Win-back list</h3>
      <p className="ops-section-sub">Settled 60–90 days ago, no newer trip. Export-ready names only — no email blast.</p>
      {rows.length === 0 ? (
        <div className="ops-empty">Nobody in the 60–90 day reuse window.</div>
      ) : (
        rows.slice(0, 25).map((row) => (
          <div key={row.tripId} className="ops-leader-row">
            <span className="ops-leader-rank">{row.daysSinceSettle}d</span>
            <span className="ops-leader-name">{row.name}</span>
            <span className="ops-leader-amt" style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{row.ownerId.slice(0, 8)}</span>
          </div>
        ))
      )}
    </div>
  );
}

export function CloseoutPulseCard({ pulse }: { pulse: CloseoutPulseSummary }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Closeout pulse</h3>
      <p className="ops-section-sub">“Would you use this for the next trip?” One tap after lock. Needs flag enableCloseoutPulse.</p>
      <div className="ops-bento-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="ops-bento-stat-tile">
          <div className="ops-bento-stat-label">Would reuse</div>
          <div className="ops-bento-stat-val">{pulse.wouldReusePct.toFixed(0)}%</div>
          <div className="ops-bento-stat-sub">{pulse.yes} yes · {pulse.no} no</div>
        </div>
        <div className="ops-bento-stat-tile">
          <div className="ops-bento-stat-label">Answered</div>
          <div className="ops-bento-stat-val">{pulse.answered}</div>
          <div className="ops-bento-stat-sub">{pulse.skip} skipped</div>
        </div>
        <div className="ops-bento-stat-tile">
          <div className="ops-bento-stat-label">Skip rate</div>
          <div className="ops-bento-stat-val">{pulse.answered ? ((pulse.skip / pulse.answered) * 100).toFixed(0) : 0}%</div>
          <div className="ops-bento-stat-sub">Keep this low or drop the question</div>
        </div>
      </div>
    </div>
  );
}

export function SplitwiseImportCard({ summary }: { summary: SplitwiseImportSummary }) {
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Splitwise import completions</h3>
      <p className="ops-section-sub">Switcher funnel. Importer stays in Pro; this is the Ops count.</p>
      <div className="ops-bento-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="ops-bento-stat-tile">
          <div className="ops-bento-stat-label">Trips imported</div>
          <div className="ops-bento-stat-val">{summary.tripCount}</div>
        </div>
        <div className="ops-bento-stat-tile">
          <div className="ops-bento-stat-label">Rows imported</div>
          <div className="ops-bento-stat-val">{summary.expenseCount}</div>
        </div>
      </div>
    </div>
  );
}

export function SignupSourceCard({ rows }: { rows: SignupSourceRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <div className="ops-card">
      <h3 className="ops-section-title">Signup source (UTM)</h3>
      <p className="ops-section-sub">utm_source / ref on the landing URL. Stored on the profile, not on friends.</p>
      {rows.length === 0 ? (
        <div className="ops-empty">No signups loaded.</div>
      ) : (
        rows.map((row) => (
          <div key={row.source} className="ops-bar-row">
            <span className="ops-bar-label">{row.source}</span>
            <Bar pct={total > 0 ? (row.count / total) * 100 : 0} />
            <span className="ops-bar-val">{row.count}</span>
          </div>
        ))
      )}
    </div>
  );
}
