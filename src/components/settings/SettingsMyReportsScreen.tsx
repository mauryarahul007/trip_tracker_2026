import { useEffect, useState } from 'react';
import { fetchMyBugReports, type MyBugReport } from '../../services/bugApi';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
};

function statusLabel(status: MyBugReport['status']): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    default:
      return "Won't Fix";
  }
}

function statusColor(status: MyBugReport['status']): string {
  switch (status) {
    case 'open':
      return 'var(--secondary-accent)';
    case 'in_progress':
      return 'var(--color-info, var(--secondary-accent))';
    case 'resolved':
      return 'var(--color-success)';
    default:
      return 'var(--text-muted)';
  }
}

export function SettingsMyReportsScreen({ parentTitle, onBack }: Props) {
  const [reports, setReports] = useState<MyBugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchMyBugReports()
      .then((rows) => {
        if (!cancelled) setReports(rows);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your reports just now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="My reports"
      subtitle="Status of problems you've filed. Superadmins see the full ledger in Ops Deck."
    >
      {loading ? (
        <div className="skeleton" style={{ height: '120px', borderRadius: '14px' }} />
      ) : error ? (
        <p style={{ color: 'var(--color-danger)', fontSize: '14px' }}>{error}</p>
      ) : reports.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
          You haven't filed a report yet. Use Report a Problem and you'll get a ticket id like BUG-001.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map((report) => (
            <li
              key={report.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px 14px',
                background: 'var(--bg-card, var(--bg-app))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', fontWeight: 700 }}>
                  {report.id}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor(report.status) }}>
                  {statusLabel(report.status)}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--text-primary)' }}>{report.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Filed {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SettingsSubscreenFrame>
  );
}
