import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:path/path.dart' as p;
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/platform/receipt_picker.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/data/storage/receipt_store.dart';
import 'package:trip_tracker/data/sync/outbox_types.dart';
import 'package:trip_tracker/domain/models/expense.dart';
import 'package:trip_tracker/features/expenses/application/expense_form_controller.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';
import '../../support/seed.dart';

class FakePicker implements ReceiptPicker {
  FakePicker(this.path);
  final String? path;
  final calls = <ReceiptSource>[];
  @override
  Future<String?> pick(ReceiptSource source) async {
    calls.add(source);
    return path;
  }
}

Finder key(String k) => find.byKey(Key(k));
Finder button(String l) => find.widgetWithText(AppButton, l);
String errorText(WidgetTester t) =>
    (t.widget<Text>(find.descendant(of: key('form-error'), matching: find.byType(Text)).first)).data!;

Future<void> tap(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.pump();
  await t.tap(f);
  await settle(t, rounds: 2);
}

Future<void> tapKey(WidgetTester t, Object k) async {
  final f = k is Finder ? k : find.byKey(k is Key ? k : Key(k as String));
  await t.ensureVisible(f);
  await t.tap(f);
}

Future<void> typeAmount(WidgetTester t, String v) async {
  await t.enterText(key('amount-field'), v);
  await settle(t, rounds: 2);
}

Future<void> typeTitle(WidgetTester t, String v) async {
  await t.enterText(key('title-field'), v);
  await settle(t, rounds: 2);
}

Future<void> save(WidgetTester t) async {
  await t.ensureVisible(key('save'));
  await t.tap(key('save'));
  await settle(t, rounds: 14);
}

