import { useCallback, useState } from 'react';
import { IconAlertCircle, IconCheckCircle } from '../Icons';

type Tone = 'success' | 'danger';
type Toast = { id: number; text: string; tone: Tone };

const TOAST_MS = 3000;

// One toast for every Ops Deck page: a fixed, stacked corner toast
// (.ops-toast-stack) that slides in, instead of each page keeping its own
// single in-flow banner that pushed the page content down.
export function useOpsToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((text: string, tone: Tone | boolean = 'success') => {
    const id = Date.now() + Math.random();
    const resolved: Tone = tone === true || tone === 'danger' ? 'danger' : 'success';
    setToasts((prev) => [...prev, { id, text, tone: resolved }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const toastNode = toasts.length > 0 && (
    <div className="ops-toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className="ops-toast" data-tone={t.tone} role={t.tone === 'danger' ? 'alert' : 'status'}>
          {t.tone === 'success' ? <IconCheckCircle size={14} /> : <IconAlertCircle size={14} />}
          {t.text}
        </div>
      ))}
    </div>
  );

  return { showToast, toastNode };
}
