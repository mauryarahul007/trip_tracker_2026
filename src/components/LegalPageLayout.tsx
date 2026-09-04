import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from './Icons';

type Props = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

// Standalone, unauthenticated route (see main.tsx /privacy, /terms) — Apple,
// Google Play, and the Google OAuth consent screen all require a public URL
// to these documents that works without signing in or installing the app.
export function LegalPageLayout({ title, lastUpdated, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div className="legal-page-nav">
          <button type="button" className="legal-page-back" onClick={() => navigate(-1)}>
            <IconChevronLeft size={18} />
            Back
          </button>
          <a href="/" className="legal-page-brand">Trip Tracker</a>
        </div>

        <h1 className="legal-page-title">{title}</h1>
        <p className="legal-page-updated">Last updated {lastUpdated}</p>

        <div className="legal-page-body">{children}</div>
      </div>
    </div>
  );
}
