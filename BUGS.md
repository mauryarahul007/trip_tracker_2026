# 🐞 Trip Tracker Bug Tracker

*Unified multi-agent bug ledger for Antigravity, Claude CLI, and human testers.*
*Single Source of Truth: `bugs/bugs.json` (auto-synced).*

---

## 📊 Summary Metrics

| Metric | Count | Status Notes |
| :--- | :--- | :--- |
| **Total Tracked** | **110** | All recorded bugs across sessions |
| **🟢 Open** | **22** | 🚨 **22 CRITICAL**, 0 High |
| **🟡 In Progress** | **0** | Active investigation or fix |
| **✅ Resolved** | **83** | Verified & closed |
| **⚪ Won't Fix** | **5** | Expected behavior / deferred |

---

## 🚨 Active Bugs (Open & In Progress)

| ID | Severity | Category | Title | Found By | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **[BUG-069](#bug-069)** | 🔴 **CRITICAL** | `general` | Importing a module script failed. | `auto-crash-handler` | 🟢 Open |
| **[BUG-074](#bug-074)** | 🔴 **CRITICAL** | `general` | Cannot read properties of null (reading 'useState') | `auto-crash-handler` | 🟢 Open |
| **[BUG-075](#bug-075)** | 🔴 **CRITICAL** | `general` | Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx | `auto-crash-handler` | 🟢 Open |
| **[BUG-076](#bug-076)** | 🔴 **CRITICAL** | `general` | Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx | `auto-crash-handler` | 🟢 Open |
| **[BUG-077](#bug-077)** | 🔴 **CRITICAL** | `general` | showTransactions is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-078](#bug-078)** | 🔴 **CRITICAL** | `general` | setShowTransactions is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-079](#bug-079)** | 🔴 **CRITICAL** | `general` | usePrivacyStore is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-080](#bug-080)** | 🔴 **CRITICAL** | `general` | isMembersSectionExpanded is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-081](#bug-081)** | 🔴 **CRITICAL** | `general` | filteredExpenses is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-082](#bug-082)** | 🔴 **CRITICAL** | `general` | getCatColor is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-083](#bug-083)** | 🔴 **CRITICAL** | `general` | getCatColor is not a function | `auto-crash-handler` | 🟢 Open |
| **[BUG-084](#bug-084)** | 🔴 **CRITICAL** | `general` | analytics is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-085](#bug-085)** | 🔴 **CRITICAL** | `general` | useHistoryBack is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-086](#bug-086)** | 🔴 **CRITICAL** | `general` | showFilterDrawer is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-087](#bug-087)** | 🔴 **CRITICAL** | `general` | usePrivacyStore is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-088](#bug-088)** | 🔴 **CRITICAL** | `general` | isBlindMode is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-089](#bug-089)** | 🔴 **CRITICAL** | `general` | formatMaskedAmount is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-097](#bug-097)** | 🔴 **CRITICAL** | `general` | categoryIsDominant is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-098](#bug-098)** | 🔴 **CRITICAL** | `general` | topTransfer is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-099](#bug-099)** | 🔴 **CRITICAL** | `general` | TripJourneyMap is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-100](#bug-100)** | 🔴 **CRITICAL** | `general` | AnalyticsTab is not defined | `auto-crash-handler` | 🟢 Open |
| **[BUG-101](#bug-101)** | 🔴 **CRITICAL** | `general` | analytics is not defined | `auto-crash-handler` | 🟢 Open |

---

## 📖 Detailed Active Bug Specs

### BUG-069: Importing a module script failed.

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 26/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.


Lazy@unknown:0:0
Suspense@unknown:0:0
div@unknown:0:0
div@unknown:0:0
lfe@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:876:76331
U9@
z9@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:877:30396
Ct@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:4272
zt@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:8885
Rt@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:8023
Tn@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:18282

**Expected**: App runs without throwing.

**Actual**: Importing a module script failed.

**Diagnostic Trace / Stack**:
```text

Lazy@unknown:0:0
Suspense@unknown:0:0
div@unknown:0:0
div@unknown:0:0
lfe@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:876:76331
U9@
z9@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:877:30396
Ct@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:4272
zt@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:8885
Rt@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:8023
Tn@https://trip-tracker.blackmaroon.in/assets/index-C8rMjbVV.js:12:18282
```

---

### BUG-074: Cannot read properties of null (reading 'useState')

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured react crash.

TypeError: Cannot read properties of null (reading 'useState')
    at exports.useState (http://localhost:5173/node_modules/.vite/deps/react.js?v=2858be4a:748:30)
    at AdminPortalLayout (http://localhost:5173/src/components/admin/AdminPortalLayout.tsx:74:34)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:6118:628)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:8307:6)

**Expected**: App runs without throwing.

**Actual**: Cannot read properties of null (reading 'useState')

**Diagnostic Trace / Stack**:
```text
TypeError: Cannot read properties of null (reading 'useState')
    at exports.useState (http://localhost:5173/node_modules/.vite/deps/react.js?v=2858be4a:748:30)
    at AdminPortalLayout (http://localhost:5173/src/components/admin/AdminPortalLayout.tsx:74:34)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:6118:628)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=3a086733:8307:6)
```

---

### BUG-075: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured react crash.

TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx

**Expected**: App runs without throwing.

**Actual**: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx

**Diagnostic Trace / Stack**:
```text
TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx
```

---

### BUG-076: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured react crash.

TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx

**Expected**: App runs without throwing.

**Actual**: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx

**Diagnostic Trace / Stack**:
```text
TypeError: Failed to fetch dynamically imported module: http://localhost:5173/src/components/admin/AdminPortalLayout.tsx
```

---

### BUG-077: showTransactions is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: showTransactions is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787784820310:1127:17)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: showTransactions is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: showTransactions is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787784820310:1127:17)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-078: setShowTransactions is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#/` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: setShowTransactions is not defined
    at http://localhost:5173/src/App.tsx?t=1787784834602:409:3
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12900:13)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6615:153)
    at commitHookPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6650:55)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7616:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7604:5)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7604:5)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7615:6)

**Expected**: App runs without throwing.

**Actual**: setShowTransactions is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: setShowTransactions is not defined
    at http://localhost:5173/src/App.tsx?t=1787784834602:409:3
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12900:13)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6615:153)
    at commitHookPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6650:55)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7616:22)
    at recursivelyTraversePassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7604:5)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7620:6)
    at recursivelyTraversePassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7604:5)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7615:6)
