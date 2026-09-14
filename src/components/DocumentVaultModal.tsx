import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { compressImageToDataUrl, compressDataUrlToDataUrl } from '../utils/image';
import { isBiometricEnrolled, verifyBiometricCredential } from '../utils/webAuthn';
import { triggerHaptic } from '../utils/haptics';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useHistoryBack } from '../utils/useHistoryBack';
import { useAuthStore } from '../store/authStore';
import {
  saveVaultDocument,
  getAllVaultDocuments,
  deleteVaultDocument,
  type VaultDocument,
  type VaultDocType,
} from '../services/documentVaultStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DOC_TYPE_LABELS: Record<VaultDocType, string> = {
  passport: '📘 Passport',
  visa: '📄 Visa',
  insurance: '🩺 Insurance',
  'id-card': '🪪 ID Card',
  other: '📎 Other',
};

export function DocumentVaultModal({ isOpen, onClose }: Props) {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [requiresUnlock, setRequiresUnlock] = useState(false);

  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [docType, setDocType] = useState<VaultDocType>('passport');
  const [expiryDate, setExpiryDate] = useState('');
  const [pendingImage, setPendingImage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useHistoryBack(isOpen, onClose);
  useEscapeKey(isOpen, onClose);

  // Gate behind biometric unlock only when the user already enrolled one
  // (Settings > Security) -- reuses the same WebAuthn primitives as the
  // app-lock overlay instead of a separate credential system.
  useEffect(() => {
    if (!isOpen) return;
    setIsUnlocked(false);
    setUnlockError('');
    const enrolled = isBiometricEnrolled(userId);
    setRequiresUnlock(enrolled);
    if (!enrolled) setIsUnlocked(true);
  }, [isOpen, userId]);

  useEffect(() => {
    if (!isOpen || !isUnlocked) return;
    getAllVaultDocuments().then(setDocs).catch(() => setDocs([]));
  }, [isOpen, isUnlocked]);

  if (!isOpen) return null;

  const handleUnlock = async () => {
    setIsVerifying(true);
    setUnlockError('');
    triggerHaptic('light');
    const res = await verifyBiometricCredential(userId);
    if (res.success) {
      triggerHaptic('success');
      setIsUnlocked(true);
    } else {
      triggerHaptic('heavy');
      setUnlockError(res.error || 'Biometric verification failed.');
    }
    setIsVerifying(false);
  };

  const resetForm = () => {
    setName('');
    setDocType('passport');
    setExpiryDate('');
    setPendingImage('');
    setIsAdding(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    setIsProcessing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPendingImage(dataUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNativeCapture = async () => {
    setIsProcessing(true);
    try {
      const photo = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Prompt });
      if (photo.dataUrl) {
        setPendingImage(await compressDataUrlToDataUrl(photo.dataUrl));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message !== 'User cancelled photos app') {
        // Non-cancel failures are rare enough here to skip a dedicated error banner.
        console.warn('Vault camera capture failed:', err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!pendingImage || !name.trim()) return;
    triggerHaptic('success');
    const doc: VaultDocument = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      docType,
      expiryDate: expiryDate || undefined,
      dataUrl: pendingImage,
      createdAt: Date.now(),
    };
    await saveVaultDocument(doc);
    setDocs((prev) => [doc, ...prev]);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    triggerHaptic('medium');
    await deleteVaultDocument(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="glass-card modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', borderRadius: '24px' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Document Vault</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Stored on this device only -- never uploaded</span>
            </div>
          </div>
          <button type="button" className="secondary-btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={onClose}>Close</button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {!isUnlocked ? (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔐</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Authenticate to open your document vault.
              </p>
              {unlockError && (
                <p style={{ fontSize: '12px', color: 'var(--color-danger, #ef4444)', marginBottom: '10px' }}>{unlockError}</p>
              )}
              <button type="button" className="gradient-btn" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={handleUnlock} disabled={isVerifying}>
                {isVerifying ? 'Verifying…' : 'Unlock'}
              </button>
            </div>
          ) : (
            <>
              {!requiresUnlock && (
                <div style={{ marginBottom: '12px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Tip: enable biometric lock in Settings for extra protection on this vault.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                {docs.map((doc) => (
                  <div key={doc.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.03)' }}>
                    <img src={doc.dataUrl} alt={doc.name} decoding="async" style={{ width: '100%', height: '96px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {DOC_TYPE_LABELS[doc.docType]}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.name}
                      </div>
                      {doc.expiryDate && (
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Expires {doc.expiryDate}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      style={{
                        position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px',
                        borderRadius: '50%', border: 'none', cursor: 'pointer', lineHeight: 1, fontSize: '11px',
                        background: confirmDeleteId === doc.id ? 'var(--color-danger, #ef4444)' : 'rgba(0,0,0,0.55)', color: '#fff',
                      }}
                      title={confirmDeleteId === doc.id ? 'Tap again to confirm delete' : 'Delete'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {!isAdding ? (
                <button type="button" className="secondary-btn" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => setIsAdding(true)}>
                  + Add Document
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Name (e.g. Rahul's Passport)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <select className="input-field" value={docType} onChange={(e) => setDocType(e.target.value as VaultDocType)}>
                    {(Object.keys(DOC_TYPE_LABELS) as VaultDocType[]).map((t) => (
                      <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="input-field"
                    aria-label="Expiry date (optional)"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />

                  {pendingImage ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={pendingImage} alt="Preview" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                      <button type="button" className="secondary-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setPendingImage('')}>Remove</button>
                    </div>
                  ) : Capacitor.isNativePlatform() ? (
                    <button type="button" className="secondary-btn" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={handleNativeCapture} disabled={isProcessing}>
                      {isProcessing ? 'Processing…' : '📷 Take or Choose Photo'}
                    </button>
                  ) : (
                    <input type="file" accept="image/*" ref={fileInputRef} className="input-field" onChange={handleFileChange} disabled={isProcessing} />
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="gradient-btn" style={{ flex: 1, padding: '9px', fontSize: '13px' }} disabled={!pendingImage || !name.trim()} onClick={handleSave}>
                      Save to Vault
                    </button>
                    <button type="button" className="secondary-btn" style={{ padding: '9px 14px', fontSize: '12px' }} onClick={resetForm}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
