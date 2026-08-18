import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  onVerify?: (token: string) => void;
  onError?: () => void;
  className?: string;
};

export function TurnstileWidget({ onVerify, onError, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    // Load Turnstile script dynamically if not already present
    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token: string) => {
            onVerify?.(token);
          },
          'error-callback': () => {
            onError?.();
          },
          'expired-callback': () => {
            onError?.();
          },
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => renderWidget();
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onError]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} style={{ minHeight: '65px', margin: '12px 0' }} />;
}
