import { useEffect, useState } from 'react';
import {
  fetchReliabilitySummary,
  fetchRepeatCreatorRate,
  fetchRetentionCohorts,
  groupReliability,
  type ReliabilityRow,
  type RetentionCohortRow,
} from '../../services/growthApi';

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');

function retentionCell(c: { eligible: number; retained: number }) {
  return c.eligible > 0 ? `${pct(c.retained, c.eligible)} (${c.retained}/${c.eligible})` : '–';
}

export function GrowthTelemetryCards() {
  const [cohorts, setCohorts] = useState<RetentionCohortRow[]>([]);
  const [repeat, setRepeat] = useState<{ eligible: number; repeat: number } | null>(null);
  const [reliability, setReliability] = useState<ReliabilityRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRetentionCohorts(8), fetchRepeatCreatorRate(), fetchReliabilitySummary(14)])
      .then(([c, r, rel]) => {
        if (cancelled) return;
        setCohorts(c);
        setRepeat(r);
        setReliability(rel);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load telemetry. Apply migration 0108.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = groupReliability(reliability);

  return (
    <>
      <div className="ops-split-row">
        <div className="ops-card">
          <h3 className="ops-section-title">Retention by signup week</h3>
          <p className="ops-section-sub">
            Share of new users who opened the app on or after day 1 / 7 / 30. Needs Growth Telemetry ON; cohorts start from the first recorded open, so earlier signups are excluded.
          </p>
          {error ? (
            <div className="ops-empty">{error}</div>
          ) : cohorts.length === 0 ? (
            <div className="ops-empty">No cohort data yet.</div>
          ) : (
            <div className="ops-table-wrap"><table className="ops-table">
              <thead>
                <tr><th>Week of</th><th>Signups</th><th>D1</th><th>D7</th><th>D30</th></tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohortWeek}>
                    <td>{c.cohortWeek}</td>
                    <td>{c.size}</td>
                    <td>{retentionCell(c.d1)}</td>
                    <td>{retentionCell(c.d7)}</td>
                    <td>{retentionCell(c.d30)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>

        <div className="ops-card">
          <h3 className="ops-section-title">Trip 1 → trip 2</h3>
          <p className="ops-section-sub">Organizers whose first trip is 30+ days old who went on to create another. Uses existing trip data, no telemetry needed.</p>
          <div className="ops-bento-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="ops-bento-stat-tile">
              <div className="ops-bento-stat-label">Repeat organizers</div>
              <div className="ops-bento-stat-val">{repeat ? pct(repeat.repeat, repeat.eligible) : '–'}</div>
              <div className="ops-bento-stat-sub">{repeat ? `${repeat.repeat} of ${repeat.eligible}` : 'loading'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ops-card">
        <h3 className="ops-section-title">Sync reliability (last 14 days)</h3>
        <p className="ops-section-sub">
          Users who hit a stuck queue (offline changes pending 10+ minutes while online) or a failed sync, out of users who opened the app, per platform and version. Needs Growth Telemetry ON.
        </p>
        {groups.length === 0 ? (
          <div className="ops-empty">No events yet.</div>
        ) : (
          <div className="ops-table-wrap"><table className="ops-table">
            <thead>
              <tr><th>Platform</th><th>Version</th><th>Opened</th><th>Stuck queue</th><th>Sync failed</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={`${g.platform}|${g.appVersion}`}>
                  <td>{g.platform}</td>
                  <td>{g.appVersion}</td>
                  <td>{g.openUsers}</td>
                  <td>{g.stuckUsers} ({pct(g.stuckUsers, g.openUsers)})</td>
                  <td>{g.failUsers} ({pct(g.failUsers, g.openUsers)})</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
