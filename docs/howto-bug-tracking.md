# How to Use the Bug Tracking System

This guide outlines how to use the unified **Bug Tracker** in **Trip Tracker 2026** across **Antigravity AI**, **Claude CLI** (terminal / hive sessions), and **Superadmins / QA testers**.

---

## 🚀 Quick Reference Cheat Sheet

| Action | Command / Method |
| :--- | :--- |
| **Superadmin UI Console** | Navigate to **Settings** → **Superadmin Console** → **Superadmin Bug Tracker** |
| **Add a Bug (UI)** | In the Superadmin Console, tap **"+ Add Bug"** |
| **Resolve a Bug (UI)** | In the Superadmin Console, tap **"✅ Mark Resolved"** on any bug card |
| **Add a Bug (CLI)** | `npm run bug:add -- --title "Bug summary" --severity high --category navigation --by claude-cli` |
| **List Open Bugs (CLI)** | `npm run bug:list` |
| **List All Bugs (CLI)** | `npm run bug -- list --all` |
| **View Bug Details (CLI)** | `npm run bug -- show BUG-001` |
| **Resolve a Bug (CLI)** | `npm run bug:resolve -- BUG-001 --by antigravity --fix "Fixed in commit ..."` |
| **Sync Markdown Board** | `npm run bug:sync` |
| **Crash Reporting** | Tap **"Copy Crash Report for Claude / Antigravity"** on the React Error screen |

---

## 1. Using the Superadmin Bug Console (UI)

The application provides a dedicated **Superadmin Bug Console** for administrators and developers:

### A. Accessing the Console
1. Open the application locally or on your deployed environment.
2. Tap the **Settings** tab at the bottom.
3. Under the **"Superadmin Console"** section, tap **"🛡️ Superadmin Bug Tracker"**.
4. *(Note: This section is visible only to Superadmins and Trip Admins).*

### B. Viewing & Filtering Bugs
- **Summary Metrics**: Real-time KPI tiles for Total Bugs, Open 🟢, In Progress 🟡, Resolved ✅, and Critical 🚨.
- **Search Bar**: Instant full-text search across bug titles, descriptions, categories, and IDs.
- **Filter Pills**: One-tap filtering by status (`All`, `Open`, `In Progress`, `Resolved`, `Critical`) or by category.
- **Detailed Bug Specs**: Tap **"▼ View Specs"** on any card to view reproduction steps, expected vs actual behavior, diagnostic logs, and resolution details.

### C. Adding a Bug via the UI
1. Tap the **"+ Add Bug"** button in the header.
2. Fill in the Title, Severity, Category, Description, and Reproduction Steps.
3. Tap **"Save & Sync Bug to Ledger"**.
4. The bug is saved, assigned the next sequential ID (`BUG-XXX`), and immediately synced with `bugs/bugs.json` and `BUGS.md`!

### D. Updating & Resolving Bugs in the UI
- **Start Work**: Tap **"🟡 Start Work"** to mark a bug as in-progress.
- **Mark Resolved**: Tap **"✅ Mark Resolved"**, enter your resolution note or commit reference, and confirm.
- **Re-open**: Tap **"🔄 Re-open Bug"** if an issue regresses.
- **Copy AI Prompt**: Tap **"📋 Copy Prompt for AI"** to generate structured markdown ready to paste into Antigravity or Claude CLI.
- **Delete**: Remove obsolete entries from the ledger.

---

## 2. Using the CLI Tool

The Bug CLI is located at `scripts/bug.mjs` and wrapped by npm scripts in `package.json`.

### A. Filing a New Bug (`bug:add`)
```bash
npm run bug:add -- \
  --title "Hardware back button reloads page on Android" \
  --severity high \
  --category navigation \
  --desc "Pressing hardware back button causes full reload instead of navigating to previous tab." \
  --steps "1. Open trip; 2. Tap on settings; 3. Press Android back button" \
  --expected "Returns to expenses tab" \
  --actual "Page refreshes" \
  --by claude-cli
```

**Options**:
- `--title, -t` *(Required)*: Brief one-line summary of the bug.
- `--severity, -s`: `critical` | `high` | `medium` | `low` (default: `medium`).
- `--category, -c`: `navigation` | `splits-math` | `offline-sync` | `p2p-sync` | `receipts-camera` | `auth` | `ui-ux` | `performance` | `general`.
- `--desc`: Detailed description.
- `--by`: Identifier of the reporting agent or person (e.g. `antigravity`, `claude-cli`, `superadmin`).
- `--steps`: Semicolon-separated or newline-separated reproduction steps.
- `--expected`: What should have happened.
- `--actual`: What actually occurred.
- `--offline`: Flag indicating the bug happened while offline.

### B. Viewing and Filtering Bugs (`bug:list`)
```bash
# View open and in-progress bugs (default)
npm run bug:list

# Filter by severity
npm run bug -- list --severity critical

# Filter by category
npm run bug -- list --category offline-sync

# View all historical bugs including resolved
npm run bug -- list --all
```

### C. Viewing Full Details (`bug:show`)
```bash
npm run bug -- show BUG-001
```

### D. Resolving a Bug (`bug:resolve`)
```bash
npm run bug:resolve -- BUG-001 --by antigravity --fix "Added hash navigation listener in App.tsx to handle hardware back buttons."
```
This automatically updates `bugs/bugs.json` and regenerates `BUGS.md`.

---

## 3. Bi-Directional Live Sync Mechanics

When running `npm run dev`, Vite's built-in REST middleware (`/api/bugs`) binds the Superadmin UI directly to the filesystem ledger (`bugs/bugs.json`):
1. **Any bug added or resolved in the UI** is immediately written to `bugs/bugs.json` and updates `BUGS.md`.
2. **Any bug added or resolved in the CLI** (`npm run bug:add` / `npm run bug:resolve`) is immediately visible when refreshing or clicking **"Sync"** in the Superadmin UI.
3. If running offline or without the local dev server, changes fall back safely to `localStorage`.

---

## 4. Crash Capture via ErrorBoundary

If an uncaught JavaScript runtime exception occurs:
1. The app renders a recovery screen (`ErrorBoundary.tsx`).
2. An unhandled exception is automatically captured in `diagnosticLogger`.
3. The tester or developer can tap **"📋 Copy Crash Report for Claude / Antigravity"**.
4. The generated markdown contains exception stacks, component hierarchy, and diagnostic logs ready to be fixed by an AI agent.
