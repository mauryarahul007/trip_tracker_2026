import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTripShare, recordTripShareView, type TripShareSummary } from '../services/tripApi';
import { formatDateRange } from '../utils/dateRange';

// Public, unauthenticated page -- anyone with the link (no login) lands
// here. Reads only through the SECURITY DEFINER get_trip_share RPC
// (migration 0098), which already refuses to return anything once the
// link is disabled or expired, and only ever returns a bounded summary
// (no member list, no individual balances, no raw expense rows).
export function TripSharePage() {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<TripShareSummary | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'ended'>('loading');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getTripShare(token)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setSummary(result);
          setStatus('ok');
          void recordTripShareView(token).catch(() => {});
        } else {
          setStatus('ended');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('ended');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: '20px' }}>
      <div style={{ maxWidth: '420px', width: '100%', background: '#fff', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748B' }}>Trip Tracker · Trip Summary</span>

        {status === 'loading' && <p style={{ marginTop: '16px', color: '#64748B' }}>Loading…</p>}

        {status === 'ended' && (
          <>
            <div style={{ fontSize: '28px', margin: '16px 0 8px' }}>🔒</div>
            <p style={{ fontWeight: 600, margin: 0 }}>This link has ended or expired</p>
            <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px' }}>Ask the trip organizer for a fresh link.</p>
          </>
        )}

        {status === 'ok' && summary && (
          <>
            <h1 style={{ fontSize: '22px', margin: '10px 0 4px' }}>{summary.tripName}</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              {formatDateRange(summary.startDate, summary.endDate)}
              {summary.destination ? ` · ${summary.destination}` : ''}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <div style={{ flex: 1, background: '#F1F5F9', borderRadius: '14px', padding: '12px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{summary.memberCount}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Travelers</div>
              </div>
              <div style={{ flex: 1, background: '#F1F5F9', borderRadius: '14px', padding: '12px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>{summary.expenseCount}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Expenses</div>
              </div>
            </div>

            {Object.keys(summary.spendByCurrency).length > 0 && (
              <div style={{ marginTop: '14px', fontSize: '13px', color: '#334155' }}>
                Total spend:{' '}
                {Object.entries(summary.spendByCurrency)
                  .map(([currency, amount]) => `${currency} ${amount.toLocaleString()}`)
                  .join(' · ')}
              </div>
            )}

            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '18px' }}>
              This is a read-only summary shared by a trip organizer. Individual expenses and balances aren't shown here.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
