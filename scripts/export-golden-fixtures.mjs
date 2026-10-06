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

// Register resolver for extensionless TypeScript imports in src/
register(
  'data:text/javascript,export async function resolve(s, c, n){ try { return await n(s, c); } catch(e){ if (s.startsWith(".")) try { return await n(s + ".ts", c); } catch{} throw e; } }',
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

  const parseCases = parserInputs.map((input) => ({
    input,
    output: expenseQuickParserMod.parseQuickExpense(input, parserCategories, [], members, null)
  }));

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

  const localRoster = [
    { id: 'm1', name: 'Alice', linkedUserId: 'u1' },
    { id: 'm2', name: 'Bob', linkedUserId: null }
  ];
  const remoteRoster = [
    { id: 'm1', name: 'Alice Cooper', linkedUserId: 'u1' },
    { id: 'm2', name: 'Bob', linkedUserId: 'u2' },
    { id: 'm3', name: 'Charlie', linkedUserId: null }
  ];
  const mergedRoster = tripCollabMergeMod.mergeTripRoster(localRoster, remoteRoster);

  writeFixture('collab_merge.json', {
    tripMerge: { localTrip, remoteTrip, mergedTrip },
    rosterMerge: { localRoster, remoteRoster, mergedRoster }
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

  writeFixture('duplicate_burn_predictive.json', {
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

  writeFixture('passes_chat_cards.json', {
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
    body: notificationTextMod.renderNotificationBody(type, 'Alps Roadtrip', params)
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
  const relativeTime = relativeTimeMod.formatRelativeTime(MOCK_TIMESTAMP - 3600000, MOCK_TIMESTAMP);

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

  writeFixture('utilities.json', {
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

  const dbExpenseRow = {
    id: 'e29b41d4-550e-4400-a716-446655440001',
    trip_id: dbTripRow.id,
    title: 'Blue Lagoon Spa',
    amount: 180.5,
    currency: 'EUR',
    category_id: 'cat-entertainment',
    paid_by_member_id: '550e8400-e29b-41d4-a716-446655440002',
    split_mode: 'equal',
    split_data: {},
    date: '2026-10-02',
    receipt_url: 'receipts/t1/e1.jpg',
    notes: 'Relaxing afternoon',
    is_reimbursement: false,
    reimbursement_to_member_id: null,
    archived: false,
    recycled_at: null,
    payer_weights: null,
    exchange_rate: 1.08,
    dispute_status: null,
    dispute_note: null,
    disputed_by_member_id: null,
    settlement_confirmed: false,
    settlement_confirmed_at: null,
    approval_status: null,
    approved_by_member_id: null,
    approved_at: null,
    created_at: '2026-10-02T12:00:00.000Z'
  };

  const appExpenseObject = {
    id: dbExpenseRow.id,
    tripId: dbExpenseRow.trip_id,
    title: dbExpenseRow.title,
    amount: dbExpenseRow.amount,
    currency: dbExpenseRow.currency,
    categoryId: dbExpenseRow.category_id,
    paidByMemberId: dbExpenseRow.paid_by_member_id,
    splitMode: dbExpenseRow.split_mode,
    splitData: dbExpenseRow.split_data,
    date: dbExpenseRow.date,
    receiptUrl: dbExpenseRow.receipt_url,
    notes: dbExpenseRow.notes,
    isReimbursement: dbExpenseRow.is_reimbursement,
    reimbursementToMemberId: dbExpenseRow.reimbursement_to_member_id,
    archived: dbExpenseRow.archived,
    recycledAt: dbExpenseRow.recycled_at,
    payerWeights: dbExpenseRow.payer_weights,
    exchangeRate: dbExpenseRow.exchange_rate,
    disputeStatus: dbExpenseRow.dispute_status,
    disputeNote: dbExpenseRow.dispute_note,
    disputedByMemberId: dbExpenseRow.disputed_by_member_id,
    settlementConfirmed: dbExpenseRow.settlement_confirmed,
    settlementConfirmedAt: dbExpenseRow.settlement_confirmed_at,
    approvalStatus: dbExpenseRow.approval_status,
    approvedByMemberId: dbExpenseRow.approved_by_member_id,
    approvedAt: dbExpenseRow.approved_at,
    createdAt: dbExpenseRow.created_at
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
    members: { dbRow: dbMemberRow, appObject: appMemberObject }
  });
}

console.log('--- Golden Fixtures Successfully Exported ---');
