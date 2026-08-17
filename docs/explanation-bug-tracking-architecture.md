# Bug Tracking & Diagnostics Architecture

This document explains the design principles, data flow, storage strategies, and multi-agent coordination mechanics behind the Trip Tracker 2026 Bug Tracking System.

---

## 1. Architectural Principles

1. **Offline-First & Git Native**:
   - The bug tracker requires no external paid SaaS dependencies (Jira, Linear, Bugsnag).
   - Storage lives directly in the git repository (`bugs/bugs.json`), ensuring bug tickets branch, merge, and evolve in lockstep with the codebase.

2. **Dual Representation (Machine + Human)**:
   - **`bugs/bugs.json`**: Strict JSON schema for programmatic parsing, automated test generation, and CLI tools.
   - **`BUGS.md`**: Automatically rendered Markdown dashboard with summary metrics, active bug specifications, and resolution history.

3. **Multi-Agent Interoperability**:
   - Designed specifically for seamless cooperation between **Antigravity AI**, **Claude CLI** (Hive swarm), and human developers.
   - CLI flags conform to standard Unix patterns and can be executed programmatically by agents.

---

## 2. System Components

```
                        ┌─────────────────────────────────┐
                        │      In-App Error / Event       │
                        └────────────────┬────────────────┘
                                         │
                                         ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                  In-Memory DiagnosticLogger (Ring Buffer)                   │
   │  - Captures uncaught window & promise errors                                │
   │  - Non-destructively intercepts console.error / warn                        │
   │  - Measures storage quota, network state, sync backlog, active route        │
   └───────────────────────┬─────────────────────────────┬───────────────────────┘
                           │                             │
                           ▼                             ▼
        ┌──────────────────────────────────┐ ┌───────────────────────────────────┐
        │       BugReportModal.tsx         │ │         ErrorBoundary.tsx         │
        │   - In-App developer drawer      │ │   - Runtime crash screen          │
        │   - Copy AI Markdown / JSON      │ │   - 1-click AI crash dump         │
        └──────────────────────────────────┘ └───────────────────────────────────┘
                           │
                           ▼ (Human / Agent Prompt Injection)
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                      Agent Session (Antigravity / Claude)                   │
   │                                     │                                       │
   │           Runs CLI: `node scripts/bug.mjs add / resolve`                    │
   └─────────────────────────────────────┬───────────────────────────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Local Ledger (`bugs/bugs.json`)   │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼ (Auto-Sync)
                      ┌──────────────────────────────────────┐
                      │     Markdown Board (`BUGS.md`)       │
                      └──────────────────────────────────────┘
```

---

## 3. Data Schema

Each bug entry in `bugs/bugs.json` adheres to the following interface:

```typescript
export interface BugRecord {
  id: string; // e.g. "BUG-001"
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 
    | 'offline-sync' 
    | 'splits-math' 
    | 'ui-ux' 
    | 'navigation' 
    | 'auth' 
    | 'receipts-camera' 
    | 'p2p-sync' 
    | 'performance' 
    | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  foundBy: string; // e.g. 'antigravity' | 'claude-cli' | 'human'
  environment: {
    platform: 'web' | 'android' | 'ios';
    browser?: string;
    isOnline: boolean;
    appVersion: string;
    route?: string;
  };
  reproSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  diagnostics?: {
    stackTrace?: string;
    consoleLogs?: string[];
    syncQueueLength?: number;
    activeTripId?: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}
```

---

## 4. In-Memory Ring Buffer (`DiagnosticLogger`)

To provide rich context without consuming excessive memory or polluting browser storage:
- `DiagnosticLogger` maintains a fixed-capacity ring buffer of 30 recent log entries.
- When an error occurs, the logger automatically collects the latest storage quota, active route, offline sync queue backlog, and the preceding console messages.
- Reports formatted by `formatReportForAI()` produce self-contained markdown payloads that give AI agents all diagnostic clues needed to pinpoint root causes immediately.
