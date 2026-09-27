import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTripShare, recordTripShareView, type TripShareSummary } from '../services/tripApi';
import { formatDateRange } from '../utils/dateRange';
import { fetchPublicGrowthFlags } from '../services/growthApi';
import { IconLock } from './Icons';

// Public, unauthenticated page -- anyone with the link (no login) lands
// here. Reads only through the SECURITY DEFINER get_trip_share RPC
// (migration 0098), which already refuses to return anything once the
// link is disabled or expired, and only ever returns a bounded summary
// (no member list, no individual balances, no raw expense rows).
export function TripSharePage() {
  const { token } = useParams<{ token: string }>();
  const [summary, setSummary] = useState<TripShareSummary | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'ended'>('loading');
  const [showSignupCta, setShowSignupCta] = useState(false);

  // Flag: enableInviteConversion. Fails closed (no button) if the flag read errors.
  useEffect(() => {
    let cancelled = false;
    fetchPublicGrowthFlags().then((f) => {
      if (!cancelled) setShowSignupCta(f.enableInviteConversion);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const spend = summary ? Object.entries(summary.spendByCurrency) : [];

  // Styled in index.css (.share-page / .share-pass) from theme tokens, so it
  // follows the viewer's light/dark setting and matches the app's
  // boarding-pass look -- this is the first screen a non-user ever sees.
  return (
    <div className="share-page">
      <article className="share-pass" aria-busy={status === 'loading'}>
        <div className="share-pass-eyebrow">Trip Tracker · Trip summary</div>

        {status === 'loading' && (
          <div className="share-pass-loading" role="status" aria-label="Loading trip summary">
            <div className="skeleton" style={{ width: '40%', height: '12px' }} />
            <div className="skeleton" style={{ width: '75%', height: '26px' }} />
            <div className="skeleton" style={{ width: '55%', height: '12px' }} />
            <div className="skeleton" style={{ width: '100%', height: '64px', marginTop: '10px' }} />
          </div>
        )}

        {status === 'ended' && (
          <div className="share-pass-ended">
            <span className="share-pass-ended-icon" aria-hidden="true"><IconLock size={22} /></span>
            <h1 className="share-pass-title">This link has ended</h1>
            <p className="share-pass-sub">It was turned off or has expired. Ask the trip organizer for a fresh link.</p>
          </div>
        )}

        {status === 'ok' && summary && (
          <>
            {summary.destination && <div className="share-pass-dest">{summary.destination}</div>}
            <h1 className="share-pass-title">{summary.tripName}</h1>
            <p className="share-pass-sub">{formatDateRange(summary.startDate, summary.endDate)}</p>

            <div className="share-pass-perf" aria-hidden="true" />

            <dl className="share-pass-stats">
              <div>
                <dt>Travelers</dt>
                <dd>{summary.memberCount}</dd>
              </div>
              <div>
                <dt>Expenses</dt>
                <dd>{summary.expenseCount}</dd>
              </div>
            </dl>

            {spend.length > 0 && (
              <div className="share-pass-spend">
                <span className="share-pass-spend-label">Total spend</span>
                {spend.map(([currency, amount]) => (
                  <span key={currency} className="share-pass-spend-amount">
                    {currency} {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                ))}
              </div>
            )}

            {showSignupCta && (
              <a className="share-pass-cta" href="/login?ref=trip_share&utm_medium=share_page">
                Splitting a trip with friends? Track it free
              </a>
            )}

            <p className="share-pass-note">
              Read-only summary shared by the trip organizer. Individual expenses and balances aren't shown.
            </p>
          </>
        )}
      </article>
    </div>
  );
}
