# 🐞 Trip Tracker Bug Tracker

*Unified multi-agent bug ledger for Antigravity, Claude CLI, and human testers.*
*Single Source of Truth: `bugs/bugs.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count | Status Notes |
| :--- | :--- | :--- |
| **Total Tracked** | **2** | All recorded bugs across sessions |
| **🟢 Open** | **1** | No critical blockers, 1 High |
| **🟡 In Progress** | **0** | Active investigation or fix |
| **✅ Resolved** | **1** | Verified & closed |
| **⚪ Won't Fix** | **0** | Expected behavior / deferred |

---

## 🚨 Active Bugs (Open & In Progress)

| ID | Severity | Category | Title | Found By | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[BUG-101](#bug-101)** | 🟠 High | `navigation` | Mock Open Bug | `claude-cli` | 🟢 Open |

---

## 📖 Detailed Active Bug Specs

### BUG-101: Mock Open Bug

- **Severity**: `HIGH` | **Category**: `navigation` | **Status**: `open`
- **Found By**: `claude-cli` on 17/8/2026 (web)

**Description**:
Testing markdown generation

---

## ✅ Resolved Bugs History

| ID | Title | Category | Severity | Found By | Resolved By | Fix Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-102** | Mock Resolved Bug | `ui-ux` | `low` | `antigravity` | `antigravity` | Fixed in CSS |

---

## 🛠️ CLI Reference for AI Agents & Developers

```bash
# Add a new bug
npm run bug:add -- --title "Expense split discrepancy on offline reconnect" --severity high --category offline-sync --by claude-cli

# List open bugs
npm run bug:list

# View details for a bug
npm run bug -- show BUG-001

# Mark bug resolved
npm run bug:resolve -- BUG-001 --by antigravity --fix "Fixed in commit abc1234"

# Synchronize BUGS.md
npm run bug:sync
```
