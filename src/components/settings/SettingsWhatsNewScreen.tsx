import type { FeatureFlagKey } from '../../types/admin';
import { FEATURE_FLAGS_META } from '../../utils/featureFlags';
import { CHANGELOG_ENTRIES } from '../../utils/changelog';
import { IconSparkles, IconClipboardList } from '../Icons';
import { SettingsCell } from '../common/SettingsCell';
import { SettingsSection } from '../common/SettingsSection';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  newlyUnlockedFlags: FeatureFlagKey[];
};

export function SettingsWhatsNewScreen({ parentTitle, onBack, newlyUnlockedFlags }: Props) {
  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="What's New"
      subtitle="Features newly unlocked for you, and recent app updates."
    >
      {newlyUnlockedFlags.length > 0 && (
        <SettingsSection title="Newly unlocked for you">
          {newlyUnlockedFlags.map((key, idx) => {
            const meta = FEATURE_FLAGS_META[key];
            return (
              <SettingsCell
                key={key}
                icon={<IconSparkles size={18} />}
                iconGlow="amber"
                title={meta.label}
                subtitle={meta.description}
                chevron={false}
                hasDivider={idx < newlyUnlockedFlags.length - 1}
              />
            );
          })}
        </SettingsSection>
      )}

      <SettingsSection title="Recent app updates">
        {CHANGELOG_ENTRIES.map((entry, idx) => (
          <SettingsCell
            key={entry.version}
            icon={<IconClipboardList size={18} />}
            iconGlow="slate"
            title={`v${entry.version}`}
            subtitle={entry.summary}
            value={entry.date}
            chevron={false}
            hasDivider={idx < CHANGELOG_ENTRIES.length - 1}
          />
        ))}
      </SettingsSection>
    </SettingsSubscreenFrame>
  );
}
