/**
 * Trip Tracker 2026 - In-App Diagnostic Logger
 * 
 * Lightweight singleton ring buffer that captures recent console errors,
 * warnings, network events, and app state snapshots for bug reports.
 */

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  data?: unknown;
}

export interface DiagnosticSnapshot {
  timestamp: string;
  appVersion: string;
  platform: 'web' | 'android' | 'ios';
  userAgent: string;
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  network: {
    isOnline: boolean;
    effectiveType?: string;
  };
  storage: {
    usageBytes?: number;
    quotaBytes?: number;
    usagePercent?: number;
  };
  state: {
    routeHash: string;
    syncQueueLength: number;
    activeTripId: string | null;
    activeTripName: string | null;
  };
  recentLogs: LogEntry[];
}

class DiagnosticLogger {
  private static instance: DiagnosticLogger;
  private logs: LogEntry[] = [];
  private readonly maxLogs = 30;
  private initialized = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): DiagnosticLogger {
    if (!DiagnosticLogger.instance) {
      DiagnosticLogger.instance = new DiagnosticLogger();
    }
    return DiagnosticLogger.instance;
  }

  private init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', `Unhandled Promise Rejection: ${event.reason?.message || String(event.reason)}`, event.reason?.stack);
    });

    // Intercept window errors
    window.addEventListener('error', (event) => {
      this.log('error', `Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`, event.error?.stack);
    });

    // Intercept console.error and console.warn non-destructively
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        this.log('error', msg);
      } catch {
        // Safe fallback
      }
      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      try {
        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        this.log('warn', msg);
      } catch {
        // Safe fallback
      }
      originalConsoleWarn.apply(console, args);
    };

    this.log('info', 'DiagnosticLogger initialized');
  }

  public log(level: 'error' | 'warn' | 'info', message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: message.slice(0, 500), // Protect against huge strings
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  public getRecentLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  /**
   * Capture a full telemetry and environment snapshot
   */
  public async captureSnapshot(activeTripInfo?: { id: string | null; name: string | null }): Promise<DiagnosticSnapshot> {
    let usageBytes: number | undefined;
    let quotaBytes: number | undefined;
    let usagePercent: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        usageBytes = estimate.usage;
        quotaBytes = estimate.quota;
        if (estimate.usage !== undefined && estimate.quota !== undefined && estimate.quota > 0) {
          usagePercent = Number(((estimate.usage / estimate.quota) * 100).toFixed(2));
        }
      } catch {
        // Storage estimate not available
      }
    }

    // Read sync queue length from localStorage safely
    let syncQueueLength = 0;
    try {
      const rawQueue = localStorage.getItem('trip-tracker-sync-queue');
      if (rawQueue) {
        const parsed = JSON.parse(rawQueue);
        if (Array.isArray(parsed)) syncQueueLength = parsed.length;
      }
    } catch {
      // Ignored
    }

    const platform: 'web' | 'android' | 'ios' = 
      typeof window !== 'undefined' && (window as unknown as { Capacitor?: { getPlatform: () => string } }).Capacitor
        ? ((window as unknown as { Capacitor: { getPlatform: () => string } }).Capacitor.getPlatform() as 'web' | 'android' | 'ios')
        : 'web';

    const conn = typeof navigator !== 'undefined' ? (navigator as unknown as { connection?: { effectiveType?: string } }).connection : undefined;

    return {
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0',
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      screen: {
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
        pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      },
      network: {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        effectiveType: conn?.effectiveType,
      },
      storage: {
        usageBytes,
        quotaBytes,
        usagePercent,
      },
      state: {
        routeHash: typeof window !== 'undefined' ? window.location.hash || '#/' : '#/',
        syncQueueLength,
        activeTripId: activeTripInfo?.id || null,
        activeTripName: activeTripInfo?.name || null,
      },
      recentLogs: this.getRecentLogs(),
    };
  }

  /**
   * Format a diagnostic report into an AI-ready Markdown block for Claude/Antigravity
   */
  public formatReportForAI(
    title: string,
    description: string,
    severity: string,
    category: string,
    reproSteps: string,
    snapshot: DiagnosticSnapshot
  ): string {
    const stepsFormatted = reproSteps
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map((s, idx) => `${idx + 1}. ${s}`)
      .join('\n');

    const logsFormatted = snapshot.recentLogs.length > 0
      ? snapshot.recentLogs.map(l => `[${l.timestamp.slice(11, 19)}] [${l.level.toUpperCase()}] ${l.message}`).join('\n')
      : 'No recent errors/warnings recorded.';

    return `### 🐞 Bug Report: ${title}

- **Severity**: \`${severity.toUpperCase()}\`
- **Category**: \`${category}\`
- **Reported Via**: In-App Diagnostic Tool
- **Platform**: \`${snapshot.platform}\` (Online: \`${snapshot.network.isOnline}\`)
- **Route**: \`${snapshot.state.routeHash}\`
- **Active Trip**: \`${snapshot.state.activeTripName || snapshot.state.activeTripId || 'None'}\`
- **Sync Queue Backlog**: \`${snapshot.state.syncQueueLength} pending actions\`
- **Storage Usage**: \`${snapshot.storage.usagePercent ?? 'N/A'}%\`

#### Description
${description || 'No description provided.'}

#### Steps to Reproduce
${stepsFormatted || '1. Open app\n2. Perform action'}

#### Diagnostic Telemetry
\`\`\`text
UserAgent: ${snapshot.userAgent}
Screen: ${snapshot.screen.width}x${snapshot.screen.height} (dpr: ${snapshot.screen.pixelRatio})
Timestamp: ${snapshot.timestamp}
\`\`\`

#### Recent Diagnostic Logs
\`\`\`text
${logsFormatted}
\`\`\`
`;
  }
}

export const diagnosticLogger = DiagnosticLogger.getInstance();
