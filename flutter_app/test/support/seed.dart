import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/providers.dart';
import 'package:trip_tracker/domain/logic/expense_form_logic.dart';

import 'pump_app.dart';

ProviderContainer containerOf(WidgetTester t) => ProviderScope.containerOf(t.element(find.byType(MaterialApp)));

class Seed {
  Seed(this.tripId, this.me, this.ben, this.cara);
  final String tripId;
  final String me;
  final String ben;
  final String cara;
}

/// Trip owned by u1 (Asha), plus Ben (linked u2) and Cara (not signed up).
Future<Seed> seedTrip(WidgetTester tester, {String owner = 'u1', String base = 'INR'}) async {
  final c = containerOf(tester);
  final id = await real(
    tester,
    () => c
        .read(tripRepositoryProvider)
        .createTrip(
          name: 'Goa Weekend',
          startDate: '2026-10-01',
          endDate: '2026-10-09',
          baseCurrency: base,
          ownerId: owner,
          creatorName: 'Asha',
        ),
  );
  final db = c.read(appDatabaseProvider);
  final me = (await real(tester, () => db.select(db.membersTable).get())).single.id;
  final ben = await real(tester, () => c.read(memberRepositoryProvider).addMember(id, 'Ben', linkedUserId: 'u2'));
  final cara = await real(tester, () => c.read(memberRepositoryProvider).addMember(id, 'Cara'));
  return Seed(id, me, ben, cara);
}

Future<String> addExpense(
  WidgetTester tester,
  Seed s, {
  String title = 'Beach lunch',
  double amount = 120,
  String date = '2026-10-06',
  String category = 'cat-food',
  String? paidBy,
  List<String>? split,
  String currency = 'INR',
  String userId = 'u1',
}) async {
  final c = containerOf(tester);
  final r = await real(
    tester,
    () => c
        .read(expenseRepositoryProvider)
        .submit(
          ExpenseSubmission(
            title: title,
            amount: amount,
            currency: currency,
            category: category,
            date: date,
            paidBy: paidBy ?? s.me,
            splitMode: 'equal',
            splitMemberIds: split ?? [s.me, s.ben, s.cara],
          ),
          tripId: s.tripId,
          userId: userId,
        ),
  );
  expect(r.isOk, isTrue, reason: r.error);
  return r.expenseId!;
}

/// Pushes the add (or edit) form on top of whatever is showing.
Future<void> openForm(WidgetTester tester, Seed s, {String? editId}) async {
  await settle(tester);
  final router = GoRouter.of(tester.element(find.byType(Scaffold).first));
  unawaited(router.push(editId == null ? '/trip/${s.tripId}/expenses/new' : '/trip/${s.tripId}/expenses/$editId/edit'));
  await settle(tester, rounds: 14);
}

Future<List<dynamic>> expensesOf(WidgetTester tester, Seed s) =>
    real(tester, () => containerOf(tester).read(expenseRepositoryProvider).watchActive(s.tripId).first);
