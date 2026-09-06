import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JOIN_DEEP_LINK_EVENT } from '../utils/joinDeepLink';

/**
 * Routes native App Link / Universal Link join invites into /join/:code.
 * AuthStore emits JOIN_DEEP_LINK_EVENT after parsing the incoming URL.
 */
export function JoinDeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const onJoin = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (!code) return;
      navigate(`/join/${encodeURIComponent(code)}`);
    };
    window.addEventListener(JOIN_DEEP_LINK_EVENT, onJoin);
    return () => window.removeEventListener(JOIN_DEEP_LINK_EVENT, onJoin);
  }, [navigate]);

  return null;
}
