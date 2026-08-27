import { useState, useEffect } from 'react';
import { createFeatureRequest } from '../services/featureApi';
import { useAuthStore } from '../store/authStore';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconChevronLeft, IconCheckCircle, IconAlertCircle } from './Icons';

type Props = {
  onBack: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  onRegisterBackGuard?: (guard: (() => void) | null) => void;
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ui-ux', label: 'UI / Design' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'admin', label: 'Admin / Ops' },
  { value: 'sync', label: 'Offline & Sync' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'security', label: 'Security' },
  { value: 'performance', label: 'Performance' },
  { value: 'native', label: 'Native App' },
  { value: 'general', label: 'General' },
];

export function FeatureRequestModal({ onBack, onRequestConfirm, onRegisterBackGuard }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);
  const userEmail = useAuthStore((s) => s.session?.user.email ?? null);

  const hasUnsentText = Boolean(title.trim() || description.trim());

  const handleSubmit = async (): Promise<boolean> => {
    if (!title.trim()) {
      setSubmitResult({ ok: false, message: 'Give it a short summary first.' });
      return false;
    }
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      await createFeatureRequest({
        title: title.trim(),
        description: description.trim(),
        category: category as Parameters<typeof createFeatureRequest>[0]['category'],
        requestedBy: userEmail || 'traveler',
        environment: {
          platform: 'web',
          route: typeof window !== 'undefined' ? window.location.hash : '#/',
        },
      });
      setSubmitResult({ ok: true, message: 'Thanks — added to the list.' });
      setTitle('');
      setDescription('');
      return true;
    } catch {
      setSubmitResult({ ok: false, message: "Couldn't send that just now. Try again in a bit." });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const attemptBack = () => {
    if (!hasUnsentText) {
      onBack();
      return;
    }
    if (!onRequestConfirm) {
      onBack();
      return;
    }
    onRequestConfirm({
      title: 'Idea not sent yet',
      message: "You've started a feature suggestion but haven't sent it. Send it before leaving, or discard it.",
      confirmLabel: 'Submit & Go Back',
      tertiaryLabel: 'Discard & Go Back',
      onTertiary: () => onBack(),
      onConfirm: () => {
        void handleSubmit().then((ok) => {
          if (ok) onBack();
        });
      },
    });
  };

  useEffect(() => {
    onRegisterBackGuard?.(hasUnsentText ? attemptBack : null);
    return () => onRegisterBackGuard?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsentText, title, description]);

  return (
    <div className="settings-container settings-subscreen-enter">
      <div className="settings-subscreen-nav-header">
        <button type="button" className="settings-subscreen-back-link" onClick={attemptBack}>
          <IconChevronLeft size={18} />
          <span>Settings</span>
        </button>
      </div>
      <h3 className="settings-subscreen-main-title">Suggest a Feature</h3>
      <p className="settings-subscreen-subtitle">
        What would make this app better for you? We read every one of these.
      </p>

      <div className="form-group">
        <label className="form-label" htmlFor="feature-title">In a sentence *</label>
        <input
          id="feature-title"
          type="text"
          className="input-field"
          placeholder="e.g. Let me split a receipt by line item"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <fieldset className="form-group">
        <legend className="form-label">Category</legend>
        <div className="badge-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`category-badge${category === c.value ? ' active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-group">
        <label className="form-label" htmlFor="feature-description">More detail (optional)</label>
        <textarea
          id="feature-description"
          rows={4}
          className="input-field bug-ruled-textarea"
          placeholder="What problem would this solve? What would it look like?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {submitResult && (
        <div
          className="bug-resolution-note"
          style={{
            marginBottom: '12px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: submitResult.ok ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {submitResult.ok ? <IconCheckCircle size={15} className="icon-sm" /> : <IconAlertCircle size={15} className="icon-sm" />}
          {submitResult.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px' }}>
        <button type="button" className="gradient-btn" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Suggestion'}
        </button>
      </div>
    </div>
  );
}
