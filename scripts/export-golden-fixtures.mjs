#!/usr/bin/env node
/**
 * scripts/export-golden-fixtures.mjs
 *
 * Deterministically exports golden test fixtures from TypeScript pure functions
 * for consumption by Flutter Dart unit tests.
 *
 * Runs on Node 22+ with zero external dependencies.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// Force fixed UTC timezone and stable clock for determinism
process.env.TZ = 'UTC';
const MOCK_TIMESTAMP = 1791244800000; // 2026-10-06T00:00:00.000Z
const MOCK_DATE = new Date(MOCK_TIMESTAMP);
// Pin the wall clock so every util that calls Date.now() is deterministic.
Date.now = () => MOCK_TIMESTAMP;

// Register resolver for extensionless TypeScript imports in src/
register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(s, c, n){ try { return await n(s, c); } catch(e){ if (s.startsWith(".")) try { return await n(s + ".ts", c); } catch{} throw e; } }
// Modules that read Vite's import.meta.env (e.g. the supabase client) must load in plain Node.
export async function load(url, ctx, next){ const r = await next(url, ctx); if (url.includes('/src/') && r.source) { r.source = Buffer.from(String(r.source).replace(/import\\.meta\\.env/g, '({})')); } return r; }
`),
  pathToFileURL('./')
);

// Import utilities
const settlementMod = await import('../src/utils/settlement.ts');
const defaultSplitMod = await import('../src/utils/defaultSplit.ts');
const memberRolesMod = await import('../src/utils/memberRoles.ts');
const currencyMod = await import('../src/utils/currency.ts');
const currencyConverterMod = await import('../src/utils/currencyConverter.ts');
const currencyFxMod = await import('../src/utils/currencyFx.ts');
const countryCurrencyMapMod = await import('../src/utils/countryCurrencyMap.ts');
const expenseQuickParserMod = await import('../src/utils/expenseQuickParser.ts');
const mathExpressionMod = await import('../src/utils/mathExpression.ts');
const tripCollabMergeMod = await import('../src/utils/tripCollabMerge.ts');
const duplicateDetectorMod = await import('../src/utils/duplicateExpenseDetector.ts');
const burnRateMod = await import('../src/utils/burnRate.ts');
const predictiveExpensesMod = await import('../src/utils/predictiveExpenses.ts');
const categoryKeywordsMod = await import('../src/utils/categoryKeywords.ts');
const categoryHelperMod = await import('../src/utils/categoryHelper.ts');
const splitwiseImportMod = await import('../src/utils/splitwiseImport.ts');
const backupValidationMod = await import('../src/utils/backupValidation.ts');
const csvExportMod = await import('../src/utils/csvExport.ts');
const icsExportMod = await import('../src/utils/icsExport.ts');
const passParserMod = await import('../src/utils/passParser.ts');
const passBackStubMod = await import('../src/utils/passBackStub.ts');
const chatExpenseCardsMod = await import('../src/utils/chatExpenseCards.ts');
const notificationGroupsMod = await import('../src/utils/notificationGroups.ts');
const notificationTextMod = await import('../src/utils/notificationText.ts');
const tripSortMod = await import('../src/utils/tripSort.ts');
const tripSuggestMod = await import('../src/utils/tripSuggest.ts');
const tripDestinationMod = await import('../src/utils/tripDestination.ts');
const groupNamingMod = await import('../src/utils/groupNaming.ts');
const dateRangeMod = await import('../src/utils/dateRange.ts');
const relativeTimeMod = await import('../src/utils/relativeTime.ts');
const joinDeepLinkMod = await import('../src/utils/joinDeepLink.ts');
const upiLinksMod = await import('../src/utils/upiLinks.ts');
const signupAttributionMod = await import('../src/utils/signupAttribution.ts');
const syncQueueLabelMod = await import('../src/utils/syncQueueLabel.ts');
const travelerPassportMod = await import('../src/utils/travelerPassport.ts');
const achievementBadgesMod = await import('../src/utils/achievementBadges.ts');
const packingSuggestionsMod = await import('../src/utils/packingSuggestions.ts');

const OUTPUT_DIR = path.resolve('docs/flutter-migration/fixtures');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function writeFixture(filename, data) {
  const targetPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Generated: ${filename}`);
}

console.log('--- Generating Golden Fixtures ---');

// 1. Settlement & Splits (Equal, Exact, Percent, Custom, Multi-Payer, Archived, Simplified/Direct)
{
  const trip = {
    id: 't1',
    name: 'Alps Tour',
    startDate: '2026-10-01',
    endDate: '2026-10-08',
    baseCurrency: 'EUR',
    ownerId: 'u1',
    memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
    groupIds: ['g1'],
    joinCode: 'ALPS26',
    createdAt: 0,
    updatedAt: 0
  };

  const membersList = [
    { id: 'm1', name: 'Alice', linkedUserId: 'u1' },
    { id: 'm2', name: 'Bob', linkedUserId: 'u2' },
    { id: 'm3', name: 'Charlie', linkedUserId: null },
    { id: 'm4', name: 'Diana', linkedUserId: null },
    { id: 'm5', name: 'Archived Evan', linkedUserId: null, archived: true }
  ];

  const members = Object.fromEntries(membersList.map((m) => [m.id, m]));
  const groups = [{ id: 'g1', tripId: 't1', name: 'Couples (Alice & Bob)', memberIds: ['m1', 'm2'] }];

  const expenses = [
    // 1. Equal split with rounding remainders (100 / 3 = 33.34, 33.33, 33.33)
    {
      id: 'e1',
      tripId: 't1',
      title: 'Chalet Dinner',
      amount: 100,
      currency: 'EUR',
      date: '2026-10-01',
      paidBy: 'm1',
      splitMode: 'equal',
      splitMemberIds: ['m1', 'm2', 'm3'],
      resolvedShares: { m1: 33.34, m2: 33.33, m3: 33.33 },
      createdAt: 1,
      updatedAt: 1,
      isSettlement: false
    },
    // 2. Exact amount split
    {
      id: 'e2',
      tripId: 't1',
      title: 'Ski Gear Rental',
      amount: 120,
      currency: 'EUR',
      date: '2026-10-02',
      paidBy: 'm2',
      splitMode: 'exact',
      splitMemberIds: ['m1', 'm3', 'm4'],
      resolvedShares: { m1: 50, m3: 40, m4: 30 },
      createdAt: 2,
      updatedAt: 2,
      isSettlement: false
    },
    // 3. Percent split
    {
      id: 'e3',
      tripId: 't1',
      title: 'Cable Car Pass',
      amount: 200,
      currency: 'EUR',
      date: '2026-10-03',
      paidBy: 'm3',
      splitMode: 'percent',
      splitMemberIds: ['m1', 'm2', 'm4'],
      resolvedShares: { m1: 100, m2: 50, m4: 50 },
      createdAt: 3,
      updatedAt: 3,
      isSettlement: false
    },
    // 4. Custom weights split
    {
      id: 'e4',
      tripId: 't1',
      title: 'Mountain Guide',
      amount: 150,
      currency: 'EUR',
      date: '2026-10-04',
      paidBy: 'm4',
      splitMode: 'custom',
      splitMemberIds: ['m1', 'm2', 'm3'],
      resolvedShares: { m1: 75, m2: 50, m3: 25 },
      createdAt: 4,
      updatedAt: 4,
      isSettlement: false
    },
    // 5. Multi-payer single expense (0104)
    {
      id: 'e5',
      tripId: 't1',
      title: 'Helicopter Tour',
      amount: 600,
      currency: 'EUR',
      date: '2026-10-05',
      paidBy: 'm1',
      paidByShares: { m1: 400, m2: 200 },
      splitMode: 'equal',
      splitMemberIds: ['m1', 'm2', 'm3', 'm4'],
      resolvedShares: { m1: 150, m2: 150, m3: 150, m4: 150 },
      createdAt: 5,
      updatedAt: 5,
      isSettlement: false
    },
    // 6. Reimbursement / settlement recorded
    {
      id: 'e6',
      tripId: 't1',
      title: 'Settlement: Bob to Alice',
      amount: 50,
      currency: 'EUR',
      date: '2026-10-06',
      paidBy: 'm2',
      isSettlement: true,
      reimbursementToMemberId: 'm1',
      splitMemberIds: ['m1'],
      resolvedShares: { m1: 50 },
      createdAt: 6,
      updatedAt: 6
    }
  ];

  const simplified = settlementMod.calculateSettlements(trip, members, expenses, groups, { simplifyDebts: true });
  const direct = settlementMod.calculateSettlements(trip, members, expenses, groups, { simplifyDebts: false });
  const summary = settlementMod.summarizeSettlement(simplified.balances, simplified.transfers);
  const pairGroups = settlementMod.groupSettlementsByPair(expenses.filter((e) => e.isSettlement));

  // Edge Case: 1-member trip
  const singleMemberTrip = { ...trip, id: 't_single', memberIds: ['m1'] };
  const singleMemberExpense = [
    {
      id: 'e_solo',
      tripId: 't_single',
      title: 'Solo Coffee',
      amount: 5,
      currency: 'EUR',
      date: '2026-10-01',
      paidBy: 'm1',
      resolvedShares: { m1: 5 },
      createdAt: 1,
      updatedAt: 1
    }
  ];
  const singleMemberResult = settlementMod.calculateSettlements(singleMemberTrip, { m1: members.m1 }, singleMemberExpense);

  writeFixture('settlement.json', {
    trip,
    members: membersList,
    expenses,
    results: {
      simplified,
      direct,
      summary,
      pairGroups,
      singleMemberResult
    }
  });
}

// 2. Default Split & Member Roles
{
  const roles = ['owner', 'admin', 'member', 'viewer'].map((role) => ({
    role,
    canAddExpense: memberRolesMod.canAddExpense(role),
    canEditOwnExpense: memberRolesMod.canEditExpense(role, 'm1', 'm1'),
    canEditOthersExpense: memberRolesMod.canEditExpense(role, 'm1', 'm2'),
    canManageTrip: memberRolesMod.canManageTrip(role),
    isViewer: memberRolesMod.isViewerRole(role)
  }));

  const splitConfig = {
    splitMode: 'equal',
    splitData: {},
    excludedMemberIds: ['m5']
  };
  const copied = defaultSplitMod.copyDefaultSplit(splitConfig);

  writeFixture('default_split_roles.json', {
    roles,
    split_copy: { input: splitConfig, output: copied }
  });
}

// 3. Currency, Converter, FX & Country Map
{
  const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'INR', 'KRW', 'VND'];
  const formatting = currencies.map((curr) => ({
    currency: curr,
    decimals: currencyMod.getCurrencyDecimals(curr),
    symbol: currencyMod.getCurrencySymbol(curr),
    formatted_1234_56: currencyMod.formatAmount(1234.56, curr),
    formatted_0: currencyMod.formatAmount(0, curr),
    moneyNumber: currencyMod.formatMoneyNumber(1234.56, curr)
  }));

  const conversions = [
    { from: 'USD', to: 'EUR', amount: 100, result: currencyConverterMod.convertCurrency(100, 'USD', 'EUR') },
    { from: 'EUR', to: 'USD', amount: 85, result: currencyConverterMod.convertCurrency(85, 'EUR', 'USD') },
    { from: 'USD', to: 'JPY', amount: 50, result: currencyConverterMod.convertCurrency(50, 'USD', 'JPY') }
  ];

  const countryCodes = ['US', 'FR', 'JP', 'GB', 'IN', 'KR', 'VN', 'DE', 'AU', 'CH'];
  const countryMap = countryCodes.map((code) => ({
    countryCode: code,
    currency: countryCurrencyMapMod.currencyForCountryCode(code)
  }));

  writeFixture('currency.json', {
    formatting,
    conversions,
    countryMap
  });
}

// 4. Expense Quick Parser & Math Expression
{
  const members = [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' },
    { id: 'm3', name: 'Charlie' }
  ];

  const parserCategories = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍽️' },
    { id: 'cat-travel', name: 'Travel & Transport', icon: '🚕' },
    { id: 'cat-groceries', name: 'Groceries', icon: '🛒' }
  ];

  const parserInputs = [
    'Dinner 45.50',
    'Taxi 25 EUR',
    'Lunch 12 Bob',
    'Coffee 4.50 Alice yesterday',
    'Groceries 150 EUR Charlie 2026-10-02',
    'Beer 3*12',
    'Invalid input without any amount'
  ];

  // Pin "now" (noon UTC, matches DateTime(2026, 10, 6) in fixture_runner_test.dart) so relative
  // dates like "yesterday" don't drift with the wall clock or timezone.
  const RealDate = Date;
  const pinned = RealDate.UTC(2026, 9, 6, 12);
  globalThis.Date = class extends RealDate {
    constructor(...args) { args.length ? super(...args) : super(pinned); }
    static now() { return pinned; }
  };
  const parseCases = parserInputs.map((input) => ({
    input,
    output: expenseQuickParserMod.parseQuickExpense(input, parserCategories, [], members, null, MOCK_DATE)
  }));
  globalThis.Date = RealDate;

  const mathInputs = [
    '12 * 3 + 4',
    '100 / 4 - 5',
    '25 + 15.50',
    '(10 + 20) * 3',
    '12 / 0',
    'invalid * expression',
    ''
  ];

  const mathCases = mathInputs.map((expr) => ({
    expression: expr,
    result: mathExpressionMod.evaluateMathExpression(expr)
  }));

  writeFixture('quick_parser_math.json', {
    parseCases,
    mathCases
  });
}

// 5. Trip Collab Merge
{
  const localTrip = {
    id: 't1',
    name: 'Alps Local',
    checklist: [{ id: 'c1', text: 'Passports', done: false, updatedAt: 1000 }],
    notes: [{ id: 'n1', title: 'Hotel Note', content: 'Local text', updatedAt: 1000 }],
    passes: [{ id: 'p1', title: 'Flight DL10', confirmationCode: 'ABC', updatedAt: 1000 }]
  };

  const remoteTrip = {
    id: 't1',
    name: 'Alps Remote',
    checklist: [
      { id: 'c1', text: 'Passports & Visas', done: true, updatedAt: 2000 },
      { id: 'c2', text: 'Warm Coats', done: false, updatedAt: 1500 }
    ],
    notes: [{ id: 'n1', title: 'Hotel Note', content: 'Updated remote text', updatedAt: 2000 }],
    passes: [{ id: 'p1', title: 'Flight DL10', confirmationCode: 'ABC-SYNCED', updatedAt: 2000 }]
  };

  const mergedTrip = tripCollabMergeMod.applyRemoteTrip(localTrip, remoteTrip);

  // Real mergeTripRoster(trips, members, groups, tripId, roster, keepLocalCollab)
  const baseTrip = (over) => ({
    id: 't1', name: 'Alps', startDate: '2026-10-01', endDate: '2026-10-08', baseCurrency: 'EUR', ownerId: 'u1',
    joinCode: 'ABC123', memberIds: [], groupIds: [], archived: false, frozen: false, closed: false,
    stops: [], checklist: [], notes: [], passes: [], expenseCount: 3, updatedAt: 1000, ...over
  });
  const rosterLocalTrip = baseTrip({
    memberIds: ['m1', 'm2'], groupIds: ['g1'], expenseCount: 7,
    checklist: [{ id: 'c1', text: 'Local item', done: false, updatedAt: 1 }]
  });
  const rosterRemoteTrip = baseTrip({
    name: 'Alps Remote', memberIds: ['m1', 'm3'], groupIds: ['g2'], updatedAt: 2000,
    checklist: [{ id: 'c9', text: 'Remote item', done: true, updatedAt: 2 }]
  });
  const rosterArgs = {
    trips: [rosterLocalTrip, baseTrip({ id: 't2', name: 'Other' })],
    members: { m1: { id: 'm1', name: 'Alice' }, m2: { id: 'm2', name: 'Bob' }, mx: { id: 'mx', name: 'Elsewhere' } },
    groups: { g1: { id: 'g1', name: 'Old group', memberIds: ['m1', 'm2'] } },
    roster: {
      trip: rosterRemoteTrip,
      members: { m1: { id: 'm1', name: 'Alice Cooper' }, m3: { id: 'm3', name: 'Charlie' } },
      groups: { g2: { id: 'g2', name: 'New group', memberIds: ['m1', 'm3'] } }
    }
  };
  const rosterCases = [false, true].map((keep) => ({
    keepLocalCollab: keep,
    result: tripCollabMergeMod.mergeTripRoster(rosterArgs.trips, rosterArgs.members, rosterArgs.groups, 't1', rosterArgs.roster, keep)
  }));
  const rosterMissingTrip = tripCollabMergeMod.mergeTripRoster(rosterArgs.trips, rosterArgs.members, rosterArgs.groups, 'nope', rosterArgs.roster, false);

  // applyLiveCollabRow
  const liveBase = baseTrip({ checklist: [{ id: 'c1', text: 'Old', done: false, updatedAt: 1 }] });
  const liveRows = [
    { name: 'Renamed', updated_at: '2026-10-05T00:00:00.000Z',
      checklist: [{ id: 'c2', text: 'New', done: true, updatedAt: 2 }],
      notes: [{ id: 'n1', title: 'N', content: 'x', updatedAt: 2 }],
      passes: [{ id: 'p1', title: 'P', updatedAt: 2 }],
      fx_config: { customRates: { USD: 1.1 }, markupPercent: 2 } },
    { name: 'Partial only' },
    { updated_at: 'not-a-date', checklist: 'not-a-list', fx_config: [] }
  ];
  const liveCases = [];
  for (const keep of [false, true]) {
    for (const row of liveRows) {
      liveCases.push({ keepLocalCollab: keep, row, result: tripCollabMergeMod.applyLiveCollabRow(liveBase, row, keep) });
    }
  }

  writeFixture('collab_merge.json', {
    tripMerge: { localTrip, remoteTrip, mergedTrip },
    rosterMerge: { args: rosterArgs, cases: rosterCases, missingTrip: rosterMissingTrip },
    liveRow: { baseTrip: liveBase, cases: liveCases }
  });
}

// 6. Duplicate Expense, Burn Rate & Predictive Expenses
{
  const existingExpenses = [
    { id: 'e1', title: 'Dinner at Chalet', amount: 50, currency: 'EUR', date: '2026-10-01', paidBy: 'm1', category: 'cat-food' },
    { id: 'e2', title: 'Taxi to Peak', amount: 25, currency: 'EUR', date: '2026-10-01', paidBy: 'm2', category: 'cat-travel' }
  ];

  const duplicateCheckExact = duplicateDetectorMod.detectDuplicateExpense(
    { title: 'Dinner at Chalet', amount: 50, currency: 'EUR', date: '2026-10-01', paidBy: 'm1' },
    existingExpenses
  );
  const duplicateCheckDifferent = duplicateDetectorMod.detectDuplicateExpense(
    { title: 'Museum Ticket', amount: 15, currency: 'EUR', date: '2026-10-02', paidBy: 'm1' },
    existingExpenses
  );

  const burnRate = burnRateMod.computeBurnRateInsight(
    '2026-10-01',
    '2026-10-08',
    225,
    new Date('2026-10-04T12:00:00Z')
  );

  const categories = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍽️' },
    { id: 'cat-travel', name: 'Travel & Transport', icon: '🚕' }
  ];
  const predictiveChips = predictiveExpensesMod.getPredictiveQuickChips(
    categories,
    [...existingExpenses, { id: 'e3', title: 'Dinner at Chalet', amount: 45, date: '2026-10-02', category: 'cat-food' }],
    new Date('2026-10-04T13:00:00Z')
  );

  // Matrix covering every detector branch (cases A-D, tolerance, bad input, self-exclusion).
  const mxExisting = [
    { id: 'x1', title: 'Dinner at Chalet', amount: 100, currency: 'EUR', date: '2026-10-01', paidBy: 'm1', category: 'cat-food' },
    { id: 'x2', title: 'Museum tickets', amount: 60, currency: 'EUR', date: '2026-10-02', paidBy: 'm2', category: 'cat-fun' },
    { id: 'x3', title: 'Train', amount: 40, currency: 'EUR', date: '2026-10-03', paidBy: 'm1', category: 'cat-travel' },
    { id: 'x4', title: 'Deleted thing', amount: 77, currency: 'EUR', date: '2026-10-01', paidBy: 'm1', category: 'cat-food', deletedAt: 5 },
    { id: 'x5', title: 'Settlement: A to B', amount: 88, currency: 'EUR', date: '2026-10-01', paidBy: 'm1', category: 'cat-food', isSettlement: true },
    { id: 'x6', title: 'Bad date', amount: 33, currency: 'EUR', date: 'garbage', paidBy: 'm1', category: 'cat-food' }
  ];
  const mxCategories = [{ id: 'cat-food', name: 'Food & Dining' }, { id: 'cat-fun', name: 'Fun' }];
  const mxMembers = [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob' }];
  const mxCandidates = [
    { amount: 100, title: 'dinner at chalet!', date: '2026-10-01' },
    { amount: 101.5, title: 'Pizza', date: '2026-10-01', categoryId: 'cat-food', paidById: 'm1' },
    { amount: 100, title: 'Lunch', date: '2026-10-01', categoryId: 'cat-food', paidById: 'm1' },
    { amount: 100, title: 'Other', date: '2026-10-01', categoryId: 'cat-food', paidById: 'm2' },
    { amount: 100, title: 'Dinner at Chalet', date: '2026-10-02' },
    { amount: 60, title: 'Museum', date: '2026-10-05' },
    { amount: 60, title: 'Museum tickets', date: '2026-10-02', paidById: 'm9' },
    { amount: 40, title: 'Train', date: '2026-10-03', id: 'x3' },
    { amount: 77, title: 'Deleted thing', date: '2026-10-01' },
    { amount: 88, title: 'Settlement: A to B', date: '2026-10-01' },
    { amount: 33, title: 'Bad date', date: '2026-10-01' },
    { amount: 0, title: 'Zero', date: '2026-10-01' },
    { amount: 10, title: 'No date', date: '' },
    { amount: 10, title: 'Bad candidate date', date: 'nope' },
    { amount: 5000, title: 'Nothing like it', date: '2026-10-01' }
  ];
  const detectorMatrix = {
    existing: mxExisting, categories: mxCategories, members: mxMembers,
    cases: mxCandidates.map((candidate) => ({
      candidate,
      result: duplicateDetectorMod.detectDuplicateExpense(candidate, mxExisting, mxCategories, mxMembers)
    }))
  };

  writeFixture('duplicate_burn_predictive.json', {
    detectorMatrix,
    duplicateExact: duplicateCheckExact,
    duplicateDifferent: duplicateCheckDifferent,
    burnRate,
    predictiveChips
  });
}

// 7. Categories & Keywords
{
  const categories = [
    { id: 'cat-food', name: 'Food & Dining', icon: '🍽️' },
    { id: 'cat-travel', name: 'Travel & Transport', icon: '🚕' },
    { id: 'cat-stay', name: 'Stay & Hotel', icon: '🏨' },
    { id: 'cat-entertainment', name: 'Entertainment', icon: '🎟️' },
    { id: 'cat-health', name: 'Health & Pharmacy', icon: '💊' }
  ];

  const keywords = ['Starbucks', 'Uber', 'Hilton', 'Museum', 'Dinner', 'Metro', 'Pharmacy'];
  const suggestions = keywords.map((kw) => ({
    keyword: kw,
    suggestedCategory: categoryHelperMod.autoSuggestCategory(kw, categories)
  }));

  const iconParses = ['🍴', 'lucide:coffee', '🏷️', ''].map((raw) => ({
    input: raw,
    parsed: categoryHelperMod.parseCategoryIcon(raw),
    serialized: categoryHelperMod.serializeCategoryIcon(categoryHelperMod.parseCategoryIcon(raw))
  }));

  writeFixture('categories.json', {
    suggestions,
    iconParses
  });
}

// 8. Imports & Exports (Splitwise, Backup, ICS)
{
  const sampleSplitwiseCsv = `Date,Description,Category,Cost,Currency,Alice,Bob
2026-10-01,Groceries,Food,100.00,USD,50.00,50.00
2026-10-02,Dinner,Food,80.00,USD,40.00,40.00`;

  const parsedSplitwise = splitwiseImportMod.parseSplitwiseCsv(sampleSplitwiseCsv);

  const sampleBackup = {
    version: 1,
    appVersion: '3.43.11',
    exportedAt: '2026-10-06T00:00:00.000Z',
    trips: [
      {
        id: 't1',
        name: 'Swiss Alps',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        baseCurrency: 'USD',
        ownerId: 'u1',
        members: [{ id: 'm1', name: 'Alice' }],
        expenses: [{ id: 'e1', title: 'Lunch', amount: 20, paidBy: 'm1', date: '2026-10-01' }]
      }
    ]
  };
  const validatedBackup = backupValidationMod.validateAndSanitizeBackup(sampleBackup);

  const tripObj = {
    id: 't1',
    name: 'Swiss Alps Hiking',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    destination: 'Interlaken',
    stops: [{ name: 'Lauterbrunnen', arrivalDate: '2026-10-02' }]
  };
  const ics = icsExportMod.generateTripIcs(tripObj);

  writeFixture('imports_exports.json', {
    parsedSplitwise,
    validatedBackup,
    ics
  });
}

// 9. Passes & Chat Expense Cards
{
  const samplePass = {
    provider: 'Delta Airlines',
    type: 'flight',
    title: 'DL 1234 JFK -> LHR',
    passengerName: 'JOHN DOE MR',
    bookingReference: 'XYZ123',
    origin: 'JFK',
    destination: 'LHR',
    departureDate: '2026-10-15',
    departureTime: '18:30'
  };

  const cleanedPassenger = passParserMod.cleanPassengerName('DOE/JOHN MR');
  const resolvedAirport = passParserMod.resolveAirportCode('New York');
  const passStub = passBackStubMod.buildPassStub(
    { myNet: 60, paid: 120, share: 60, group: null },
    (amt) => `$${amt.toFixed(2)}`
  );

  const cardPresentation = chatExpenseCardsMod.getChatExpenseCardPresentation(
    'settlement_recorded',
    true,
    'Alice'
  );
  const eventBody = chatExpenseCardsMod.expenseEventBody('expense_added', {
    title: 'Ski Pass',
    amount: 150,
    currency: 'EUR'
  });

  // Matrices exercising every branch of the ported helpers.
  const airportInputs = ['', 'JFK', ' jfk ', 'New York', 'new york!', 'Londo', 'delhi', 'Atlantis', 'xyz'];
  const passengerInputs = ['DOE/JOHN MR', 'MR RAHUL MAURYA', 'Mrs. Jane Smith', 'dr  Who', 'JANE (Adult)', 'alice  b', '', '123'];
  const stubFmt = (amt) => `$${amt.toFixed(2)}`;
  const stubInputs = [
    { myNet: 60, paid: 120, share: 60, group: null },
    { myNet: -45.5, paid: 10, share: 55.5, group: null },
    { myNet: 0, paid: 0, share: 0, group: null },
    { myNet: 0.004, paid: 5, share: 5, group: null },
    { myNet: 100, paid: 200, share: 100, group: { name: 'Couple', balance: 30, otherMemberNames: ['Bob'] } },
    { myNet: -40, paid: 0, share: 40, group: { name: 'Squad', balance: -15, otherMemberNames: ['A', 'B'] } }
  ];
  const kinds = ['expense_added', 'settlement_recorded', 'expense_disputed', 'expense_dispute_resolved',
    'expense_link', 'expense_deleted', 'expense_restored', 'settlement_confirmed', 'text'];
  const matrices = {
    airports: airportInputs.map((input) => ({ input, result: passParserMod.resolveAirportCode(input) })),
    passengers: passengerInputs.map((input) => ({ input, result: passParserMod.cleanPassengerName(input) })),
    stubs: stubInputs.map((input) => ({ input, result: passBackStubMod.buildPassStub(input, stubFmt) })),
    cards: kinds.flatMap((kind) => [true, false].map((isMine) => ({
      kind, isMine, result: chatExpenseCardsMod.getChatExpenseCardPresentation(kind, isMine, 'Alice')
    }))),
    bodies: kinds.filter((k) => k !== 'expense_link' && k !== 'text').flatMap((kind) => [
      { kind, expense: { title: 'Ski Pass', amount: 150, currency: 'EUR' } },
      { kind, expense: { title: 'Ski Pass', amount: 150, currency: 'EUR', note: 'too much' } }
    ].map((c) => ({ ...c, result: chatExpenseCardsMod.expenseEventBody(kind, c.expense) })))
  };

  writeFixture('passes_chat_cards.json', {
    matrices,
    cleanedPassenger,
    resolvedAirport,
    passStub,
    cardPresentation,
    eventBody
  });
}

// 10. Notifications Catalogue (All 11 Types)
{
  const notificationTypes = [
    { type: 'expense_added', params: { expenseTitle: 'Dinner', currency: 'USD', amount: '85.00' } },
    { type: 'expense_updated', params: { expenseTitle: 'Dinner' } },
    { type: 'expense_deleted', params: { expenseTitle: 'Lunch' } },
    { type: 'expense_restored', params: { expenseTitle: 'Lunch' } },
    { type: 'member_added', params: {} },
    { type: 'member_added_notice', params: { memberName: 'Charlie' } },
    { type: 'member_joined', params: { memberName: 'Diana' } },
    { type: 'settlement_reminder', params: { toLabel: 'Alice', currency: 'USD', amount: '45.00' } },
    { type: 'settlement_confirmation_requested', params: { currency: 'USD', amount: '50.00' } },
    { type: 'trip_deleted', params: {} },
    { type: 'chat_message', params: { senderName: 'Alice', preview: 'Hey everyone, check this out!' } }
  ];

  const renderedCatalogue = notificationTypes.map(({ type, params }) => ({
    type,
    params,
    headline: notificationTextMod.getNotificationHeadline(type),
    body: notificationTextMod.renderNotificationBody({ id: 'n', tripId: 't1', title: 'Alps Roadtrip', body: null, data: { type, ...params }, read: false, createdAt: '2026-10-06T00:00:00Z' })
  }));

  const burstList = [
    { id: 'n1', userId: 'u1', tripId: 't1', title: 'Trip Tracker', data: notificationTypes[0], createdAt: '2026-10-06T00:00:00Z', read: false },
    { id: 'n2', userId: 'u1', tripId: 't1', title: 'Trip Tracker', data: notificationTypes[1], createdAt: '2026-10-06T00:01:00Z', read: false }
  ];
  const burstGroups = notificationGroupsMod.groupNotificationBursts(burstList);

  writeFixture('notifications.json', {
    renderedCatalogue,
    burstGroups
  });
}

// 11. Core Trip Utilities
{
  const trips = [
    { id: 't1', name: 'Zanzibar Retreat', startDate: '2026-11-01', createdAt: 1000 },
    { id: 't2', name: 'Amsterdam City Trip', startDate: '2026-09-01', createdAt: 2000 },
    { id: 't3', name: 'Berlin Weekend', startDate: '2026-10-15', createdAt: 1500 }
  ];

  const sortedByName = tripSortMod.sortTrips(trips, 'alphabetical');
  const sortedByDate = tripSortMod.sortTrips(trips, 'date');

  const suggestedName = tripSuggestMod.suggestTripName('Tokyo', '2026-10-01', '2026-10-10');
  const guessedCurr = tripSuggestMod.guessTripCurrency('Japan');
  const extractedCity = tripDestinationMod.extractPrimaryCity('Paris, France');

  const dateRange = dateRangeMod.formatDateRange('2026-10-01', '2026-10-08');
  const tripDay = dateRangeMod.tripDayNumber('2026-10-01', '2026-10-03');
  const relativeTime = relativeTimeMod.formatRelativeTime(new Date(MOCK_TIMESTAMP - 3600000).toISOString());

  const canonicalJoin = joinDeepLinkMod.buildCanonicalJoinLink('ABC123');
  const parsedJoin = joinDeepLinkMod.parseJoinDeepLink('com.triptracker.app://join/ABC123');

  const upiUri = upiLinksMod.generateUpiUri({
    payeeUpiId: 'traveler@okhdfcbank',
    payeeName: 'Alice',
    amount: 1500,
    note: 'Trip Settlement'
  });
  const upiValid = upiLinksMod.isValidUpiId('traveler@okhdfcbank');

  const autoGroup = groupNamingMod.buildAutoGroupName(['Alice', 'Bob']);

  const travelerPassport = travelerPassportMod.computeTravelerPassport(
    [
      { id: 't1', name: 'France', destination: 'Paris', startDate: '2026-09-01', endDate: '2026-09-05', closed: true },
      { id: 't2', name: 'Italy', destination: 'Rome', startDate: '2026-10-01', endDate: '2026-10-06', closed: false }
    ],
    MOCK_TIMESTAMP
  );

  const achievements = achievementBadgesMod.calculateTripAchievements(
    trips[0],
    [
      { id: 'e1', title: 'Morning Coffee', amount: 5, category: 'cat-food', date: '2026-10-01' },
      { id: 'e2', title: 'Afternoon Tea', amount: 4, category: 'cat-food', date: '2026-10-01' },
      { id: 'e3', title: 'Cafe Breakfast', amount: 15, category: 'cat-food', date: '2026-10-02' }
    ],
    [{ id: 'm1', name: 'Alice' }],
    [{ id: 'cat-food', name: 'Food & Dining', icon: '☕' }],
    true
  );

  const packingSeasonal = packingSuggestionsMod.inferSeasonalClimate('Switzerland', '2026-10-01');
  const packingSuggestions = packingSuggestionsMod.generateSmartPackingSuggestions({
    destination: 'Switzerland',
    startDate: '2026-10-01',
    endDate: '2026-10-07',
    durationDays: 7
  });

  const syncQueueLabel = syncQueueLabelMod.describeSyncItem({
    id: 'sq-1',
    type: 'addExpense',
    payload: { title: 'Dinner', amount: 45 }
  });

  // Matrices for every branch of the ported utilities.
  const sortTrips = [
    { id: 'a', name: 'alpha', startDate: '2026-01-01', createdAt: 1 },
    { id: 'b', name: 'Beta', startDate: '2026-01-01', createdAt: 5 },
    { id: 'c', name: 'gamma10', startDate: '2026-03-01', createdAt: 2 },
    { id: 'd', name: 'gamma2', startDate: '', createdAt: 9 },
    { id: 'e', name: 'Émile', startDate: '2025-12-01', updatedAt: 7, createdAt: 3 }
  ];
  const utilMatrix = {
    sortTrips: ['name', 'date'].map((mode) => ({
      mode, result: tripSortMod.sortTrips(sortTrips, mode).map((t) => t.id)
    })),
    sortTripsInput: sortTrips,
    cities: [['Paris, France'], ['Tokyo'], [''], ['Goa', [{ name: 'Panjim' }, { name: 'Margao' }]], [undefined, [{ name: 'Rome' }]], [undefined]]
      .map(([destination, stops]) => ({ destination: destination ?? null, stops: stops ?? null, result: tripDestinationMod.extractPrimaryCity(destination, stops) })),
    dateRanges: [['2026-10-01', '2026-10-08'], ['2026-10-28', '2026-11-03'], ['2026-12-28', '2027-01-03'], ['2026-10-05', '2026-10-05'], ['bad', 'worse']]
      .map(([a, b]) => ({ a, b, result: dateRangeMod.formatDateRange(a, b) })),
    tripDays: [['2026-10-01', '2026-10-03'], ['2026-10-05', '2026-10-01'], ['x', '2026-10-01']]
      .map(([a, b]) => ({ a, b, result: dateRangeMod.tripDayNumber(a, b) })),
    relative: [0, 30000, 90000, 7200000, 86400000 * 3, 86400000 * 45, 86400000 * 400, -5000].map((ago) => ({
      ago, result: relativeTimeMod.formatRelativeTime(new Date(MOCK_TIMESTAMP - ago).toISOString())
    })).concat([{ ago: 'invalid', result: relativeTimeMod.formatRelativeTime('not-a-date') }]),
    joinLinks: ['com.triptracker.app://join/ABC123', 'https://trip-tracker.blackmaroon.in/join/xyz789', 'https://trip-tracker.blackmaroon.in/join/xyz789?x=1',
      'https://evil.example/join/ABC123', 'com.triptracker.app://other/ABC', 'garbage', '']
      .map((url) => ({ url, result: joinDeepLinkMod.parseJoinDeepLink(url) })),
    upiIds: ['a@b', 'traveler@okhdfcbank', 'bad', '@x', 'x@', ''].map((id) => ({ id, result: upiLinksMod.isValidUpiId(id) })),
    upiUris: ['gpay', 'phonepe', 'paytm', 'cred', 'upi', undefined].map((scheme) => ({
      scheme: scheme ?? null,
      result: upiLinksMod.generateUpiUri({ payeeUpiId: 'a@okaxis', payeeName: 'Al Ice', amount: 12.5, note: 'Trip & fun' }, scheme)
    })),
    groupNames: [[], ['Alice'], ['Alice Smith', 'Bob'], ['A', 'B', 'C'], ['  Zed  ', 'Y', 'X', 'W']]
      .map((names) => ({ names, result: groupNamingMod.buildAutoGroupName(names) })),
    climates: [['Iceland', '2026-01-15'], ['Switzerland', '2026-10-01'], ['India', '2026-05-10'], ['Australia', '2026-12-20'], ['Goa', '2026-07-01'], ['Nowhere', undefined]]
      .map(([destination, startDate]) => ({ destination, startDate: startDate ?? null, result: packingSuggestionsMod.inferSeasonalClimate(destination, startDate) })),
    syncLabels: [
      { id: '1', type: 'addExpense', payload: { title: 'Dinner', amount: 45 } },
      { id: '2', type: 'updateExpense', payload: { expenseData: { title: 'Lunch' } } },
      { id: '3', type: 'deleteExpense', payload: { id: 'e1' } },
      { id: '4', type: 'createTrip', payload: { name: 'Goa' } },
      { id: '5', type: 'addMember', payload: { name: 'Bob' } },
      { id: '6', type: 'deleteMember', payload: { id: 'm1' } },
      { id: '7', type: 'createGroup', payload: { name: 'Squad' } },
      { id: '8', type: 'addCategory', payload: { name: 'Fuel' } },
      { id: '9', type: 'weird', payload: {} }
    ].map((item) => ({ item, result: syncQueueLabelMod.describeSyncItem(item) }))
  };

  writeFixture('utilities.json', {
    matrix: utilMatrix,
    sort: { sortedByName, sortedByDate },
    suggestions: { suggestedName, guessedCurr, extractedCity },
    dates: { dateRange, tripDay, relativeTime },
    deepLink: { canonicalJoin, parsedJoin },
    upi: { upiUri, upiValid },
    autoGroup,
    travelerPassport,
    achievements,
    packing: { packingSeasonal, packingSuggestions: packingSuggestions.slice(0, 5) },
    syncQueueLabel
  });
}

// 12. Database Row <-> App Object Mappings
{
  const dbTripRow = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Iceland Expedition',
    start_date: '2026-10-01',
    end_date: '2026-10-08',
    base_currency: 'USD',
    owner_id: 'd9b2d63d-a233-4f24-9b22-e42a9a7a9741',
    join_code: 'ICE123',
    archived: false,
    frozen: false,
    closed: false,
    destination: 'Reykjavik',
    stops: [],
    checklist: [],
    notes: [],
    passes: [],
    fx_config: null,
    member_roles: {},
    split_exclusion_defaults: {},
    category_order: null,
    share_token: null,
    share_enabled: false,
    share_expires_at: null,
    share_view_count: 0,
    closeout_pulse: null,
    closeout_pulse_at: null,
    splitwise_imported_at: null,
    splitwise_import_count: null,
    approval_threshold: null,
    created_at: '2026-10-01T00:00:00.000Z'
  };

  const appTripObject = {
    id: dbTripRow.id,
    name: dbTripRow.name,
    startDate: dbTripRow.start_date,
    endDate: dbTripRow.end_date,
    baseCurrency: dbTripRow.base_currency,
    ownerId: dbTripRow.owner_id,
    joinCode: dbTripRow.join_code,
    archived: dbTripRow.archived,
    frozen: dbTripRow.frozen,
    closed: dbTripRow.closed,
    destination: dbTripRow.destination,
    stops: dbTripRow.stops,
    checklist: dbTripRow.checklist,
    notes: dbTripRow.notes,
    passes: dbTripRow.passes,
    fxConfig: dbTripRow.fx_config,
    memberRoles: dbTripRow.member_roles,
    splitExclusionDefaults: dbTripRow.split_exclusion_defaults,
    categoryOrder: dbTripRow.category_order,
    shareToken: dbTripRow.share_token,
    shareEnabled: dbTripRow.share_enabled,
    shareExpiresAt: dbTripRow.share_expires_at,
    shareViewCount: dbTripRow.share_view_count,
    closeoutPulse: dbTripRow.closeout_pulse,
    closeoutPulseAt: dbTripRow.closeout_pulse_at,
    splitwiseImportedAt: dbTripRow.splitwise_imported_at,
    splitwiseImportCount: dbTripRow.splitwise_import_count,
    approvalThreshold: dbTripRow.approval_threshold,
    createdAt: dbTripRow.created_at
  };

  // Real `expenses` columns (src/types/database.ts, mapExpense in tripApi.ts).
  const dbExpenseRow = {
    id: 'e29b41d4-550e-4400-a716-446655440001',
    trip_id: dbTripRow.id,
    title: 'Blue Lagoon Spa',
    amount: 180.5,
    currency: 'EUR',
    category: 'Entertainment',
    date: '2026-10-02',
    paid_by: '550e8400-e29b-41d4-a716-446655440002',
    paid_by_shares: null,
    split_mode: 'equal',
    split_member_ids: ['550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'],
    split_config: null,
    itemized_config: null,
    resolved_shares: {
      '550e8400-e29b-41d4-a716-446655440002': 90.25,
      '550e8400-e29b-41d4-a716-446655440003': 90.25
    },
    receipt_path: 'receipts/t1/e1.jpg',
    photo_paths: null,
    disputed_at: null,
    disputed_by_user_id: null,
    dispute_note: null,
    settlement_confirmed_at: null,
    settlement_confirmed_by_user_id: null,
    approval_status: 'confirmed',
    approved_by_user_id: null,
    is_settlement: false,
    created_by_user_id: 'd9b2d63d-a233-4f24-9b22-e42a9a7a9741',
    location: { lat: 63.88, lng: -22.45 },
    deleted_at: '2026-10-03T08:00:00.000Z',
    deleted_by_user_id: 'd9b2d63d-a233-4f24-9b22-e42a9a7a9741',
    created_at: '2026-10-02T12:00:00.000Z',
    updated_at: '2026-10-02T12:30:00.000Z'
  };

  // Mirrors mapExpense() in src/services/tripApi.ts
  const appExpenseObject = {
    id: dbExpenseRow.id,
    tripId: dbExpenseRow.trip_id,
    title: dbExpenseRow.title,
    amount: dbExpenseRow.amount,
    currency: dbExpenseRow.currency,
    category: dbExpenseRow.category,
    date: dbExpenseRow.date,
    paidBy: dbExpenseRow.paid_by,
    splitMode: dbExpenseRow.split_mode,
    splitMemberIds: dbExpenseRow.split_member_ids,
    resolvedShares: dbExpenseRow.resolved_shares,
    receiptPath: dbExpenseRow.receipt_path,
    isSettlement: dbExpenseRow.is_settlement,
    approvalStatus: dbExpenseRow.approval_status,
    createdByUserId: dbExpenseRow.created_by_user_id,
    location: dbExpenseRow.location,
    deletedAt: new Date(dbExpenseRow.deleted_at).getTime(),
    deletedByUserId: dbExpenseRow.deleted_by_user_id,
    createdAt: new Date(dbExpenseRow.created_at).getTime(),
    updatedAt: new Date(dbExpenseRow.updated_at).getTime()
  };

  // Real `trip_messages` columns; payload/kind passthrough.
  const dbMessageRow = {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    trip_id: dbTripRow.id,
    member_id: '550e8400-e29b-41d4-a716-446655440002',
    body: 'Dinner at 8?',
    kind: 'text',
    payload: null,
    created_at: '2026-10-02T12:00:00.000Z',
    edited_at: null,
    deleted_at: null,
    reply_to_id: null,
    reactions: { '👍': ['550e8400-e29b-41d4-a716-446655440003'] },
    is_pinned: true
  };
  const appMessageObject = {
    id: dbMessageRow.id,
    tripId: dbMessageRow.trip_id,
    memberId: dbMessageRow.member_id,
    body: dbMessageRow.body,
    eventKind: 'text',
    createdAt: new Date(dbMessageRow.created_at).getTime(),
    reactions: dbMessageRow.reactions,
    isPinned: true
  };

  const dbMemberRow = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    trip_id: dbTripRow.id,
    name: 'Alice',
    linked_user_id: 'd9b2d63d-a233-4f24-9b22-e42a9a7a9741',
    archived: false,
    join_date: '2026-10-01',
    leave_date: null,
    created_at: '2026-10-01T00:00:00.000Z'
  };

  const appMemberObject = {
    id: dbMemberRow.id,
    tripId: dbMemberRow.trip_id,
    name: dbMemberRow.name,
    linkedUserId: dbMemberRow.linked_user_id,
    archived: dbMemberRow.archived,
    joinDate: dbMemberRow.join_date,
    leaveDate: dbMemberRow.leave_date,
    createdAt: dbMemberRow.created_at
  };

  writeFixture('database_mappings.json', {
    trips: { dbRow: dbTripRow, appObject: appTripObject },
    expenses: { dbRow: dbExpenseRow, appObject: appExpenseObject },
    messages: { dbRow: dbMessageRow, appObject: appMessageObject },
    members: { dbRow: dbMemberRow, appObject: appMemberObject }
  });
}

// 12c. Split resolver (`resolveShares` lives in the zustand store module, which reads
// import.meta.env and window at import time; stub both just for this import).
{
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const storeMod = await import('../src/store/tripStore.ts');
  delete globalThis.window;
  delete globalThis.localStorage;
  const resolveShares = storeMod.resolveShares;
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const cases = [];
  const add = (label, expense, participants) =>
    cases.push({ label, expense, participants, result: resolveShares(expense, participants) });

  // Equal: remainders, payer inside/outside, zero-decimal currencies.
  for (const currency of ['USD', 'JPY', 'KWD', 'INR']) {
    for (const amount of [100, 100.01, 0.01, 1, 10, 999.99, 1234.57, 5000]) {
      for (const n of [1, 2, 3, 7]) {
        add(`equal ${currency} ${amount} /${n} payer-in`, { amount, splitMode: 'equal', paidBy: ids[Math.min(1, n - 1)], currency }, ids.slice(0, n));
      }
    }
    add(`equal ${currency} payer-out`, { amount: 100, splitMode: 'equal', paidBy: 'zz', currency }, ids.slice(0, 7));
  }
  // Custom weights (0 weight behaves like missing = 1, a JS `||` quirk), missing keys.
  add('custom 1:2:3', { amount: 100, splitMode: 'custom', splitConfig: { a: 1, b: 2, c: 3 }, paidBy: 'a', currency: 'USD' }, ['a', 'b', 'c']);
  add('custom zero weight', { amount: 100, splitMode: 'custom', splitConfig: { a: 0, b: 2 }, paidBy: 'b', currency: 'USD' }, ['a', 'b']);
  add('custom missing config', { amount: 99.99, splitMode: 'custom', paidBy: 'a', currency: 'USD' }, ['a', 'b', 'c']);
  add('custom JPY', { amount: 1001, splitMode: 'custom', splitConfig: { a: 1, b: 1, c: 1 }, paidBy: 'c', currency: 'JPY' }, ['a', 'b', 'c']);
  add('custom 7 way', { amount: 100, splitMode: 'custom', splitConfig: { a: 3, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1 }, paidBy: 'g', currency: 'USD' }, ids);
  // Exact: sums that match, undershoot, overshoot (rounding diff lands on payer / first).
  add('exact matches', { amount: 100, splitMode: 'exact', splitConfig: { a: 60, b: 40 }, paidBy: 'a', currency: 'USD' }, ['a', 'b']);
  add('exact short', { amount: 100, splitMode: 'exact', splitConfig: { a: 60, b: 30 }, paidBy: 'b', currency: 'USD' }, ['a', 'b']);
  add('exact over', { amount: 100, splitMode: 'exact', splitConfig: { a: 70, b: 50 }, paidBy: 'zz', currency: 'USD' }, ['a', 'b']);
  add('exact decimals', { amount: 33.33, splitMode: 'exact', splitConfig: { a: 11.11, b: 11.11, c: 11.11 }, paidBy: 'a', currency: 'USD' }, ['a', 'b', 'c']);
  add('exact JPY', { amount: 1000, splitMode: 'exact', splitConfig: { a: 333.4, b: 333.3 }, paidBy: 'a', currency: 'JPY' }, ['a', 'b']);
  // Percentage.
  add('percent 50/50', { amount: 100, splitMode: 'percentage', splitConfig: { a: 50, b: 50 }, paidBy: 'a', currency: 'USD' }, ['a', 'b']);
  add('percent thirds', { amount: 100, splitMode: 'percentage', splitConfig: { a: 33.33, b: 33.33, c: 33.34 }, paidBy: 'c', currency: 'USD' }, ['a', 'b', 'c']);
  add('percent under 100', { amount: 100, splitMode: 'percentage', splitConfig: { a: 40, b: 40 }, paidBy: 'a', currency: 'USD' }, ['a', 'b']);
  add('percent missing', { amount: 100, splitMode: 'percentage', paidBy: 'a', currency: 'USD' }, ['a', 'b']);
  // Itemized.
  const item = (id, name, amount, assigned) => ({ id, name, amount, assignedMemberIds: assigned });
  add('itemized basic', { amount: 90, splitMode: 'itemized', paidBy: 'a', currency: 'USD', itemizedConfig: { items: [item('1', 'x', 30, ['a']), item('2', 'y', 60, ['b', 'c'])] } }, ['a', 'b', 'c']);
  add('itemized tax tip discount', { amount: 120, splitMode: 'itemized', paidBy: 'b', currency: 'USD', itemizedConfig: { items: [item('1', 'x', 40, ['a']), item('2', 'y', 60, ['b']), item('3', 'z', 20, [])], tax: 10, tip: 12, discount: 22 } }, ['a', 'b', 'c']);
  add('itemized unassigned goes to all', { amount: 30, splitMode: 'itemized', paidBy: 'a', currency: 'USD', itemizedConfig: { items: [item('1', 'x', 30, [])] } }, ['a', 'b', 'c']);
  add('itemized assignee not a participant', { amount: 30, splitMode: 'itemized', paidBy: 'a', currency: 'USD', itemizedConfig: { items: [item('1', 'x', 30, ['zz'])] } }, ['a', 'b']);
  add('itemized zero total with tax', { amount: 10, splitMode: 'itemized', paidBy: 'a', currency: 'USD', itemizedConfig: { items: [item('1', 'x', 0, ['a'])], tax: 10 } }, ['a', 'b']);
  add('itemized empty items falls through', { amount: 50, splitMode: 'itemized', paidBy: 'a', currency: 'USD', itemizedConfig: { items: [] } }, ['a', 'b']);
  add('itemized JPY', { amount: 1000, splitMode: 'itemized', paidBy: 'a', currency: 'JPY', itemizedConfig: { items: [item('1', 'x', 333, ['a']), item('2', 'y', 667, ['b', 'c'])] } }, ['a', 'b', 'c']);
  // Unknown mode and no currency.
  add('unknown mode', { amount: 10, splitMode: 'weird', paidBy: 'a', currency: 'USD' }, ['a']);
  add('no currency defaults to 2 decimals', { amount: 10, splitMode: 'equal', paidBy: 'a' }, ['a', 'b', 'c']);
  writeFixture('split_resolver.json', { cases });
}

// 12d. Small expense-form helpers: last expense, draft TTL, settlement share card.
{
  const lastExpenseMod = await import('../src/utils/lastExpense.ts');
  const draftMod = await import('../src/utils/expenseDraft.ts');
  const cardMod = await import('../src/utils/settlementShareCard.ts');

  const exp = (id, over) => ({ id, tripId: 't1', title: 'Lunch', amount: 10, currency: 'INR', category: 'Food', date: '2026-10-01', paidBy: 'a', splitMode: 'equal', splitMemberIds: ['a'], resolvedShares: { a: 10 }, createdAt: 1, updatedAt: 1, ...over });
  const lastInput = [
    exp('e1', { createdAt: 10 }),
    exp('e2', { createdAt: 30, isSettlement: true }),
    exp('e3', { createdAt: 20 }),
    exp('e4', { createdAt: 40, title: 'Settlement: A to B' }),
    exp('e5', { createdAt: 50, deletedAt: 5 }),
    exp('e6', { createdAt: 20, tripId: 't2' }),
    exp('e7', { createdAt: 20 })
  ];
  const last = {
    expenses: lastInput,
    cases: [
      { tripId: 't1', result: lastExpenseMod.getLatestNonSettlementExpense(lastInput, 't1')?.id ?? null },
      { tripId: 't2', result: lastExpenseMod.getLatestNonSettlementExpense(lastInput, 't2')?.id ?? null },
      { tripId: null, result: lastExpenseMod.getLatestNonSettlementExpense(lastInput, null)?.id ?? null },
      { tripId: 'nope', result: lastExpenseMod.getLatestNonSettlementExpense(lastInput, 'nope')?.id ?? null },
      { tripId: 't1', empty: true, result: lastExpenseMod.getLatestNonSettlementExpense([], 't1')?.id ?? null }
    ]
  };

  const mem = {};
  const store = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
  const T0 = 1000000;
  draftMod.saveDraft(store, 'k', { title: 'Taxi', amount: '12' }, T0);
  const draft = {
    ttl: draftMod.DRAFT_TTL_MS,
    saved: JSON.parse(mem.k),
    loads: [0, 1000, draftMod.DRAFT_TTL_MS, draftMod.DRAFT_TTL_MS + 1].map((dt) => {
      draftMod.saveDraft(store, 'k', { title: 'Taxi', amount: '12' }, T0);
      return { elapsed: dt, result: draftMod.loadDraft(store, 'k', T0 + dt), removed: !('k' in mem) };
    }),
    malformed: [
      '{not json', '{"savedAt":"x","data":{}}', '{"savedAt":5}', '{"savedAt":5,"data":null}', '{"savedAt":5,"data":"str"}'
    ].map((raw) => { mem.m = raw; const r = draftMod.loadDraft(store, 'm', 6); return { raw, result: r, removed: !('m' in mem) }; }),
    missing: draftMod.loadDraft(store, 'absent', T0)
  };

  const cardInputs = [
    { tripName: 'Goa Weekend', fromLabel: 'Ben', toLabel: 'Asha', amount: 1234.5, currencySymbol: '₹' },
    { tripName: '', fromLabel: 'A', toLabel: 'B', amount: 0.005, currencySymbol: '$', upiId: 'asha@okhdfc' },
    { tripName: 'Trip/with: odd*chars? & spaces', fromLabel: 'X', toLabel: 'Y', amount: NaN, currencySymbol: '€' },
    { tripName: 'Big', fromLabel: 'P', toLabel: 'Q', amount: 1234567.891, currencySymbol: '£', upiId: null }
  ];
  const shareCard = cardInputs.map((input) => ({
    input: { ...input, amount: Number.isNaN(input.amount) ? 'NaN' : input.amount },
    layout: cardMod.getSettlementShareCardLayout(input)
  }));

  writeFixture('expense_helpers.json', { last, draft, shareCard });
}

// 12e. Default categories (generated into Dart) and category colours.
{
  const colorMod = await import('../src/utils/categoryColor.ts');
  const storeMod2 = await import('../src/store/tripStore.ts').catch(() => null);
  const cats = storeMod2 ? storeMod2.DEFAULT_CATEGORIES : [];
  const q = (v) => `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const dart = [
    '// GENERATED by scripts/export-golden-fixtures.mjs from DEFAULT_CATEGORIES in src/store/tripStore.ts. Do not edit.',
    "import '../models/category.dart';",
    '',
    'const List<Category> defaultCategories = [',
    ...cats.map((c) => `  Category(id: ${q(c.id)}, name: ${q(c.name)}, icon: ${q(c.icon)}, isCustom: ${c.isCustom}),`),
    '];',
    ''
  ].join('\n');
  fs.writeFileSync(path.resolve('flutter_app/lib/domain/logic/default_categories.g.dart'), dart, 'utf8');
  const ids = ['cat-food', 'cat-stay', 'cat-travel', 'cat-activities', 'cat-shopping', 'cat-misc', 'a', 'custom-1', '3f2b8c1e-9a77-4c1d-8e2a-0a1b2c3d4e5f', 'Fuel 🚗', 'ZZZZZZZZZZZZZZZZZZZZZZZZZZ', '', 'é'];
  writeFixture('category_colors.json', { cases: ids.map((id) => ({ id, color: colorMod.getCatColor(id, 0) })), defaults: cats });
}

// 12a. Locale-aware money formatting (TS uses the device locale via toLocaleString).
{
  const locales = ['en-US', 'en-IN', 'de-DE', 'fr-FR', 'ja-JP', 'ar-EG', 'hi-IN', 'es-ES'];
  const amounts = [0, 5, 0.005, 1234.5, 1234.565, 99999.995, 123450, 1234567.891, -9876.5, 100000000];
  const currencies = ['USD', 'JPY', 'KWD'];
  const cases = [];
  for (const locale of locales) {
    for (const currency of currencies) {
      const decimals = currencyMod.getCurrencyDecimals(currency);
      for (const amount of amounts) {
        cases.push({
          locale, currency, amount,
          result: amount.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        });
      }
    }
  }
  writeFixture('locale_money.json', { note: 'Mirrors formatMoneyNumber() with an explicit locale', cases });
}

// 12b. City -> IATA map generated into Dart (cannot drift from passParser.ts).
{
  const entries = Object.entries(passParserMod.CITY_TO_IATA);
  const dart = [
    '// GENERATED by scripts/export-golden-fixtures.mjs from CITY_TO_IATA in src/utils/passParser.ts. Do not edit.',
    'const Map<String, String> cityToIata = {',
    ...entries.map(([k, v]) => `  '${k.replace(/'/g, "\\'")}': '${v}',`),
    '};',
    ''
  ].join('\n');
  fs.writeFileSync(path.resolve('flutter_app/lib/domain/logic/city_iata.g.dart'), dart, 'utf8');
}

// 13. Feature flag registry (keys + defaults + packs) and the generated Dart const,
// so the Flutter flag set cannot drift from src/utils/featureFlags.ts.
{
  const flagsMod = await import('../src/utils/featureFlags.ts');
  const defaults = flagsMod.DEFAULT_FEATURE_FLAGS;
  const metaDefaults = Object.fromEntries(
    Object.keys(defaults).map((k) => [k, flagsMod.FEATURE_FLAGS_META[k]?.defaultEnabledForUsers ?? false])
  );
  const packs = flagsMod.CONSUMER_PACKS.map((p) => ({ id: p.id, flagKeys: p.flagKeys }));
  writeFixture('flags.json', { defaults, metaDefaults, packs });

  const keys = Object.keys(defaults).sort();
  const dart = [
    '// GENERATED by scripts/export-golden-fixtures.mjs from src/utils/featureFlags.ts. Do not edit.',
    '// Run: node scripts/export-golden-fixtures.mjs',
    '',
    '/// Offline defaults, identical to `DEFAULT_FEATURE_FLAGS`.',
    'const Map<String, bool> defaultFeatureFlags = {',
    ...keys.map((k) => `  '${k}': ${defaults[k]},`),
    '};',
    '',
    '/// Superadmin-facing text for each flag (`FEATURE_FLAGS_META`): label, pack id, what ON / OFF does.',
    'const Map<String, ({String label, String pack, String description})> flagMeta = {',
    ...keys.map((k) => {
      const m = flagsMod.FEATURE_FLAGS_META[k];
      const esc = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$').replace(/\n/g, ' ');
      return `  '${k}': (label: '${esc(m?.label ?? k)}', pack: '${esc(m?.pack ?? '')}', description: '${esc(m?.description ?? '')}'),`;
    }),
    '};',
    '',
    '/// Pack display info for the Superadmin portal (`CONSUMER_PACKS`): code, title, tagline, in rail order.',
    'const List<({String id, String code, String title, String tagline})> consumerPackInfo = [',
    ...flagsMod.CONSUMER_PACKS.map((p) => {
      const esc = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$').replace(/\n/g, ' ');
      return `  (id: '${esc(p.id)}', code: '${esc(p.code)}', title: '${esc(p.title)}', tagline: '${esc(p.tagline)}'),`;
    }),
    '];',
    '',
    '/// Consumer pack -> flag keys (`CONSUMER_PACKS`).',
    'const Map<String, List<String>> consumerPacks = {',
    ...packs.map((p) => `  '${p.id}': [${p.flagKeys.map((k) => `'${k}'`).join(', ')}],`),
    '};',
    '',
  ].join('\n');
  fs.writeFileSync(path.resolve('flutter_app/lib/domain/logic/flag_defaults.g.dart'), dart, 'utf8');
  console.log('Generated: flutter_app/lib/domain/logic/flag_defaults.g.dart');
}

// 14. Customer-facing changelog (newest 12 entries) for the Flutter About screen.
{
  const { CHANGELOG_ENTRIES } = await import('../src/utils/changelog.ts');
  const esc = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
  const dart = [
    '// GENERATED by scripts/export-golden-fixtures.mjs from src/utils/changelog.ts. Do not edit.',
    '',
    'class ChangelogEntry {',
    '  const ChangelogEntry(this.version, this.date, this.changes);',
    '  final String version;',
    '  final String date;',
    '  final List<String> changes;',
    '}',
    '',
    'const List<ChangelogEntry> changelogEntries = [',
    ...CHANGELOG_ENTRIES.slice(0, 12).map(
      (e) => `  ChangelogEntry('${e.version}', '${e.date}', [${e.changes.map((c) => `'${esc(c)}'`).join(', ')}]),`
    ),
    '];',
    '',
  ].join('\n');
  fs.writeFileSync(path.resolve('flutter_app/lib/domain/logic/changelog.g.dart'), dart, 'utf8');
  console.log('Generated: flutter_app/lib/domain/logic/changelog.g.dart');
}

// Generated Dart is formatted like the rest of flutter_app so `dart format --set-exit-if-changed`
// and the fixture-drift check can both pass. Skipped quietly when dart is not installed.
try {
  const { execFileSync } = await import('node:child_process');
  const dir = path.resolve('flutter_app/lib/domain/logic');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.g.dart')).map((f) => path.join(dir, f));
  execFileSync('dart', ['format', ...files], { stdio: 'ignore' });
} catch {
  // formatter unavailable
}

console.log('--- Golden Fixtures Successfully Exported ---');
