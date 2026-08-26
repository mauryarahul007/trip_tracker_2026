import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTripStore } from '../store/tripStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const isSuperadmin = useTripStore((s) => s.isSuperadmin);
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    // CSS-only shimmer instead of a blank screen while the session loads.
    return (
      <div className="auth-splash">
        <div className="skeleton" />
      </div>
    );
  }

  if (!session && !isSuperadmin) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return <>{children}</>;
}
