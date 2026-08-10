import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return null; // brief flash guard while the session is being read
  }

  if (!session) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return <>{children}</>;
}
