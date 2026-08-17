/**
 * Auto-files a bug in the ledger for any uncaught error the app hits in the
 * wild — window errors, unhandled promise rejections, and React render
 * crashes (wired from ErrorBoundary). Runs regardless of who's looking.
 */
import { createBug } from '../services/bugApi';
import { diagnosticLogger } from './diagnosticLogger';

// ponytail: dedupe by message text for the life of the tab. Good enough to
// stop a repeating error from spamming the ledger; a real fingerprint
// (stack hash) would be the upgrade if distinct errors ever collide here.
const reportedSignatures = new Set<string>();
let listenersAttached = false;

export async function autoReportError(
  message: string,
  stack: string | undefined,
  source: 'window-error' | 'unhandled-rejection' | 'react-crash'
): Promise<void> {
  const signature = message.slice(0, 200);
  if (!signature || reportedSignatures.has(signature)) return;
  reportedSignatures.add(signature);

  try {
    const snapshot = await diagnosticLogger.captureSnapshot();
    await createBug({
      title: message.slice(0, 140) || 'Unhandled error',
      description: `Automatically captured ${source.replace('-', ' ')}.\n\n${stack || 'No stack trace available.'}`,
      severity: 'critical',
      category: 'general',
      status: 'open',
      foundBy: 'auto-crash-handler',
      environment: {
        platform: snapshot.platform,
        isOnline: snapshot.network.isOnline,
        appVersion: snapshot.appVersion,
        route: snapshot.state.routeHash,
      },
      reproSteps: [],
      expectedBehavior: 'App runs without throwing.',
      actualBehavior: message,
      diagnostics: {
        stackTrace: stack,
        consoleLogs: snapshot.recentLogs.map((l) => `[${l.level}] ${l.message}`),
        syncQueueLength: snapshot.state.syncQueueLength,
        activeTripId: snapshot.state.activeTripId || undefined,
      },
    });
  } catch {
    // Auto-filing must never itself take down the app.
  }
}

export function initAutoBugReporter(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('error', (event) => {
    void autoReportError(event.message, event.error?.stack, 'window-error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string; stack?: string } | undefined;
    const message = reason?.message || String(event.reason);
    void autoReportError(message, reason?.stack, 'unhandled-rejection');
  });
}
