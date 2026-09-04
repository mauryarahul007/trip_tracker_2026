import { useEffect, useState } from 'react';
import { LegalPageLayout } from './LegalPageLayout';
import { useAuthStore } from '../store/authStore';
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog';

// Public, unauthenticated web resource for account/data deletion -- Google
// Play requires this reachable even without the app installed or a session
// (support.google.com/googleplay/android-developer, "Data deletion"). If a
// session exists (checked via the same authStore.initialize() RequireAuth
// uses -- this route sits outside RequireAuth, so nothing else fetches it
// for us) the deletion can happen right here; otherwise this points back to
// the in-app path (Settings > Delete Account) or email as a fallback.
export function DeleteAccountPage() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initialize = useAuthStore((s) => s.initialize);
  const deleteOwnAccount = useAuthStore((s) => s.deleteOwnAccount);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleDeleteClick = () => {
    setConfirmRequest({
      title: 'Delete Account',
      message:
        'This permanently deletes your account and every trip you own -- including trips shared with other members, who will lose them too. Trips you belong to but don\'t own are unaffected. This cannot be undone.',
      confirmLabel: 'Delete My Account',
      danger: true,
      onConfirm: async () => {
        const res = await deleteOwnAccount();
        setResult(res);
      },
    });
  };

  return (
    <LegalPageLayout title="Delete Your Account" lastUpdated="September 4, 2026">
      <section>
        <h2>Request account deletion</h2>
        {result ? (
          <p>{result.message}</p>
        ) : !initialized ? (
          <p>Checking your sign-in status&hellip;</p>
        ) : session ? (
          <>
            <p>Signed in as <strong>{session.user.email}</strong>. Deleting your account is permanent and
              cannot be undone -- review what's affected below before continuing.</p>
            <button type="button" className="gradient-btn" style={{ background: 'var(--color-danger)' }} onClick={handleDeleteClick}>
              Delete My Account
            </button>
          </>
        ) : (
          <p>You're not signed in on this page. Sign in to the app and go to
            <strong> Settings &rarr; Delete Account</strong> to delete your account directly, or email
            <a href="mailto:mauryarahul007@gmail.com"> mauryarahul007@gmail.com</a> from the address on your
            account and we'll complete the deletion for you within 30 days.</p>
        )}
      </section>

      <section>
        <h2>What gets deleted</h2>
        <ul>
          <li>Your account and profile (name, email, avatar).</li>
          <li>Every trip you own, including expenses, receipt photos, and members' access to that trip.</li>
          <li>Your push notification registration.</li>
        </ul>
        <p>Trips you belong to but don't own stay intact for their other members -- your name is simply
          removed from them.</p>
      </section>

      {confirmRequest && <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />}
    </LegalPageLayout>
  );
}
