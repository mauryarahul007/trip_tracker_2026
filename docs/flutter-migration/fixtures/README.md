# Golden Test Fixtures for Flutter Migration

This directory contains deterministic, frozen JSON fixtures exported directly from the TypeScript business logic in `src/utils/`. These test vectors serve as the gold standard for validating Flutter Dart ports in Phase 5 and beyond.

---

## 1. How to Regenerate

Run from repository root:

```bash
node scripts/export-golden-fixtures.mjs
```

### Determinism Rules
To ensure byte-for-byte identical output across machines and CI environments:
1. **Fixed Timezone**: `process.env.TZ = 'UTC'` is enforced.
2. **Fixed Clock**: Static mock timestamp (`MOCK_TIMESTAMP = 1791244800000`, 2026-10-06T00:00:00.000Z) is passed into all temporal calculation functions (`relativeTime`, `burnRate`, `travelerPassport`, `predictiveExpenses`).
3. **Deterministic Formatting**: All JSON files are written with 2-space indentation and sorted object keys where order is non-trivial.
4. **Isolated Execution**: The script does not mutate or import any database state or network clients.

---

## 2. Directory Contents

| Fixture File | Source Module | Coverage & Test Scope |
|---|---|---|
| `settlement.json` | `settlement.ts` | Equal, custom weights, exact amounts, percent splits, multi-payer (`0104`), rounding remainders, greedy simplified vs direct bilateral transfers, settlements applied, archived members, and 1-member edge cases. |
| `default_split_roles.json` | `defaultSplit.ts`, `memberRoles.ts` | Role gating permissions (`owner`, `admin`, `member`, `viewer`), split config cloning, and participant exclusions. |
| `currency.json` | `currency.ts`, `currencyConverter.ts`, `countryCurrencyMap.ts` | Currency formatting, decimals, zero-decimal currencies (JPY), symbols, FX conversions, and country-to-currency lookups. |
| `quick_parser_math.json` | `expenseQuickParser.ts`, `mathExpression.ts` | Natural language voice/text expense parsing (`"Dinner 45.50"`, `"Taxi 25 EUR"`, `"Coffee 4.50 Alice yesterday"`) and arithmetic expression evaluation (`"12*3+4"`, `"100/4-5"`). |
| `collab_merge.json` | `tripCollabMerge.ts` | Field-level concurrent conflict resolution (`checklist`, `notes`, `passes`) and member roster reconciliation. |
| `duplicate_burn_predictive.json` | `duplicateExpenseDetector.ts`, `burnRate.ts`, `predictiveExpenses.ts` | Duplicate transaction detection thresholds, burn rate pacing insights, and time-of-day predictive quick chips. |
| `categories.json` | `categoryHelper.ts`, `categoryKeywords.ts` | Keyword-to-category suggestion mapping and icon parsing/serialization. |
| `imports_exports.json` | `splitwiseImport.ts`, `backupValidation.ts`, `icsExport.ts` | Splitwise CSV format parsing, JSON backup validation/sanitization, and iCalendar (`.ics`) RFC 5545 export generation. |
| `passes_chat_cards.json` | `passParser.ts`, `passBackStub.ts`, `chatExpenseCards.ts` | Passenger name cleaning, airport IATA code resolution, travel pass summary stub creation, and in-chat expense event formatting. |
| `notifications.json` | `notificationText.ts`, `notificationGroups.ts` | Complete catalogue of all 11 notification types with rendered headlines and body copy, plus notification burst grouping. |
| `utilities.json` | Multiple (`tripSort.ts`, `tripSuggest.ts`, `dateRange.ts`, `relativeTime.ts`, `joinDeepLink.ts`, `upiLinks.ts`, `travelerPassport.ts`, `achievementBadges.ts`, `packingSuggestions.ts`, `syncQueueLabel.ts`) | Trip sorting, destination suggestions, date range formatting, canonical join links, UPI payment link generation, passport travel statistics, trip achievement badges, seasonal climate inference, and sync queue descriptions. |
| `database_mappings.json` | `database.ts`, `tripApi.ts` | Raw PostgreSQL snake_case rows paired with expected camelCase app models for `trips`, `expenses`, and `members`. |
