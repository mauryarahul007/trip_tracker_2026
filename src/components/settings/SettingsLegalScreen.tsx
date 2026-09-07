import { PrivacyPolicyContent, PRIVACY_POLICY_UPDATED } from '../PrivacyPolicyContent';
import { TermsOfServiceContent, TERMS_OF_SERVICE_UPDATED } from '../TermsOfServiceContent';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type LegalKind = 'privacy' | 'terms';

type Props = {
  kind: LegalKind;
  parentTitle: string;
  onBack: () => void;
  onNavigate: (target: LegalKind) => void;
};

export function SettingsLegalScreen({ kind, parentTitle, onBack, onNavigate }: Props) {
  const isPrivacy = kind === 'privacy';

  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title={isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
      subtitle={`Last updated: ${isPrivacy ? PRIVACY_POLICY_UPDATED : TERMS_OF_SERVICE_UPDATED}`}
    >
      <div className="legal-page-body" style={{ padding: '0 4px 24px' }}>
        {isPrivacy ? (
          <PrivacyPolicyContent onNavigate={onNavigate} />
        ) : (
          <TermsOfServiceContent onNavigate={onNavigate} />
        )}
      </div>
    </SettingsSubscreenFrame>
  );
}
