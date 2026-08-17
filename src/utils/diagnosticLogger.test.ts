import { describe, it, expect, beforeEach } from 'vitest';
import { diagnosticLogger } from './diagnosticLogger';

describe('DiagnosticLogger', () => {
  beforeEach(() => {
    diagnosticLogger.clearLogs();
  });

  it('records logs into the ring buffer correctly', () => {
    diagnosticLogger.log('info', 'Test log message');
    diagnosticLogger.log('warn', 'Test warning');
    diagnosticLogger.log('error', 'Test error');

    const logs = diagnosticLogger.getRecentLogs();
    expect(logs.length).toBe(3);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Test log message');
    expect(logs[1].level).toBe('warn');
    expect(logs[2].level).toBe('error');
  });

  it('limits log entries to maxLogs ring buffer size', () => {
    for (let i = 0; i < 40; i++) {
      diagnosticLogger.log('info', `Log number ${i}`);
    }

    const logs = diagnosticLogger.getRecentLogs();
    expect(logs.length).toBe(30);
    expect(logs[logs.length - 1].message).toBe('Log number 39');
  });

  it('captures a valid diagnostic snapshot', async () => {
    diagnosticLogger.log('error', 'Test error for snapshot');
    const snapshot = await diagnosticLogger.captureSnapshot({ id: 'trip-123', name: 'Goa Trip' });

    expect(snapshot).toBeDefined();
    expect(snapshot.appVersion).toBe('1.0.0');
    expect(snapshot.state.activeTripId).toBe('trip-123');
    expect(snapshot.state.activeTripName).toBe('Goa Trip');
    expect(Array.isArray(snapshot.recentLogs)).toBe(true);
  });

  it('formats AI-ready report correctly with markdown sections', async () => {
    const snapshot = await diagnosticLogger.captureSnapshot({ id: 'trip-123', name: 'Goa Trip' });
    const md = diagnosticLogger.formatReportForAI(
      'Sample Math Glitch',
      'Split percentage sum did not match 100%',
      'high',
      'splits-math',
      'Open trip\nAdd expense',
      snapshot
    );

    expect(md).toContain('### 🐞 Bug Report: Sample Math Glitch');
    expect(md).toContain('- **Severity**: `HIGH`');
    expect(md).toContain('- **Category**: `splits-math`');
    expect(md).toContain('#### Steps to Reproduce');
    expect(md).toContain('1. Open trip');
    expect(md).toContain('2. Add expense');
  });
});
