import { LegalPageLayout } from './LegalPageLayout';
import { PrivacyPolicyContent, PRIVACY_POLICY_UPDATED } from './PrivacyPolicyContent';

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={PRIVACY_POLICY_UPDATED}>
      <PrivacyPolicyContent />
    </LegalPageLayout>
  );
}
