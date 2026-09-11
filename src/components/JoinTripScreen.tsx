import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  lookupTripByJoinCode,
  claimTripMember,
  previewTripByJoinCode,
  type JoinLookupResult,
  type JoinPreviewResult,
} from '../services/tripApi';
import { supabase } from '../services/supabaseClient';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { IconMembers, IconCheckCircle, IconClock, IconChevronLeft } from './Icons';
import { sendPushNotification } from '../services/pushApi';
import { TurnstileWidget } from './TurnstileWidget';
import { formatDateRange } from '../utils/dateRange';
import { buildAutoGroupName } from '../utils/groupNaming';
import { triggerHaptic } from '../utils/haptics';

type Status = 'loading' | 'invalid' | 'ready' | 'preview' | 'claiming' | 'error';
type AuthGate = 'wait' | 'anon' | 'authed';

export function JoinTripScreen() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const refreshTrips = useTripStore((s) => s.refreshTrips);
  const selectTrip = useTripStore((s) => s.selectTrip);
  const session = useAuthStore((s) => s.session);
  const initialize = useAuthStore((s) => s.initialize);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const authError = useAuthStore((s) => s.authError);

  const [authGate, setAuthGate] = useState<AuthGate>('wait');

  const handleBack = () => {
    if (window.history.length > 1 && (window.history.state?.idx > 0 || window.history.state?.navDepth > 0)) {
      navigate(-1);
    } else {
      navigate(authGate === 'authed' ? '/' : '/login');
    }
  };

  const goHome = () => navigate(authGate === 'authed' ? '/' : '/login');

  const [status, setStatus] = useState<Status>('loading');
  const [result, setResult] = useState<JoinLookupResult | null>(null);
  const [preview, setPreview] = useState<JoinPreviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [honeypotVal, setHoneypotVal] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const [googleBusy, setGoogleBusy] = useState(false);
  const requiresTurnstile = !!import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    initialize();
    let cancelled = false;
    const demoOrGuest = useAuthStore.getState().session;
    if (demoOrGuest) {
      setAuthGate('authed');
      return () => {
        cancelled = true;
      };
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setAuthGate(data?.session ? 'authed' : 'anon');
      })
      .catch(() => {
        if (!cancelled) setAuthGate('anon');
      });
    return () => {
      cancelled = true;
    };
  }, [initialize]);

  useEffect(() => {
    if (session) setAuthGate('authed');
  }, [session]);

  // Countdown timer for rate limit cooldown
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((s) => (s && s > 1 ? s - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const applyLookupError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : 'Something went wrong loading this invite.';
    setErrorMessage(msg);
    const match = msg.match(/wait (\d+) seconds/i);
    if (match) {
      setLockoutSeconds(parseInt(match[1], 10));
    }
    setStatus('error');
  };

  const loadPreview = async () => {
    if (!code) return;
    if (honeypotVal) {
      setStatus('invalid');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    try {
      const lookup = await previewTripByJoinCode(code);
      if (!lookup) {
        setStatus('invalid');
        return;
      }
      setPreview(lookup);
      setStatus('preview');
    } catch (e) {
      applyLookupError(e);
    }
  };

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
      applyLookupError(e);
    }
  };

  useEffect(() => {
    // The join-code lookup is a public, guessable-code endpoint -- gate it
    // behind Turnstile solving first when configured (the DB-side attempt
    // lockout, supabase/migrations/0047 + 0060 + 0081, is the actual enforced
    // defense; this is a client-side friction layer on top of it, not a
    // server-verified one -- lookup RPCs don't check the token).
    if (authGate === 'wait') return;
    if (requiresTurnstile && !turnstileToken) return;
    if (authGate === 'authed') {
      load();
    } else {
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, turnstileToken, requiresTurnstile, authGate]);

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
        sendPushNotification(recipients, result.tripName, 'member_joined', { memberName: joinedMemberName }, result.tripId);
      }
      if (result) await goToTrip(result.tripId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not claim that member. Try again.');
      setStatus('ready');
    }
  };

  const handleContinueWithGoogle = async () => {
    if (!code) return;
    triggerHaptic('medium');
    setGoogleBusy(true);
    try {
      await signInWithGoogle(`/join/${encodeURIComponent(code)}`);
    } finally {
      setGoogleBusy(false);
    }
  };

  const retryLoad = () => {
    if (authGate === 'authed') load();
    else loadPreview();
  };

  if (requiresTurnstile && !turnstileToken && (status === 'loading' || authGate === 'wait')) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
        <div className="fade-in glass-card" style={{ width: '100%', maxWidth: '420px', padding: '28px 24px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px' }}>Verifying you're not a bot…</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
            One quick check before we look up this invite.
          </p>
          <TurnstileWidget onVerify={setTurnstileToken} />
        </div>
      </div>
    );
  }

  if (authGate === 'wait' || status === 'loading' || status === 'claiming') {
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
          <button type="button" className="gradient-btn" style={{ width: '100%' }} onClick={goHome}>
            {authGate === 'authed' ? 'Go to my trips' : 'Back to sign in'}
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
            onClick={retryLoad}
          >
            {isLocked ? `Try again in ${formatCooldown(lockoutSeconds)}` : 'Try again'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%', marginTop: '10px' }}
            onClick={goHome}
          >
            {authGate === 'authed' ? 'Go to my trips' : 'Back to sign in'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'preview' && preview) {
    const whoLabel =
      preview.memberFirstNames.length === 0
        ? 'No one has joined this trip yet.'
        : preview.memberFirstNames.length === 1
          ? `${buildAutoGroupName(preview.memberFirstNames)} is already on this trip.`
          : `${buildAutoGroupName(preview.memberFirstNames)} are already on this trip.`;
    const dateLabel = formatDateRange(preview.startDate, preview.endDate);

    return (
      <div className="app-container" style={{ overflowY: 'auto' }}>
        <div className="fade-in" style={{ padding: 'max(24px, var(--safe-top, 24px)) 20px max(24px, var(--safe-bottom, 24px)) 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
              <button
                type="button"
                className="legal-page-back"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, fontSize: '13px' }}
                onClick={handleBack}
              >
                <IconChevronLeft size={16} />
                Back
              </button>
            </div>

            <h2 style={{ marginBottom: '4px' }}>You're invited to "{preview.tripName}"</h2>
            {dateLabel ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>{dateLabel}</p>
            ) : null}

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(15, 169, 143, 0.06)',
                border: '1px solid var(--border-color)',
                marginBottom: '18px',
              }}
            >
              <IconMembers size={16} className="icon-sm" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{whoLabel}</p>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Sign in with Google to pick your name and join. Expenses and balances stay hidden until you're in.
            </p>

            {authError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginBottom: '12px' }}>{authError}</p>
            )}

            <button
              type="button"
              className="login-btn-google"
              style={{ width: '100%' }}
              disabled={googleBusy}
              onClick={handleContinueWithGoogle}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" className="login-google-icon" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{googleBusy ? 'Opening Google…' : 'Continue with Google to join'}</span>
            </button>
          </div>
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            All members of "{result.tripName}" have already claimed their spot. Ask the trip admin if you think this is a mistake.
          </p>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: '100%' }}
            onClick={handleBack}
          >
            Go to my trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ overflowY: 'auto' }}>
      <div className="fade-in" style={{ padding: 'max(24px, var(--safe-top, 24px)) 20px max(24px, var(--safe-bottom, 24px)) 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
          {/* Top navigation row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
            <button
              type="button"
              className="legal-page-back"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, fontSize: '13px' }}
              onClick={handleBack}
            >
              <IconChevronLeft size={16} />
              Back
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
}
