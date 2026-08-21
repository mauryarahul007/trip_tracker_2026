import { useUpdateStore } from '../store/updateStore';
import { IconRefresh } from './Icons';

export function UpdateBanner() {
  const updateAvailable = useUpdateStore((state) => state.updateAvailable);

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(12px + var(--safe-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: 'calc(100vw - 32px)',
        width: 'max-content',
      }}
    >
      <div className="postmark-toast">
        <span className="pm-stamp" aria-hidden="true" style={{ borderColor: 'var(--primary-accent)', color: 'var(--primary-accent)' }}>
          <IconRefresh size={14} className="icon-sm" />
        </span>
        <span className="pm-text">A new version is ready</span>
        <button onClick={() => window.location.reload()} className="undo-toast-btn">Refresh</button>
      </div>
    </div>
  );
}
