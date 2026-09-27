// Suspense fallback for lazily loaded dialogs: the first open of a dialog
// used to render nothing while its chunk downloaded, so the tap looked
// ignored. data-no-ghost keeps ghostExit from fading this placeholder out
// over the real dialog when it arrives.
export function SheetSkeleton() {
  return (
    <div className="modal-overlay" data-no-ghost="" role="status" aria-label="Loading">
      <div className="modal-card sheet-skeleton-card">
        <div className="skeleton" style={{ width: '45%', height: '18px' }} />
        <div className="skeleton" style={{ width: '80%', height: '12px' }} />
        <div className="skeleton" style={{ width: '100%', height: '72px', marginTop: '8px' }} />
        <div className="skeleton" style={{ width: '100%', height: '40px', borderRadius: '9999px', marginTop: '8px' }} />
      </div>
    </div>
  );
}
