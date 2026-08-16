import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lookupTripByJoinCode, claimTripMember, type JoinLookupResult } from '../services/tripApi';
import { useTripStore } from '../store/tripStore';
import { IconMembers, IconCheckCircle } from './Icons';
import { sendPushNotification } from '../services/pushApi';
import { supabase } from '../services/supabaseClient';

type Status = 'loading' | 'invalid' | 'ready' | 'claiming' | 'error';

export function JoinTripScreen() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const refreshTrips = useTripStore((s) => s.refreshTrips);
  const selectTrip = useTripStore((s) => s.selectTrip);

  const [status, setStatus] = useState<Status>('loading');
  const [result, setResult] = useState<JoinLookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const load = async () => {
    if (!code) return;
    setStatus('loading');
    try {
      const lookup = await lookupTripByJoinCode(code);
      if (!lookup) {
        setStatus('invalid');
        return;
      }
      setResult(lookup);
      setStatus('ready');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong loading this invite.');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const goToTrip = async (tripId: string) => {
    await refreshTrips();
    await selectTrip(tripId);
    navigate('/');
  };

  const handleClaim = async (memberId: string) => {
    setStatus('claiming');
    try {
      const claimed = await claimTripMember(memberId);
      if (!claimed) {
        // Someone else claimed this member first — reload the current list.
        setErrorMessage('That member was just claimed by someone else. Pick another.');
        await load();
        return;
      }
      if (result) {
        const joinedMemberName = result.unclaimedMembers.find((m) => m.id === memberId)?.name || 'Someone';
        const { data: tripMembers } = await supabase
          .from('members')
          .select('id, linked_user_id')
          .eq('trip_id', result.tripId)
          .not('linked_user_id', 'is', null);
        const recipients = (tripMembers || [])
          .filter((m) => m.id !== memberId)
          .map((m) => m.linked_user_id as string);
        sendPushNotification(recipients, result.tripName, `${joinedMemberName} joined the trip`);
      }
      if (result) await goToTrip(result.tripId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not claim that member. Try again.');
      setStatus('ready');
    }
  };

  if (status === 'loading' || status === 'claiming') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '4px solid rgba(15, 23, 42, 0.05)',
            borderTopColor: 'var(--primary-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
        <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px' }}>Invite not found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            This invite code doesn't match any trip. Double-check the link, or ask the trip admin to resend it.
          </p>
          <button type="button" className="gradient-btn" style={{ width: '100%' }} onClick={() => navigate('/')}>
            Go to my trips
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
        <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>{errorMessage}</p>
          <button type="button" className="gradient-btn" style={{ width: '100%' }} onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.isAdmin || result.myMemberId) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
        <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '12px' }}>
            <IconCheckCircle size={32} className="icon" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>You're already in "{result.tripName}"</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            {result.isAdmin ? "You're the admin of this trip." : "You've already claimed your spot on this trip."}
          </p>
          <button type="button" className="gradient-btn" style={{ width: '100%' }} onClick={() => goToTrip(result.tripId)}>
            Go to trip
          </button>
        </div>
      </div>
    );
  }

  if (result.unclaimedMembers.length === 0) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
        <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px' }}>Everyone's already joined</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            All members of "{result.tripName}" have already claimed their spot. Ask the trip admin if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ overflowY: 'auto' }}>
      <div className="fade-in" style={{ padding: 'max(24px, env(safe-area-inset-top, 24px)) 20px max(24px, env(safe-area-inset-bottom, 24px)) 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '4px' }}>Join "{result.tripName}"</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Which one are you?</p>

          {errorMessage && (
            <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginBottom: '12px' }}>{errorMessage}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.unclaimedMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                className="secondary-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', justifyContent: 'flex-start' }}
                onClick={() => handleClaim(member.id)}
              >
                <IconMembers size={16} className="icon-sm" />
                {member.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