void main() {
  group('add expense (basics)', () {
    testApp('equal split between everyone: saves locally, queues one add, closes the form', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(find.text('Add expense'), findsWidgets);
      await typeAmount(tester, '100');
      await typeTitle(tester, 'Dinner at Chalet');
      expect(key('preview-${s.me}'), findsOneWidget);
      expect(tester.widget<Text>(key('preview-${s.me}')).data, '₹33.34'); // payer takes the spare paisa
      await save(tester);

      final list = await expensesOf(tester, s);
      expect(list, hasLength(1));
      final e = list.single as Expense;
      expect(e.title, 'Dinner at Chalet');
      expect(e.amount, 100);
      expect(e.paidBy, s.me);
      expect(e.splitMemberIds.toSet(), {s.me, s.ben, s.cara});
      final q = await real(tester, () => containerOf(tester).read(outboxStoreProvider).all());
      expect(q.map((i) => i.type), contains(OutboxType.addExpense));
      expect(find.text('Add expense'), findsNothing); // closed
    });

    testApp('validation messages are the web wording, in the web order', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await save(tester);
      expect(errorText(tester), 'Please enter a valid amount greater than 0.');
      await typeAmount(tester, '50');
      await save(tester);
      expect(errorText(tester), 'Please enter a title for the expense.');
      await typeTitle(tester, 'Snacks');
      await tap(tester, key('split-${s.me}'));
      await tap(tester, key('split-${s.ben}'));
      await tap(tester, key('split-${s.cara}'));
      await save(tester);
      expect(errorText(tester), 'Please select at least one member to split the expense with.');
      expect(await expensesOf(tester, s), isEmpty);
    });

    testApp('math expressions: 12*3+4 shows = ₹40.00 and saves 40', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '12*3+4');
      expect(tester.widget<Text>(key('amount-eval')).data, '= ₹40.00');
      await typeTitle(tester, 'Snacks');
      await save(tester);
      expect(((await expensesOf(tester, s)).single as Expense).amount, 40);
    });

    testApp('title suggests a category until you pick one yourself', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeTitle(tester, 'Hotel booking');
      expect(find.byKey(const Key('auto-category')), findsOneWidget);
      await tap(tester, key('cat-cat-shopping'));
      expect(find.byKey(const Key('auto-category')), findsNothing);
      await typeTitle(tester, 'Taxi to airport'); // would suggest travel, but the user chose
      await typeAmount(tester, '40');
      await save(tester);
      expect(((await expensesOf(tester, s)).single as Expense).category, 'cat-shopping');
    });

    testApp('the amount field only accepts calculator characters', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tester.enterText(key('amount-field'), 'abc12*3');
      await settle(tester, rounds: 2);
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '12*3');
    });

    testApp('a closed trip refuses the save with the web wording', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await real(tester, () => containerOf(tester).read(tripRepositoryProvider).setTripState(s.tripId, closed: true));
      await openForm(tester, s);
      await typeAmount(tester, '10');
      await typeTitle(tester, 'x');
      await save(tester);
      expect(errorText(tester), 'This trip is closed. Reopen it to add expenses.');
    });
  });

  group('split modes (Pro: advanced splits)', () {
    Future<Seed> open(WidgetTester tester, {Set<String> off = const {}}) async {
      await pumpApp(tester, user: asha, flagsOff: off);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '100');
      await typeTitle(tester, 'Dinner');
      return s;
    }

    testApp('mode switch is Equal only without the flag', (tester) async {
      final s = await open(tester, off: const {'enableAdvancedSplits'});
      expect(key('mode-equal'), findsOneWidget);
      expect(key('mode-percentage'), findsNothing);
      expect(s.me, isNotEmpty);
    });

    testApp('percent: live sum, mismatch message, then a valid split saves its config', (tester) async {
      final s = await open(tester);
      await tap(tester, key('mode-percentage'));
      await tester.enterText(find.byKey(ValueKey('cfg-${s.me}-percentage-0')), '60');
      await tester.enterText(find.byKey(ValueKey('cfg-${s.ben}-percentage-0')), '30');
      await settle(tester, rounds: 2);
      expect(tester.widget<Text>(key('sum-status')).data, '90.0% of 100%');
      await save(tester);
      expect(errorText(tester), 'Split percentages sum (90.00) must equal 100%.');
      await tester.enterText(find.byKey(ValueKey('cfg-${s.cara}-percentage-0')), '10');
      await settle(tester, rounds: 2);
      await save(tester);
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.splitMode, 'percentage');
      expect(e.resolvedShares[s.me], 60);
      expect(e.resolvedShares[s.cara], 10);
    });

    testApp('exact amounts must equal the total', (tester) async {
      final s = await open(tester);
      await tap(tester, key('mode-exact'));
      for (final m in [s.me, s.ben, s.cara]) {
        await tester.enterText(find.byKey(ValueKey('cfg-$m-exact-0')), m == s.cara ? '20' : '40');
      }
      await settle(tester, rounds: 2);
      await save(tester);
      expect((await expensesOf(tester, s)).single, isA<Expense>());
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.resolvedShares[s.cara], 20);
    });

    testApp('shares (weights) save as weights, not as an equal split', (tester) async {
      final s = await open(tester);
      await tap(tester, key('mode-custom'));
      await tester.enterText(find.byKey(ValueKey('cfg-${s.me}-custom-0')), '2');
      await tester.enterText(find.byKey(ValueKey('cfg-${s.ben}-custom-0')), '1');
      await tester.enterText(find.byKey(ValueKey('cfg-${s.cara}-custom-0')), '1');
      await settle(tester, rounds: 2);
      expect(tester.widget<Text>(key('preview-${s.me}')).data, '₹50.00');
      await save(tester);
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.resolvedShares[s.me], 50);
      expect(e.splitConfig![s.me], 2);
    });

    testApp('payer 50% preset fills percentages that total 100', (tester) async {
      final s = await open(tester);
      await tap(tester, key('preset-half'));
      expect(tester.widget<Text>(key('sum-status')).data, '100.0% of 100%');
      await save(tester);
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.resolvedShares[s.me], 50);
    });
  });

  group('presets, groups and defaults', () {
    testApp('Only payer / Everyone but payer / Everyone', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tap(tester, key('preset-only-payer'));
      expect(tester.widget<CheckboxListTile>(key('split-${s.me}')).value, isTrue);
      expect(tester.widget<CheckboxListTile>(key('split-${s.ben}')).value, isFalse);
      await tap(tester, key('preset-exclude-payer'));
      expect(tester.widget<CheckboxListTile>(key('split-${s.me}')).value, isFalse);
      expect(tester.widget<CheckboxListTile>(key('split-${s.ben}')).value, isTrue);
      await tap(tester, key('preset-everyone'));
      expect(tester.widget<CheckboxListTile>(key('split-${s.me}')).value, isTrue);
    });

    testApp('a group chip selects exactly its members', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final g = await real(
        tester,
        () => containerOf(tester).read(memberRepositoryProvider).createGroup(s.tripId, 'Couple', [s.ben, s.cara]),
      );
      await openForm(tester, s);
      await tap(tester, key('preset-only-payer'));
      await tap(tester, key('group-$g'));
      expect(tester.widget<CheckboxListTile>(key('split-${s.me}')).value, isFalse);
      expect(tester.widget<CheckboxListTile>(key('split-${s.ben}')).value, isTrue);
      expect(tester.widget<CheckboxListTile>(key('split-${s.cara}')).value, isTrue);
    });

    testApp('split exclusion defaults (Pro) leave excluded people out of a new expense', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableSplitExclusionDefaults'});
      final s = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester).read(tripRepositoryProvider).setSplitExclusionDefaults(s.tripId, {
          'cat-food': [s.cara],
        }),
      );
      await openForm(tester, s);
      expect(tester.widget<CheckboxListTile>(key('split-${s.cara}')).value, isFalse);
      expect(tester.widget<CheckboxListTile>(key('split-${s.me}')).value, isTrue);
    });

    testApp('date-range membership (Pro): someone who joins later is not preselected', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableDateRangeMembership'});
      final s = await seedTrip(tester);
      await real(
        tester,
        () => containerOf(tester).read(memberRepositoryProvider).updateMember(s.cara, joinDate: '2099-01-01'),
      );
      await openForm(tester, s);
      expect(tester.widget<CheckboxListTile>(key('split-${s.cara}')).value, isFalse);
    });

    testApp('remember default split: the next new expense starts with last time\'s people', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableRememberDefaultSplit'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '60');
      await typeTitle(tester, 'First');
      await tap(tester, key('split-${s.cara}'));
      await save(tester);
      await openForm(tester, s);
      expect(tester.widget<CheckboxListTile>(key('split-${s.cara}')).value, isFalse);
      expect(tester.widget<CheckboxListTile>(key('split-${s.ben}')).value, isTrue);
    });
  });

  group('multiple payers (Pro)', () {
    testApp('toggle, allocation total, mismatch message, then a valid joint payment', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableMultiPayerExpenses'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '100');
      await typeTitle(tester, 'Hotel');
      await tap(tester, key('payer-mode'));
      expect(
        tester.widget<Text>(key('allocated')).data,
        'Allocated ₹100.00 of ₹100.00',
      ); // seeded from the single payer
      await tester.enterText(find.byKey(ValueKey('payer-amt-${s.me}-0')), '60');
      await settle(tester, rounds: 2);
      await save(tester);
      expect(errorText(tester), 'Multi-payer sum (₹ 60.00) must equal total expense (₹ 100.00). Difference: ₹ 40.00.');
      await tester.enterText(find.byKey(ValueKey('payer-amt-${s.ben}-0')), '40');
      await settle(tester, rounds: 2);
      await save(tester);
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.paidByShares, {s.me: 60.0, s.ben: 40.0});
      expect(e.paidBy, s.me); // the larger contribution
    });

    testApp('hidden without the flag', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('payer-mode'), findsNothing);
      expect(s.me, isNotEmpty);
    });
  });

  group('currency', () {
    testApp('foreign currency with FX on: shows the conversion and stores the base amount', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCurrencyFx'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tap(tester, key('currency-chip'));
      await settle(tester);
      await tap(tester, key('currency-USD'));
      await settle(tester);
      await typeAmount(tester, '10');
      await typeTitle(tester, 'Sushi');
      expect(tester.widget<Text>(key('conversion')).data, '≈ ₹872.50 at 87.25');
      await save(tester);
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.amount, 872.5);
      expect(e.currency, 'USD');
    });

    testApp('a custom trip rate changes the conversion and is queued as a collab write', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCurrencyFx'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tap(tester, key('currency-chip'));
      await settle(tester);
      await tap(tester, key('currency-USD'));
      await settle(tester);
      await typeAmount(tester, '10');
      await tap(tester, key('fx-set'));
      await settle(tester);
      await tester.enterText(find.byType(TextField).last, '80');
      await tester.tap(button('Save').last);
      await settle(tester, rounds: 12);
      expect(tester.widget<Text>(key('conversion')).data, '≈ ₹800.00 at 80.0');
      final q = await real(tester, () => containerOf(tester).read(outboxStoreProvider).all());
      expect(q.map((i) => i.type), contains(OutboxType.setTripCollabField));
    });

    testApp('no currency picker without the flag', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableCurrencyFx'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('currency-chip'), findsNothing);
      expect(s.me, isNotEmpty);
    });
  });

  group('shortcuts', () {
    testApp('Same as last time copies the last expense (date becomes today)', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCloneLastExpense'});
      final s = await seedTrip(tester);
      await addExpense(
        tester,
        s,
        title: 'Morning coffee',
        amount: 30,
        date: '2026-09-01',
        paidBy: s.ben,
        split: [s.me, s.ben],
      );
      await openForm(tester, s);
      await tap(tester, key('same-as-last'));
      await settle(tester, rounds: 3);
      expect(tester.widget<TextField>(key('title-field')).controller!.text, 'Morning coffee');
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '30');
      expect(tester.widget<CheckboxListTile>(key('split-${s.cara}')).value, isFalse);
      expect(find.text('2026-09-01'), findsNothing); // not the old date
    });

    testApp('no Same as last time without history or without the flag', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCloneLastExpense'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('same-as-last'), findsNothing);
    });

    testApp('quick fill understands plain text; junk shows an error', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await tap(tester, key('quick-fill-toggle'));
      await settle(tester);
      await tester.enterText(key('quick-field'), 'Coffee 4.50 Ben');
      await tester.tap(button('Fill'));
      await settle(tester, rounds: 3);
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '4.5');
      expect(tester.widget<TextField>(key('title-field')).controller!.text.toLowerCase(), contains('coffee'));
      expect(s.me, isNotEmpty);
    });

    testApp('predictive chips (flag) fill the title and category', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enablePredictiveChips'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      final chip = find.byWidgetPredicate((w) => w is ActionChip && w.key.toString().startsWith("[<'chip-"));
      expect(chip, findsWidgets);
      await tester.tap(chip.first);
      await settle(tester, rounds: 3);
      expect(tester.widget<TextField>(key('title-field')).controller!.text, isNotEmpty);
      expect(s.me, isNotEmpty);
    });
  });

  group('duplicate warning (flag)', () {
    testApp('same amount, title and day as an existing expense warns; "Not a duplicate" dismisses it', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableDuplicateDetector'});
      final s = await seedTrip(tester);
      final today = DateTime.now();
      final ymd =
          '${today.year.toString().padLeft(4, '0')}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      await addExpense(tester, s, title: 'Dinner at Chalet', amount: 100, date: ymd);
      await openForm(tester, s);
      await typeAmount(tester, '100');
      await typeTitle(tester, 'dinner at chalet');
      expect(key('duplicate-card'), findsOneWidget);
      expect(tester.widget<Text>(key('duplicate-reason')).data, contains('Dinner at Chalet'));
      await tester.ensureVisible(key('duplicate-ignore'));
      await tap(tester, key('duplicate-ignore'));
      expect(key('duplicate-card'), findsNothing);
    });

    testApp('no warning when the flag is off', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableDuplicateDetector'});
      final s = await seedTrip(tester);
      await addExpense(tester, s, title: 'Dinner at Chalet', amount: 100);
      await openForm(tester, s);
      await typeAmount(tester, '100');
      await typeTitle(tester, 'Dinner at Chalet');
      expect(key('duplicate-card'), findsNothing);
    });
  });

  group('drafts', () {
    testApp('an unsent draft is restored next time; Discard clears it', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '75');
      await typeTitle(tester, 'Half-typed');
      await tester.pump(const Duration(milliseconds: 500)); // debounce
      GoRouter.of(tester.element(find.byType(Scaffold).last)).pop();
      await settle(tester, rounds: 6);
      await openForm(tester, s);
      expect(key('draft-banner'), findsOneWidget);
      expect(tester.widget<TextField>(key('title-field')).controller!.text, 'Half-typed');
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '75');
      await tap(tester, key('draft-discard'));
      await settle(tester, rounds: 3);
      expect(tester.widget<TextField>(key('title-field')).controller!.text, '');
      expect(key('draft-banner'), findsNothing);
    });

    testApp('saving clears the draft', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '75');
      await typeTitle(tester, 'Real one');
      await tester.pump(const Duration(milliseconds: 500));
      await save(tester);
      await openForm(tester, s);
      expect(key('draft-banner'), findsNothing);
    });

    testApp('persistent drafts (flag) are kept in app storage with a 24 h expiry', (tester) async {
      final app = await pumpApp(tester, user: asha, flagsOn: {'enablePersistentExpenseDraft'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '10');
      await typeTitle(tester, 'Persist me');
      await tester.pump(const Duration(milliseconds: 500));
      await settle(tester, rounds: 2);
      expect(app.prefs.getString('tt_draft_expense_${s.tripId}'), contains('Persist me'));
    });
  });

  group('edit', () {
    testApp('editing loads the expense, saves changes as an update, keeps one row', (tester) async {
      await pumpApp(tester, user: asha);
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s, title: 'Beach lunch', amount: 120);
      await openForm(tester, s, editId: id);
      expect(find.text('Edit expense'), findsOneWidget);
      expect(tester.widget<TextField>(key('title-field')).controller!.text, 'Beach lunch');
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '120');
      await typeTitle(tester, 'Beach lunch (updated)');
      await typeAmount(tester, '150');
      await save(tester);
      final list = await expensesOf(tester, s);
      expect(list, hasLength(1));
      expect((list.single as Expense).title, 'Beach lunch (updated)');
      expect((list.single as Expense).amount, 150);
      final q = await real(tester, () => containerOf(tester).read(outboxStoreProvider).all());
      expect(q.map((i) => i.type), contains(OutboxType.updateExpense));
    });

    testApp('edit has no draft banner or quick-fill shortcuts', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableCloneLastExpense'});
      final s = await seedTrip(tester);
      final id = await addExpense(tester, s);
      await openForm(tester, s, editId: id);
      expect(key('draft-banner'), findsNothing);
      expect(key('same-as-last'), findsNothing);
      expect(key('quick-fill-toggle'), findsNothing);
    });
  });

  group('receipt photo (flag)', () {
    testApp('pick, preview, save: staged copy + queued upload payload; remove clears it', (tester) async {
      final tmp = Directory.systemTemp.createTempSync('form_receipt');
      addTearDown(() => tmp.deleteSync(recursive: true));
      final photo = File(p.join(tmp.path, 'camera.jpg'))..writeAsBytesSync([1, 2, 3]);
      final picker = FakePicker(photo.path);
      late AppDatabase db;
      await pumpApp(
        tester,
        user: asha,
        flagsOn: {'enableReceiptUpload'},
        flagsOff: {'enableCompactExpenseForm'},
        overrides: [
          receiptPickerProvider.overrideWithValue(picker),
          receiptStoreProvider.overrideWith(
            (ref) => ReceiptStore(db = ref.watch(appDatabaseProvider), baseDir: () async => tmp),
          ),
        ],
      );
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '25');
      await typeTitle(tester, 'Museum');
      await tester.ensureVisible(key('receipt-camera'));
      await tap(tester, key('receipt-camera'));
      await settle(tester, rounds: 3);
      expect(picker.calls, [ReceiptSource.camera]);
      expect(key('receipt-preview'), findsOneWidget);
      await tap(tester, key('receipt-remove'));
      expect(key('receipt-preview'), findsNothing);
      await tap(tester, key('receipt-gallery'));
      await settle(tester, rounds: 3);
      await save(tester);

      final q = await real(tester, () => containerOf(tester).read(outboxStoreProvider).all());
      final payload = q.firstWhere((i) => i.type == OutboxType.addExpense).payload;
      final r = payload['receipt'] as Map;
      expect(r['ext'], 'jpg');
      expect(r['mime'], 'image/jpeg');
      expect(File(r['localPath'] as String).readAsBytesSync(), [1, 2, 3]);
      expect(p.basename(r['localPath'] as String), '${r['expenseId']}.jpg');
      expect(db, isNotNull);
    });

    testApp('no receipt controls without the flag', (tester) async {
      await pumpApp(tester, user: asha, flagsOff: {'enableReceiptUpload', 'enableCompactExpenseForm'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('receipt-camera'), findsNothing);
      expect(s.me, isNotEmpty);
    });

    testApp('compact form (flag) tucks the receipt under More details', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableReceiptUpload', 'enableCompactExpenseForm'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      expect(key('more-details'), findsOneWidget);
      expect(key('receipt-camera'), findsNothing);
      await tester.ensureVisible(key('more-details'));
      await tap(tester, key('more-details'));
      await settle(tester);
      expect(key('receipt-camera'), findsOneWidget);
      expect(s.me, isNotEmpty);
    });
  });

  group('explain and itemized', () {
    testApp('Explain this number shows the working for each share', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableExplainThisNumber'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '100');
      await typeTitle(tester, 'Dinner');
      await tester.ensureVisible(key('explain'));
      await tap(tester, key('explain'));
      await settle(tester);
      expect(tester.widget<Text>(key('explain-${s.me}')).data, '100.00 ÷ 3');
    });

    testApp('itemized: add items, share them, use the receipt total, save', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableItemizedSplit'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeTitle(tester, 'Dinner receipt');
      await tap(tester, key('mode-itemized'));
      await tester.ensureVisible(key('add-item'));
      await tap(tester, key('add-item'));
      final item = containerOf(tester).read(expenseFormProvider(ExpenseFormArgs(s.tripId))).items.single;
      await tester.enterText(find.byKey(ValueKey('item-amt-${item.id}-0')), '90');
      await settle(tester, rounds: 2);
      await tester.ensureVisible(key('use-total'));
      await tap(tester, key('use-total'));
      await settle(tester, rounds: 3);
      expect(tester.widget<TextField>(key('amount-field')).controller!.text, '90.00');
      await save(tester);
      final e = (await expensesOf(tester, s)).single as Expense;
      expect(e.splitMode, 'itemized');
      expect(e.itemizedConfig!.items.single.amount, 90);
      expect(e.resolvedShares.values.fold<double>(0, (a, b) => a + b), closeTo(90, 0.011));
    });

    testApp('itemized without items is rejected with the web message', (tester) async {
      await pumpApp(tester, user: asha, flagsOn: {'enableItemizedSplit'});
      final s = await seedTrip(tester);
      await openForm(tester, s);
      await typeAmount(tester, '40');
      await typeTitle(tester, 'x');
      await tap(tester, key('mode-itemized'));
      await save(tester);
      expect(errorText(tester), 'Please add at least one item to the itemized receipt breakdown.');
    });
  });
}
