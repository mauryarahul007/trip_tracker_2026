import { useRef, useState, useEffect, useCallback, type MutableRefObject, type PointerEvent } from 'react';
import type { Trip, Category, Expense } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import { IconClose } from './Icons';
import { SettingsView, type ThemePref } from './SettingsView';
import { useTripStore } from '../store/tripStore';
import { getAppVersion, WEB_APP_VERSION } from '../utils/appVersion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { triggerHaptic } from '../utils/haptics';

const DRAWER_EXIT_MS = 280;
const SWIPE_DISMISS_PX = 80;

type Props = {
  onClose: () => void;
  closeRef?: MutableRefObject<(() => void) | null>;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  themePref: ThemePref;
  setThemePref: (v: ThemePref) => void;

  onExportJson: () => void;
  showImportArea: boolean;
  setShowImportArea: (v: boolean) => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importStatus: 'idle' | 'pending' | 'success' | 'error';
  importErrorMessage?: string | null;
  onImport: (jsonOverride?: string) => void;
  onClearDatabase: () => void;
  onLoadDemoTrip: () => void;

  archivedTrips: Trip[];
  onRestoreTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;

  userEmail: string | null;
  crossTripBalances?: Record<string, number>;
  onSignOut: () => void;
  onDeleteAccount?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;

  categories?: Category[];
  activeTripExpenses?: Expense[];
  onAddCategory?: (name: string, icon: string) => Promise<void>;
  onDeleteCategory?: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv?: () => void;
  isAdmin?: boolean;
  onOpenShareTrip?: () => void;
  onNavigateToBalances?: () => void;
  baseCurrency?: string;
  onOpenFxRates?: () => void;
  onOpenMediaGallery?: () => void;
  onOpenOfflineSnapshot?: () => void;
  onOpenSuperadminPortal?: () => void;
  onOpenOpsBugs?: () => void;
};

export function GlobalSettingsModal({
  onClose,
  closeRef,
  onRequestConfirm,
  onNavigateToBalances,
  themePref,
  setThemePref,
  onExportJson,
  showImportArea,
  setShowImportArea,
  importJson,
  setImportJson,
  importStatus,
  importErrorMessage,
  onImport,
  onClearDatabase,
  onLoadDemoTrip,
  archivedTrips,
  onRestoreTrip,
  onDeleteTrip,
  userEmail,
  crossTripBalances,
  onSignOut,
  onDeleteAccount,
  pwaInstallable = false,
  onInstallApp,
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin = true,
  onOpenShareTrip,
  baseCurrency,
  onOpenFxRates,
  onOpenMediaGallery,
  onOpenOfflineSnapshot,
  onOpenSuperadminPortal,
  onOpenOpsBugs,
}: Props) {
  const storeCategories = useTripStore((s) => s.categories);
  const storeExpenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);

  const effectiveCategories = categories || storeCategories;
  const effectiveExpenses = activeTripExpenses || storeExpenses.filter((e) => e.tripId === activeTripId);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const [exiting, setExiting] = useState(false);
  const [dragX, setDragX] = useState(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    triggerHaptic('light');
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      onCloseRef.current();
      return;
    }
    setExiting(true);
    window.setTimeout(() => onCloseRef.current(), DRAWER_EXIT_MS);
  }, []);

  useEffect(() => {
    if (!closeRef) return;
    closeRef.current = requestClose;
    return () => {
      closeRef.current = null;
    };
  }, [closeRef, requestClose]);

  useFocusTrap(sheetRef, !exiting, false, requestClose);

  const [appVersion, setAppVersion] = useState<string>(() => `${WEB_APP_VERSION}`);
  useEffect(() => {
    getAppVersion().then(setAppVersion).catch(() => {});
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (exiting) return;
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select, label')) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    draggingRef.current = false;
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!draggingRef.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        dragStartRef.current = null;
        return;
      }
      draggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDragX(Math.max(0, dx));
  };

  const handlePointerUp = () => {
    if (!dragStartRef.current) return;
    const shouldDismiss = draggingRef.current && dragX > SWIPE_DISMISS_PX;
    dragStartRef.current = null;
    draggingRef.current = false;
    if (shouldDismiss) {
      setDragX(0);
      requestClose();
      return;
    }
    setDragX(0);
  };

  const sheetStyle = dragX > 0
    ? { transform: `translateX(${dragX}px)`, transition: 'none' as const }
    : undefined;

  return (
    <div
      className={`modal-backdrop drawer-right${exiting ? ' is-exiting' : ''}`}
      onClick={requestClose}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="modal-sheet settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-settings-title"
        data-no-tab-swipe="true"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <header className="app-header" style={{ margin: '-20px -20px 20px', paddingTop: 'max(20px, var(--safe-top, 0px))' }}>
          <div className="app-header-top">
            <div className="app-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 id="global-settings-title" className="app-logo" style={{ fontSize: '20px', color: '#FFFFFF' }}>Settings</h2>
              <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-family-mono)', background: 'rgba(23, 182, 166, 0.2)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '1px 7px', borderRadius: '10px', fontWeight: 700 }}>
                v{appVersion}
              </span>
            </div>
            <button
              type="button"
              className="secondary-btn touch-target-btn"
              style={{ minWidth: '38px', minHeight: '38px', width: '38px', height: '38px', padding: 0, color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Close settings"
              title="Close"
              onClick={requestClose}
            >
              <IconClose size={15} className="icon-sm" />
            </button>
          </div>
        </header>

        <SettingsView
          categories={effectiveCategories}
          activeTripExpenses={effectiveExpenses}
          onAddCategory={onAddCategory || (async () => {})}
          onDeleteCategory={onDeleteCategory || (async () => {})}
          onExportCsv={onExportCsv}
          isAdmin={isAdmin}
          themePref={themePref}
          setThemePref={setThemePref}
          onExportJson={onExportJson}
          showImportArea={showImportArea}
          setShowImportArea={setShowImportArea}
          importJson={importJson}
          setImportJson={setImportJson}
          importStatus={importStatus}
          importErrorMessage={importErrorMessage}
          onImport={onImport}
          onClearDatabase={onClearDatabase}
          onLoadDemoTrip={onLoadDemoTrip}
          archivedTrips={archivedTrips}
          onRestoreTrip={onRestoreTrip}
          onDeleteTrip={onDeleteTrip}
          userEmail={userEmail}
          crossTripBalances={crossTripBalances}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
          pwaInstallable={pwaInstallable}
          onInstallApp={onInstallApp}
          hasActiveTrip={Boolean(activeTripId)}
          onClose={requestClose}
          onRequestConfirm={onRequestConfirm}
          onOpenShareTrip={onOpenShareTrip}
          onNavigateToBalances={onNavigateToBalances}
          baseCurrency={baseCurrency}
          onOpenFxRates={onOpenFxRates}
          onOpenMediaGallery={onOpenMediaGallery}
          onOpenOfflineSnapshot={onOpenOfflineSnapshot}
          onOpenSuperadminPortal={onOpenSuperadminPortal}
          onOpenOpsBugs={onOpenOpsBugs}
        />
      </div>
    </div>
  );
}
