import { IconFileSpreadsheet, IconShield, IconSmartphone } from '../Icons';
import { SettingsCell } from '../common/SettingsCell';
import { SettingsSection } from '../common/SettingsSection';
import { SettingsSubscreenFrame } from './SettingsNavHeader';
import { prefetchSettingsLegal } from './prefetchSettingsLeaves';

type Props = {
  parentTitle: string;
  onBack: () => void;
  appVersion: string;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
};

export function SettingsAboutScreen({
  parentTitle,
  onBack,
  appVersion,
  onOpenPrivacy,
  onOpenTerms,
}: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="About & Legal"
      subtitle="App version and legal documents."
    >
      <SettingsSection title="About">
        <SettingsCell
          icon={<IconSmartphone size={18} />}
          iconGlow="slate"
          title="Trip Tracker 2026"
          subtitle={`Version ${appVersion} · Web Edition`}
          badge="STABLE"
          hasDivider={false}
        />
      </SettingsSection>
      <SettingsSection title="Legal">
        <SettingsCell
          icon={<IconShield size={18} />}
          iconGlow="slate"
          title="Privacy Policy"
          subtitle="What we collect and why"
          onPointerEnter={prefetchSettingsLegal}
          onPointerDown={prefetchSettingsLegal}
          onClick={onOpenPrivacy}
        />
        <SettingsCell
          icon={<IconFileSpreadsheet size={18} />}
          iconGlow="slate"
          title="Terms of Service"
          subtitle="Rules for using Trip Tracker"
          hasDivider={false}
          onPointerEnter={prefetchSettingsLegal}
          onPointerDown={prefetchSettingsLegal}
          onClick={onOpenTerms}
        />
      </SettingsSection>
    </SettingsSubscreenFrame>
  );
}
