import { LegalPageLayout } from './LegalPageLayout';
import { TermsOfServiceContent, TERMS_OF_SERVICE_UPDATED } from './TermsOfServiceContent';

export function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={TERMS_OF_SERVICE_UPDATED}>
      <TermsOfServiceContent />
    </LegalPageLayout>
  );
}
