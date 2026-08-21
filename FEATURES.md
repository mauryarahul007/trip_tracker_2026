# ✨ Trip Tracker Feature Tracker

*Feature additions log -- parallel to BUGS.md, tracks requests and shipped work instead of defects.*
*Single Source of Truth: `features/features.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count |
| :--- | :--- |
| **Total Tracked** | **1** |
| **💡 Requested** | **0** |
| **📋 Planned** | **0** |
| **🟡 In Progress** | **0** |
| **✅ Shipped** | **1** |
| **⚪ Won't Do** | **0** |

---

## 🚧 Active (Requested, Planned & In Progress)

*Nothing in the queue right now.*

---

## 📖 Active Feature Details

*Nothing to detail.*

## ✅ Shipped History

| ID | Title | Category | Requested By | Shipped By | Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | Feature Additions Tracker | `admin` | `claude-cli` | `claude-cli` | Parallel system to the Bug Ledger. Migration 0063, featureApi.ts, feature.mjs CLI, FeatureRequestModal.tsx (Settings > Suggest a Feature), AdminFeaturesPage.tsx (Ops Deck Features tab) with flag-linking. Commit 1bf95d6. |

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
