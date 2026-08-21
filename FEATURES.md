# ✨ Trip Tracker Feature Tracker

*Feature additions log -- parallel to BUGS.md, tracks requests and shipped work instead of defects.*
*Single Source of Truth: `features/features.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count |
| :--- | :--- |
| **Total Tracked** | **3** |
| **💡 Requested** | **1** |
| **📋 Planned** | **0** |
| **🟡 In Progress** | **0** |
| **✅ Shipped** | **2** |
| **⚪ Won't Do** | **0** |

---

## 🚧 Active (Requested, Planned & In Progress)

| ID | Category | Title | Requested By | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[FEAT-002](#feat-002)** | `ui-ux` | Test | `mauryarahul007@gmail.com` | 💡 Requested |

---

## 📖 Active Feature Details

### FEAT-002: Test

- **Category**: `ui-ux` | **Status**: `requested`
- **Requested By**: `mauryarahul007@gmail.com` on 21/8/2026 (web)
- **Route**: `#nav-3`

Test

---

## ✅ Shipped History

| ID | Title | Category | Requested By | Shipped By | Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | Feature Additions Tracker | `admin` | `claude-cli` | `claude-cli` | Parallel system to the Bug Ledger. Migration 0063, featureApi.ts, feature.mjs CLI, FeatureRequestModal.tsx (Settings > Suggest a Feature), AdminFeaturesPage.tsx (Ops Deck Features tab) with flag-linking. Commit 1bf95d6. |
| **FEAT-003** | Refresh button on Features tab | `admin` | `claude-cli` | `claude-cli` | reloadFleetData now returns a Promise so the button can await + spinner instead of requiring a full page reload. Commit 228c582. |

---

## 🛠️ CLI Reference

```bash
# Log a new feature (request or already-shipped work)
npm run feature:add -- --title "Ops Deck mobile responsiveness" --category admin --by claude-cli --status shipped

# List active (requested/planned/in-progress) features
npm run feature:list

# View details for a feature
npm run feature -- show FEAT-001

# Mark a feature shipped
npm run feature:ship -- FEAT-001 --by claude-cli --note "Shipped in commit abc1234"

# Synchronize FEATURES.md
npm run feature:sync
```
