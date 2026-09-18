import { CHANGELOG_ENTRIES } from '../../utils/changelog';
import { IconSparkles } from '../Icons';
import { SettingsSection } from '../common/SettingsSection';
import { SettingsSubscreenFrame } from './SettingsNavHeader';

type Props = {
  parentTitle: string;
  onBack: () => void;
  appVersion: string;
};

export function SettingsWhatsNewScreen({ parentTitle, onBack, appVersion }: Props) {
  // appVersion may be "3.30.1 (123)" on native/web builds -- match on the marketing part.
  const marketing = appVersion.split(' ')[0];
  const currentIdx = CHANGELOG_ENTRIES.findIndex((e) => e.version === marketing);
  const current = CHANGELOG_ENTRIES[currentIdx >= 0 ? currentIdx : 0];
  const earlier = CHANGELOG_ENTRIES.filter((e) => e !== current);

  return (
    <SettingsSubscreenFrame
      parentTitle={parentTitle}
      onBack={onBack}
      title="What's New"
      subtitle={`Version ${current.version} · ${current.date}`}
    >
      <SettingsSection>
        {current.changes.map((line, idx) => (
          <div
            key={idx}
            className={`settings-row-item ${idx < current.changes.length - 1 ? 'with-inset-divider' : 'no-divider'}`}
            style={{ cursor: 'default', alignItems: 'flex-start' }}
          >
            <div className="settings-row-left" style={{ alignItems: 'flex-start' }}>
              <div className="settings-squircle squircle-amber-glow" aria-hidden="true">
                <IconSparkles size={18} />
              </div>
              <div className="settings-row-texts">
                <span className="settings-row-title" style={{ whiteSpace: 'normal' }}>{line}</span>
              </div>
            </div>
          </div>
        ))}
      </SettingsSection>

      {earlier.length > 0 && (
        <SettingsSection title="Earlier versions">
          {earlier.map((entry, i) => (
            <div
              key={entry.version}
              className={`settings-row-item ${i < earlier.length - 1 ? 'with-inset-divider' : 'no-divider'}`}
              style={{ cursor: 'default', alignItems: 'flex-start' }}
            >
              <div className="settings-row-texts">
                <span className="settings-row-title">
                  v{entry.version} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {entry.date}</span>
                </span>
                {entry.changes.map((line, j) => (
                  <span key={j} className="settings-row-subtitle" style={{ whiteSpace: 'normal' }}>• {line}</span>
                ))}
              </div>
            </div>
          ))}
        </SettingsSection>
      )}
    </SettingsSubscreenFrame>
  );
}
