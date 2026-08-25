import { createControllerChangeGate } from './serviceWorkerUpdates';
import { useUpdateStore } from '../store/updateStore';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function registerServiceWorkerUpdateWatcher(): void {
  if (!('serviceWorker' in navigator)) return;

  const shouldTreatAsUpdate = createControllerChangeGate(!!navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (shouldTreatAsUpdate()) {
      useUpdateStore.getState().setUpdateAvailable();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        const safeUpdate = () => registration.update().catch(() => {});
        setInterval(safeUpdate, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) safeUpdate();
        });
      })
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}