```

---

### BUG-079: usePrivacyStore is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: usePrivacyStore is not defined
    at BalancesSettlements (http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787786281726:1062:22)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: usePrivacyStore is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: usePrivacyStore is not defined
    at BalancesSettlements (http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787786281726:1062:22)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-080: isMembersSectionExpanded is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: isMembersSectionExpanded is not defined
    at BalancesSettlements (http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787786316817:1310:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: isMembersSectionExpanded is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: isMembersSectionExpanded is not defined
    at BalancesSettlements (http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787786316817:1310:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-081: filteredExpenses is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: filteredExpenses is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787786479728:2174:12)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: filteredExpenses is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: filteredExpenses is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787786479728:2174:12)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-082: getCatColor is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: getCatColor is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787786861843:2291:13)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: getCatColor is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: getCatColor is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787786861843:2291:13)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-083: getCatColor is not a function

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

TypeError: getCatColor is not a function
    at http://localhost:5173/src/components/ExpenseList.tsx?t=1787786938322:816:74
    at Array.map (<anonymous>)
    at http://localhost:5173/src/components/ExpenseList.tsx?t=1787786938322:779:44
    at Array.map (<anonymous>)
    at ExpenseList (http://localhost:5173/src/components/ExpenseList.tsx?t=1787786938322:682:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)

**Expected**: App runs without throwing.

**Actual**: getCatColor is not a function

**Diagnostic Trace / Stack**:
```text
TypeError: getCatColor is not a function
    at http://localhost:5173/src/components/ExpenseList.tsx?t=1787786938322:816:74
    at Array.map (<anonymous>)
    at http://localhost:5173/src/components/ExpenseList.tsx?t=1787786938322:779:44
    at Array.map (<anonymous>)
    at ExpenseList (http://localhost:5173/src/components/ExpenseList.tsx?t=1787786938322:682:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
```

---

### BUG-084: analytics is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: analytics is not defined
    at SettingsTab (http://localhost:5173/src/components/SettingsTab.tsx?t=1787788216406:36:3)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: analytics is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: analytics is not defined
    at SettingsTab (http://localhost:5173/src/components/SettingsTab.tsx?t=1787788216406:36:3)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-085: useHistoryBack is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-2` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: useHistoryBack is not defined
    at ExpenseList (http://localhost:5173/src/components/ExpenseList.tsx?t=1787789087408:99:2)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: useHistoryBack is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: useHistoryBack is not defined
    at ExpenseList (http://localhost:5173/src/components/ExpenseList.tsx?t=1787789087408:99:2)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-086: showFilterDrawer is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-2` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: showFilterDrawer is not defined
    at ExpenseList (http://localhost:5173/src/components/ExpenseList.tsx?t=1787789101765:1112:3)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: showFilterDrawer is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: showFilterDrawer is not defined
    at ExpenseList (http://localhost:5173/src/components/ExpenseList.tsx?t=1787789101765:1112:3)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-087: usePrivacyStore is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: usePrivacyStore is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787790279440:99:22)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: usePrivacyStore is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: usePrivacyStore is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787790279440:99:22)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-088: isBlindMode is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: isBlindMode is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787790288410:1457:31)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)

**Expected**: App runs without throwing.

**Actual**: isBlindMode is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: isBlindMode is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787790288410:1457:31)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:7992:27)
```

---

### BUG-089: formatMaskedAmount is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: formatMaskedAmount is not defined
    at http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787790491388:1209:31
    at Array.map (<anonymous>)
    at BalancesSettlements (http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787790491388:1183:67)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)

**Expected**: App runs without throwing.

**Actual**: formatMaskedAmount is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: formatMaskedAmount is not defined
    at http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787790491388:1209:31
    at Array.map (<anonymous>)
    at BalancesSettlements (http://localhost:5173/src/components/BalancesSettlements.tsx?t=1787790491388:1183:67)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=1be057bf:8323:37)
```

---

### BUG-097: categoryIsDominant is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: categoryIsDominant is not defined
    at BoardingPassHeroCard (http://localhost:5173/src/components/BoardingPassHeroCard.tsx?t=1787802890246:36:25)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:7992:27)

**Expected**: App runs without throwing.

**Actual**: categoryIsDominant is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: categoryIsDominant is not defined
    at BoardingPassHeroCard (http://localhost:5173/src/components/BoardingPassHeroCard.tsx?t=1787802890246:36:25)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:7992:27)
```

---

### BUG-098: topTransfer is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: topTransfer is not defined
    at BoardingPassHeroCard (http://localhost:5173/src/components/BoardingPassHeroCard.tsx?t=1787802897033:181:88)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:7992:27)

**Expected**: App runs without throwing.

**Actual**: topTransfer is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: topTransfer is not defined
    at BoardingPassHeroCard (http://localhost:5173/src/components/BoardingPassHeroCard.tsx?t=1787802897033:181:88)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=d5bafc93:7992:27)
```

---

### BUG-099: TripJourneyMap is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-3` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: TripJourneyMap is not defined
    at AnalyticsTab (http://localhost:5173/src/components/AnalyticsTab.tsx?t=1787804859092:391:30)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:7992:27)

**Expected**: App runs without throwing.

**Actual**: TripJourneyMap is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: TripJourneyMap is not defined
    at AnalyticsTab (http://localhost:5173/src/components/AnalyticsTab.tsx?t=1787804859092:391:30)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:7992:27)
```

---

### BUG-100: AnalyticsTab is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: AnalyticsTab is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787804917669:2128:45)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:7992:27)

**Expected**: App runs without throwing.

**Actual**: AnalyticsTab is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: AnalyticsTab is not defined
    at App (http://localhost:5173/src/App.tsx?t=1787804917669:2128:45)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:7992:27)
```

---

### BUG-101: analytics is not defined

- **Severity**: `CRITICAL` | **Category**: `general` | **Status**: `open`
- **Found By**: `auto-crash-handler` on 27/8/2026 (web)
- **Route**: `#nav-1` (Online: `true`)

**Description**:
Automatically captured react crash.

ReferenceError: analytics is not defined
    at SettingsTab (http://localhost:5173/src/components/SettingsTab.tsx?t=1787804952976:36:3)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:7992:27)

**Expected**: App runs without throwing.

**Actual**: analytics is not defined

**Diagnostic Trace / Stack**:
```text
ReferenceError: analytics is not defined
    at SettingsTab (http://localhost:5173/src/components/SettingsTab.tsx?t=1787804952976:36:3)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:12864:12)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:4211:19)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:5567:16)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:6138:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:850:66)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8427:92)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8323:37)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:8307:6)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=f297417f:7992:27)
```

---

## ✅ Resolved Bugs History

| ID | Title | Category | Severity | Found By | Resolved By | Fix Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-012** | Member deletion left orphaned split IDs corrupting settlement balance math | `splits-math` | `high` | `human` | `antigravity` | Added automated exclusion of deleted members in App.tsx and settlement engine, redistributing equal shares automatically. |
| **BUG-009** | iOS build failure due to Capacitor SPM Swift API mismatch on Xcode 16 | `general` | `critical` | `antigravity` | `antigravity` | Pinned capacitor-swift-pm to 8.2.0, committed Package.resolved, and created scripts/align-spm-versions.mjs. |
| **BUG-008** | Android crash on startup due to uninitialized FirebaseApp in FCM plugin | `general` | `critical` | `claude-cli` | `claude-cli` | Added google-services.json template and Gradle google-services plugin configuration. |
| **BUG-013** | Sole Admin account deletion caused orphaned trips with no administrative control | `general` | `high` | `human` | `antigravity` | Implemented sole-admin deletion protection requiring at least one other Google-linked Admin before removing an admin account. |
| **BUG-010** | Native Google OAuth deep link failed on Android auth code exchange | `auth` | `high` | `claude-cli` | `claude-cli` | Broadened AndroidManifest.xml intent filter and updated parseNativeAuthCallback to support both code and token URL formats. |
| **BUG-011** | Mobile Safari 100vh caused bottom navigation and toasts to be obscured | `ui-ux` | `medium` | `antigravity` | `antigravity` | Applied CSS 100dvh units with -webkit-fill-available fallbacks and env(safe-area-inset-bottom) padding. |
| **BUG-001** | Hardware swipe-back gesture blocked by scroll-lock touch-action | `navigation` | `medium` | `claude-cli` | `claude-cli` | Fixed in commit by scoping touch-action to individual swipeable rows instead of whole viewport. |
| **BUG-014** | Expense geotagging wrote place names to database violating coordinates-only rule | `performance` | `medium` | `human` | `claude-cli` | Added coordsOnly() sanitizer in tripApi.ts and ran DB migration 0043 to scrub historical placeName strings. |
| **BUG-006** | Back navigation used same-URL pushState causing history loops | `navigation` | `medium` | `claude-cli` | `claude-cli` | Converted useHistoryBack to push unique hash fragment URLs, creating unambiguous stack entries. |
| **BUG-007** | Multiple modal sheets closed together on a single back press | `navigation` | `medium` | `antigravity` | `antigravity` | Ordered useHistoryBack invocations to enforce LIFO stack popping. |
| **BUG-015** | Browser reload while offline wiped visible trip and expense data | `offline-sync` | `critical` | `human` | `antigravity` | Wrapped useTripStore with zustand persist middleware backed by localStorage with mergeServerExpenses dirty-state reconciliation. |
| **BUG-002** | Offline-captured receipt photos caused localStorage QuotaExceededError | `receipts-camera` | `high` | `antigravity` | `antigravity` | Created dedicated IndexedDB store (offlineReceiptStore.ts) to hold offline photos separately from localStorage state. |
| **BUG-003** | Offline/online toggle briefly signed the user out, flashing login screen | `auth` | `high` | `antigravity` | `antigravity` | Updated authStore.ts onAuthStateChange to ignore transient null sessions unless event is explicitly SIGNED_OUT. |
| **BUG-004** | Member deletion, update, and archiving lacked offline queue support | `offline-sync` | `high` | `claude-cli` | `claude-cli` | Implemented full offline-first mutation handlers in tripStore.ts with queueSync actions (deleteMember, updateMember, toggleArchiveMember). |
| **BUG-005** | Creating a new trip while offline silently failed without offline path | `offline-sync` | `high` | `antigravity` | `antigravity` | Added offline createTrip branch in tripStore.ts generating temp trip IDs and queuing createTrip mutations. |
| **BUG-016** | Superadmin Bug Tracker falsely blocked access when opened from home screen | `ui-ux` | `medium` | `human` | `antigravity` | Removed artificial trip-scoped lock in SuperAdminBugTracker.tsx and App.tsx, opening direct access to developers. |
| **BUG-020** | Report a Problem submit fails for normal users (RLS blocked) | `general` | `high` | `rahul` | `rahul` | Fixed via report_bug() SECURITY DEFINER RPC (migration 0059): id computation and insert now run server-side, bypassing RLS, so normal users no longer need SELECT on bugs. bugApi.ts createBug() now calls supabase.rpc('report_bug', ...). Commit 496306b. |
| **BUG-021** | Report a Problem popup traps scroll, cannot scroll back up to close | `ui-ux` | `medium` | `rahul` | `rahul` | BugReportModal converted from a modal-overlay popup to a full-screen SettingsView subscreen (settings-subscreen-enter layout), same pattern as other Settings subscreens -- no more trapped scroll. Commit 496306b. |
| **BUG-022** | Report a Problem back navigation discards unsent draft without confirmation | `ui-ux` | `medium` | `rahul` | `rahul` | Added a back-guard (onRegisterBackGuard) wired through both the on-screen back link and SettingsView's useHistoryBack hardware/browser-back handling. When there's unsent text, a 3-way ConfirmDialog (new tertiaryLabel/onTertiary support) offers Submit & Go Back, Discard & Go Back, or Keep Editing. Commit 496306b. |
| **BUG-023** | Test from app | `navigation` | `critical` | `mauryarahul007@gmail.com` | `superadmin` | Test |
| **BUG-024** | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('Unknown'): The object is in an invalid sta | `general` | `critical` | `auto-crash-handler` | `claude` | Added .catch(() => {}) to the two unguarded registration.update() calls in serviceWorker.ts (interval timer + visibilitychange listener) that were producing an unhandled promise rejection. |
| **BUG-025** | Enable Live Alerts banner shown on native platforms and never works | `ui-ux` | `medium` | `mauryarahul007@gmail.com` | `claude-cli` | Gated the banner on isWebNotificationSupported() in NotificationsPanel.tsx so it only renders in an actual browser tab. Commit 4433bc1. |
| **BUG-026** | 'Out of sync (0)' status permanently shown on every trip | `offline-sync` | `high` | `mauryarahul007@gmail.com` | `claude-cli` | Dropped the broken lastModifiedAt/lastBackendSyncedAt comparison from syncStatus in App.tsx -- syncQueue.length is the correct, live signal and was already there. Commit f950404. |
| **BUG-027** | Superadmin Ops Deck section tabs unusable on mobile | `ui-ux` | `medium` | `mauryarahul007@gmail.com` | `claude-cli` | Replaced with a header status-line trigger that opens a full-screen section switcher on tap, reusing the existing dot+code+label rail styling. Also fixed a CSS source-order bug where the desktop rail's unconditional display:flex was overriding its own mobile display:none. Commits 55ab403, 178a638. |
| **BUG-028** | Ops Deck header rendered under the Android status bar | `ui-ux` | `medium` | `mauryarahul007@gmail.com` | `claude-cli` | Added the app-wide calc(Npx + var(--safe-top, 0px)) safe-area padding convention to .ops-shell and .ops-panel in ops-deck.css. Commit e433fa8. |
| **BUG-029** | Feature flags (Flags tab) never reached other devices | `general` | `high` | `mauryarahul007@gmail.com` | `claude-cli` | Migration 0064: feature_flag_overrides table (scope: global/trip/user) + get_resolved_feature_flags/get_all_feature_flag_overrides/set_feature_flag_override RPCs. tripStore.ts now persists and loads flags from Supabase instead of local-only zustand persist state. Commit 6fb9e57. |
| **BUG-030** | Superadmin/demo account shows duplicate categories in Tools tab and expense auto-tagging | `general` | `high` | `claude-cli` | `claude-cli` | tripStore.ts loadDemoTrip offline-fallback: result.categories now returns [] (matching insertTripGraph's success-path shape of custom-only categories) instead of DEFAULT_CATEGORIES, so the caller's [...DEFAULT_CATEGORIES, ...result.categories] no longer doubles every default category. Added regression test in tripStore.test.ts (loadDemoTrip suite) that mocks insertTripGraph to reject and asserts categories has no duplicate ids -- fails without the fix (12 ids instead of 6), passes with it. |
| **BUG-031** | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('https://trip-tracker.blackmaroon.in/sw.js' | `general` | `critical` | `auto-crash-handler` | `claude` | Duplicate of BUG-024 -- unguarded registration.update() in serviceWorker.ts threw an unhandled rejection. Fixed by wrapping both call sites (interval timer + visibilitychange listener) in .catch(() => {}). |
| **BUG-032** | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('https://trip-tracker.blackmaroon.in/sw.js' | `general` | `critical` | `auto-crash-handler` | `claude` | Duplicate of BUG-024 -- unguarded registration.update() in serviceWorker.ts threw an unhandled rejection. Fixed by wrapping both call sites (interval timer + visibilitychange listener) in .catch(() => {}). |
| **BUG-033** | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('https://trip-tracker.blackmaroon.in/sw.js' | `general` | `critical` | `auto-crash-handler` | `claude` | Duplicate of BUG-024 -- unguarded registration.update() in serviceWorker.ts threw an unhandled rejection. Fixed by wrapping both call sites (interval timer + visibilitychange listener) in .catch(() => {}). |
| **BUG-034** | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('https://trip-tracker.blackmaroon.in/sw.js' | `general` | `critical` | `auto-crash-handler` | `claude` | Duplicate of BUG-024 -- unguarded registration.update() in serviceWorker.ts threw an unhandled rejection. Fixed by wrapping both call sites (interval timer + visibilitychange listener) in .catch(() => {}). |
| **BUG-035** | Failed to update a ServiceWorker for scope ('https://trip-tracker.blackmaroon.in/') with script ('https://trip-tracker.blackmaroon.in/sw.js' | `general` | `critical` | `auto-crash-handler` | `claude` | Duplicate of BUG-024 -- unguarded registration.update() in serviceWorker.ts threw an unhandled rejection. Fixed by wrapping both call sites (interval timer + visibilitychange listener) in .catch(() => {}). |
| **BUG-036** | Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors a | `general` | `critical` | `auto-crash-handler` | `claude` | React error #185 (Maximum update depth exceeded). Root cause: App.tsx's scroll handler unconditionally called setIsHeaderScrolled(false) on every scroll frame when scrollTop<=15, with no guard checking the flag was actually true -- the sibling branches already had this guard, this one didn't. Combined with the header-height ResizeObserver (padding it drives shifts scroll position, which the listener reads as a scroll event), this could thrash. Fixed the missing guard and made the ResizeObserver write skip no-op height values. |
| **BUG-037** | Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors a | `general` | `critical` | `auto-crash-handler` | `claude` | React error #185 (Maximum update depth exceeded). Root cause: App.tsx's scroll handler unconditionally called setIsHeaderScrolled(false) on every scroll frame when scrollTop<=15, with no guard checking the flag was actually true -- the sibling branches already had this guard, this one didn't. Combined with the header-height ResizeObserver (padding it drives shifts scroll position, which the listener reads as a scroll event), this could thrash. Fixed the missing guard and made the ResizeObserver write skip no-op height values. |
| **BUG-038** | ResizeObserver loop completed with undelivered notifications. | `general` | `critical` | `auto-crash-handler` | `claude` | ResizeObserver loop completed with undelivered notifications -- Chrome fires this as a real error event even though it's universally benign (see WICG/resize-observer#38); every major crash reporter filters it by convention. Added a filter in autoBugReporter.ts so it stops auto-filing, and hardened the one ResizeObserver in the app (App.tsx header-height measurement) to skip redundant writes. |
| **BUG-039** | Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors a | `general` | `critical` | `auto-crash-handler` | `claude` | React error #185 (Maximum update depth exceeded). Root cause: App.tsx's scroll handler unconditionally called setIsHeaderScrolled(false) on every scroll frame when scrollTop<=15, with no guard checking the flag was actually true -- the sibling branches already had this guard, this one didn't. Combined with the header-height ResizeObserver (padding it drives shifts scroll position, which the listener reads as a scroll event), this could thrash. Fixed the missing guard and made the ResizeObserver write skip no-op height values. |
| **BUG-040** | ResizeObserver loop completed with undelivered notifications. | `general` | `critical` | `auto-crash-handler` | `claude` | ResizeObserver loop completed with undelivered notifications -- Chrome fires this as a real error event even though it's universally benign (see WICG/resize-observer#38); every major crash reporter filters it by convention. Added a filter in autoBugReporter.ts so it stops auto-filing, and hardened the one ResizeObserver in the app (App.tsx header-height measurement) to skip redundant writes. |
| **BUG-041** | Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors a | `general` | `critical` | `auto-crash-handler` | `claude` | React error #185 (Maximum update depth exceeded). Root cause: App.tsx's scroll handler unconditionally called setIsHeaderScrolled(false) on every scroll frame when scrollTop<=15, with no guard checking the flag was actually true -- the sibling branches already had this guard, this one didn't. Combined with the header-height ResizeObserver (padding it drives shifts scroll position, which the listener reads as a scroll event), this could thrash. Fixed the missing guard and made the ResizeObserver write skip no-op height values. |
| **BUG-042** | ResizeObserver loop completed with undelivered notifications. | `general` | `critical` | `auto-crash-handler` | `claude` | ResizeObserver loop completed with undelivered notifications -- Chrome fires this as a real error event even though it's universally benign (see WICG/resize-observer#38); every major crash reporter filters it by convention. Added a filter in autoBugReporter.ts so it stops auto-filing, and hardened the one ResizeObserver in the app (App.tsx header-height measurement) to skip redundant writes. |
| **BUG-043** | Minified React error #185; visit https://react.dev/errors/185 for the full message or use the non-minified dev environment for full errors a | `general` | `critical` | `auto-crash-handler` | `claude` | React error #185 (Maximum update depth exceeded). Root cause: App.tsx's scroll handler unconditionally called setIsHeaderScrolled(false) on every scroll frame when scrollTop<=15, with no guard checking the flag was actually true -- the sibling branches already had this guard, this one didn't. Combined with the header-height ResizeObserver (padding it drives shifts scroll position, which the listener reads as a scroll event), this could thrash. Fixed the missing guard and made the ResizeObserver write skip no-op height values. |
| **BUG-044** | onAddExpense is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-045** | onAddExpense is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-046** | Uncaught Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire r | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-047** | groups.filter is not a function | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-048** | groups.filter is not a function | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-049** | Uncaught Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire r | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-050** | Uncaught Error: There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire r | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-051** | groups.filter is not a function | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-052** | overallCrossTripBalance is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-053** | Cannot read properties of undefined (reading 'length') | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-054** | Failed to update a ServiceWorker for scope ('http://localhost:5173/') with script ('http://localhost:5173/sw.js'): An unknown error occurred | `general` | `critical` | `auto-crash-handler` | `claude` | Duplicate of BUG-024 -- unguarded registration.update() in serviceWorker.ts threw an unhandled rejection. Fixed by wrapping both call sites (interval timer + visibilitychange listener) in .catch(() => {}). |
| **BUG-055** | headerRef is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-056** | formattedTime is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-057** | formattedTime is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-058** | stackActive is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-059** | crypto.randomUUID is not a function | `general` | `critical` | `auto-crash-handler` | `claude` | crypto.randomUUID() has no fallback and throws in insecure contexts (LAN-IP dev access, older Android WebViews). Added src/utils/uuid.ts::newId() with a crypto.getRandomValues-based fallback, then Math.random as last resort, and replaced all 14 call sites in tripStore.ts and TripsListScreen.tsx. |
| **BUG-061** | AmbientPhotoBackdrop is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-062** | TripContentSheet is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-063** | Uncaught TypeError: crypto.randomUUID is not a function | `general` | `critical` | `auto-crash-handler` | `claude` | crypto.randomUUID() has no fallback and throws in insecure contexts (LAN-IP dev access, older Android WebViews). Added src/utils/uuid.ts::newId() with a crypto.getRandomValues-based fallback, then Math.random as last resort, and replaced all 14 call sites in tripStore.ts and TripsListScreen.tsx. |
| **BUG-064** | TransactionsPreview is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-066** | IconChevronDown is not defined | `general` | `critical` | `auto-crash-handler` | `claude` | Not reproducible against current HEAD -- verified the exact crash site (symbol/line from the stack trace) no longer exists or is now correctly defined/imported. This was captured from a live dev-server (localhost, Vite HMR ?t= cache-busted URL) mid-edit during earlier development and has since been superseded by subsequent refactors. |
| **BUG-067** | Mobile canvas solid cyan block fill and text overflow in Trip Wrapped | `ui-ux` | `medium` | `user` | `antigravity` | Replaced native roundRect with drawSafeRoundedRect with explicit beginPath/closePath, added drawSafeWrappedText for multi-line bound protection, and added Night/Light theme switcher. |
| **BUG-068** | Home screen card-style deck vertical scroll outside viewport on mobile | `ui-ux` | `medium` | `user` | `antigravity` | Added .stack-viewport-lock with 100dvh lock and flexbox column auto-scaling in index.css (ADR 50). |
| **BUG-070** | Geotag Expenses toggle in Settings also flipped superadmin master flag, hiding the row | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | src/store/tripStore.ts setEnableGeotagging now only sets the trip-level enableGeotagging value, never touches featureFlags. Master flag stays under exclusive control of setFeatureFlag (superadmin). |
| **BUG-071** | No way to add multiple trip members in one go without re-tapping the FAB each time | `ui-ux` | `low` | `claude-cli` | `claude-cli` | src/components/MembersGroupsTab.tsx: added an 'Add another after this one' checkbox to the New Member form (hidden in edit mode). Unchecked (default) keeps existing close-after-add behavior; checked keeps the popup open, clears the fields, and refocuses the name input so the next member can be typed immediately. |
| **BUG-072** | Members tab had duplicate add-member entry point and redundant Edit/Delete buttons after swipe actions shipped | `ui-ux` | `low` | `claude-cli` | `claude-cli` | MembersGroupsTab.tsx: removed the header '+ Add Member' button (FAB is now the sole entry point). Wrapped the per-row Edit/Delete buttons in .member-row-desktop-actions, hidden on touch via the same (hover: hover) and (pointer: fine) CSS pattern as .cmd-k-hint -- kept visible for mouse/trackpad users who have no swipe gesture. |
| **BUG-073** | Production build broken: nullable userId passed to fetchMutedTripIds | `general` | `high` | `claude-cli` | `claude-cli` | tripStore.ts: wrapped the fetchMutedTripIds call in an if (userId) guard, skipping the mute-ids fetch when there's no signed-in user instead of passing a possibly-null value. Commit da7c912. |
| **BUG-090** | Per-member feature-flag overrides showed duplicate names and never actually applied | `general` | `high` | `claude-cli` | `claude-cli` | AdminFlagsPage.tsx: dedup member list by linkedUserId and key the per-member override picker/writes by linkedUserId (matching the server's auth.uid() check) instead of the trip-row member.id. |
| **BUG-091** | Advanced expense filters were hidden behind an undiscoverable gesture with no back navigation | `navigation` | `medium` | `claude-cli` | `claude-cli` | Replaced the pull-reveal gesture with an explicit Filters button opening a visible full-screen drawer (ExpenseFilterDrawer.tsx), wired to useHistoryBack/useEscapeKey so back/Esc closes the drawer and lands back on Expenses. |
| **BUG-092** | Filter drawer header/close button clipped, cropped to the bottom sheet's bounds | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | Lifted the filter drawer's render + open/close state from ExpenseList up to App.tsx, rendering it as a sibling of ExpenseForm/ExpenseReviewModal outside TripContentSheet entirely, matching the pattern those unaffected modals already used. |
| **BUG-093** | Cross-linking from Analytics into the ledger could land on a stale open filter drawer | `navigation` | `medium` | `claude-cli` | `claude-cli` | Filter-drawer open state moved from ExpenseList to App.tsx (same lift as BUG-092); every cross-link handler now explicitly closes it before switching tabs. |
| **BUG-094** | Expense currency picker was discarded at save, silently corrupting cross-currency totals | `splits-math` | `high` | `claude-cli` | `claude-cli` | ExpenseForm.tsx now always converts to base currency at save time (not gated on the button click) and passes the actually-selected currency through; App.tsx's handleSaveExpense uses that instead of hardcoding the trip's base currency. |
| **BUG-095** | Blind Mode's privacy-blur left every amount illegible/smudged-looking | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | Removed Blind Mode entirely per product decision: deleted privacyStore.ts, the header eye-icon toggle, every formatMaskedAmount/.privacy-blur usage across 8 files, replaced with a plain formatAmount() in utils/currency.ts. |
| **BUG-096** | Redundant refresh icon duplicated the 'Synced' pill's tap-to-sync action | `ui-ux` | `low` | `claude-cli` | `claude-cli` | Removed the standalone refresh icon button; merged its refreshActiveTripExpenses() pull into handleSyncClick() so the 'Synced' pill now does both push (processQueue) and pull in one tap. |
| **BUG-102** | Donut chart click routes to wrong category filter | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | src/components/AnalyticsTab.tsx: changed the per-category donut arc circle's fill from transparent to none, so only the visible stroke ring is hit-tested. |
| **BUG-103** | Stat-card labels (Total Spent, Daily Average, Top Category) low contrast | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | src/index.css: darkened --text-muted to #6B6E76 (light) and lightened to #8B8E96 (dark, both the media-query and explicit data-theme blocks), clearing 4.5:1 contrast in both themes. Fixed once at the token level so every consumer (Expenses stat strip, Analytics KPI cards, review modal, member details, etc.) benefits without per-component changes. |
| **BUG-104** | Expense day-groups default to expanded, overloading the Ledger on open | `ui-ux` | `low` | `claude-cli` | `claude-cli` | src/components/ExpenseList.tsx: DEFAULT_EXPANDED_DAYS changed from 2 to 0, so every day-group starts collapsed. |
| **BUG-105** | Missing focus traps, focus-visible rings, skip link, and toast live-regions on several UI surfaces | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | Commit 725d094: useFocusTrap on 5 overlay dialogs (ExpenseFilterDrawer, AdminUsersPage broadcast drawer, SuperAdminBugTracker x3), :focus-visible/:focus-within on .filter-chip/.amount-hero, skip-to-content link + #main-content targets, aria-live on UpdateBanner + storage-error toast, consolidated 32 duplicate cubic-bezier literals onto --ease-decel/--ease-spring tokens. |
| **BUG-106** | Form labels not programmatically associated with inputs; icon-only buttons unnamed; warning/success text and dismiss-button touch targets fail WCAG AA | `ui-ux` | `medium` | `claude-cli` | `claude-cli` | Commit f7503c7: id/htmlFor pairs on 45+ form fields across 15 files, fieldset/legend for button-group labels, aria-label on 3 icon-only dismiss buttons + new .dismiss-glyph-btn (24x24 AA) utility, --color-warning-text/--color-success-text tokens (~4.6-4.8:1) swapped into 5 small-text call sites failing AA contrast in light theme. |
| **BUG-107** | Demo Mode shows red Storage Error toast and console errors on every load (non-UUID demo IDs hit Supabase sync) | `offline-sync` | `low` | `claude-cli` | `claude-cli` | Commit d19e36b: loadDemoTrip() now persists userId/userDisplayName (state.userId || effectiveUserId) so setError()'s isDemo suppression actually fires for the demo-mode cold-start path. Verified via Playwright: console.error+red toast before, console.warn+0 toasts after. |
| **BUG-108** | Expense 'needs review' flag reappears after refresh even after reassigning payer/split away from a deleted member | `splits-math` | `high` | `claude-cli` | `claude-cli` | Commit 1c9e46d + supabase migration 0071 (applied to production via supabase db push, verified live via pg_policy query). updateExpenseRow() now chains .select('id') and throws on 0-rows-affected so a silently-rejected write correctly stays dirty across refresh. RLS WITH CHECK on expenses UPDATE relaxed to match USING (admin-or-creator), dropping the extra 'must remain payer/split-member' requirement that permanently blocked non-admin authors from reassigning their own expense away from themselves. Regression test in src/services/tripApi.test.ts. |
| **BUG-109** | Superadmin could not delete a user with expense history, even though suspend worked | `general` | `medium` | `human` | `claude-cli` | Commit 529558d + supabase migration 0072. expenses.created_by_user_id relaxed to nullable with an ON DELETE SET NULL FK (mirroring members.linked_user_id), and delete_user() no longer raises an exception for accounts with expense history -- deleting the auth.users row now anonymizes (nulls out) authorship on their past expenses instead of being blocked. Expense content is untouched; permission checks comparing created_by_user_id = auth.uid() simply stop matching once null, leaving trip admins as the only ones who can still manage the expense. Also guarded AdminAnalyticsPage's retention-cohort active-user Set against null creator ids. |
| **BUG-110** | Superadmin Users tab: Suspend/Delete errors were visually indistinguishable from success | `general` | `medium` | `human` | `claude-cli` | AdminUsersPage.tsx: showToast(msg, isError) now tracks error state; toast renders IconAlertCircle + red '.ops-toast.error' styling (new class in ops-deck.css using existing --danger tokens) with role="alert" on failure vs IconCheck/role="status" on success. All 4 catch blocks (suspend, bulk suspend, delete, broadcast) now pass isError=true. Verified set_user_banned/delete_user RPCs and is_superadmin() work correctly server-side (no drift between deployed functions and migration files; live-tested set_user_banned in a rolled-back transaction as the actual superadmin). Also discovered and deployed migration 0072 (BUG-109's fix), which was committed to the repo but had never been pushed to production -- schema_migrations tracked 0071 as the latest applied version. |

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
