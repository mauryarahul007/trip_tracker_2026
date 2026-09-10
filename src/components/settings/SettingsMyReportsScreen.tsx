import { useEffect, useState } from 'react';
import { fetchMyBugReports, type MyBugReport } from '../../services/bugApi';
import { formatRelativeTime } from '../../utils/relativeTime';
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

function statusTone(status: MyBugReport['status']): string {
  switch (status) {
    case 'open':
      return 'open';
    case 'in_progress':
      return 'progress';
    case 'resolved':
      return 'resolved';
    default:
      return 'closed';
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
        <ul className="settings-ticket-list">
          {reports.map((report) => (
            <li key={report.id} className="settings-shortcuts-card settings-ticket-card">
              <div className="settings-ticket-top">
                <span className="settings-ticket-id">{report.id}</span>
                <span className="settings-ticket-status" data-tone={statusTone(report.status)}>
                  {statusLabel(report.status)}
                </span>
              </div>
              <p className="settings-row-title">{report.title}</p>
              <p className="settings-row-subtitle">Filed {formatRelativeTime(report.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </SettingsSubscreenFrame>
  );
}
