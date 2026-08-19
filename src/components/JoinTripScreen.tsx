import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lookupTripByJoinCode, claimTripMember, type JoinLookupResult } from '../services/tripApi';
import { useTripStore } from '../store/tripStore';
import { IconMembers, IconCheckCircle, IconClock } from './Icons';
import { sendPushNotification } from '../services/pushApi';
import { supabase } from '../services/supabaseClient';
import { TurnstileWidget } from './TurnstileWidget';

type Status = 'loading' | 'invalid' | 'ready' | 'claiming' | 'error';

export function JoinTripScreen() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const refreshTrips = useTripStore((s) => s.refreshTrips);
  const selectTrip = useTripStore((s) => s.selectTrip);

  const [status, setStatus] = useState<Status>('loading');
  const [result, setResult] = useState<JoinLookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [honeypotVal, setHoneypotVal] = useState('');

  // Countdown timer for rate limit cooldown
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((s) => (s && s > 1 ? s - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const load = async () => {
    if (!code) return;
    // Honeypot bot trap check
    if (honeypotVal) {
      setStatus('invalid');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      const lookup = await lookupTripByJoinCode(code);
      if (!lookup) {
        setStatus('invalid');
        return;
      }
      setResult(lookup);
      setStatus('ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong loading this invite.';
      setErrorMessage(msg);
      // Parse lockout seconds from rate limiter exception if present
      const match = msg.match(/wait (\d+) seconds/i);
      if (match) {
        setLockoutSeconds(parseInt(match[1], 10));
      }
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
    if (honeypotVal) return;
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
        sendPushNotification(
          recipients,
          result.tripName ? `Member Joined • ${result.tripName}` : 'Member Joined',
          `${joinedMemberName} joined the trip`,
          { type: 'member_joined', tripName: result.tripName },
          result.tripId
        );
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
    const isLocked = lockoutSeconds !== null && lockoutSeconds > 0;
    const formatCooldown = (sec: number) => {
      const mins = Math.floor(sec / 60);
      const s = sec % 60;
      return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
    };

    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
        <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', textAlign: 'center' }}>
          {isLocked && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--color-warning)' }}>
              <IconClock size={32} />
            </div>
          )}
          <h2 style={{ marginBottom: '8px' }}>{isLocked ? 'Cooldown Active' : 'Something went wrong'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            {isLocked
              ? `Too many incorrect join attempts. For security, please wait ${formatCooldown(lockoutSeconds)} before trying again.`
              : errorMessage}
          </p>
          <button
            type="button"
            className="gradient-btn"
            style={{ width: '100%', opacity: isLocked ? 0.6 : 1 }}
            disabled={isLocked}
            onClick={load}
          >
            {isLocked ? `Try again in ${formatCooldown(lockoutSeconds)}` : 'Try again'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%', marginTop: '10px' }}
            onClick={() => navigate('/')}
          >
            Go to my trips
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
      <div className="fade-in" style={{ padding: 'max(24px, var(--safe-top, 24px)) 20px max(24px, var(--safe-bottom, 24px)) 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
          {/* Honeypot field for automated bot trap */}
          <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
            <input
              type="text"
              name="trip_join_security_token"
              tabIndex={-1}
              autoComplete="off"
              value={honeypotVal}
              onChange={(e) => setHoneypotVal(e.target.value)}
            />
          </div>

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

          <TurnstileWidget />
        </div>
      </div>
    </div>
  );
}
