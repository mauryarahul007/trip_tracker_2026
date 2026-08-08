export type ConfirmRequest = {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

type Props = {
  request: ConfirmRequest;
  onCancel: () => void;
};

export function ConfirmDialog({ request, onCancel }: Props) {
  const handleConfirm = () => {
    request.onConfirm();
    onCancel();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        className="glass-card fade-in"
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>{request.title || 'Please confirm'}</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{request.message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="gradient-btn"
            style={request.danger ? { flex: 1, background: 'var(--color-danger)' } : { flex: 1 }}
            onClick={handleConfirm}
          >
            {request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
