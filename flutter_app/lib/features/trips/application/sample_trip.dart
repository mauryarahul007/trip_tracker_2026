import 'package:flutter_riverpod/flutter_riverpod.dart' show WidgetRef;

import '../../../data/providers.dart';
import '../../../domain/logic/expense_form_logic.dart' show ExpenseSubmission;

String _ymd(DateTime d) => d.toIso8601String().substring(0, 10);

/// A small made-up trip (three travellers, four expenses) so a new user can try the Summary, settling and the
/// tiles straight away. It is an ordinary trip: delete it from the Trips list like any other.
Future<String> createSampleTrip(
  WidgetRef ref, {
  required String userId,
  required String userName,
  required String currency,
  DateTime? now,
}) async {
  final today = now ?? DateTime.now();
  final trips = ref.read(tripRepositoryProvider);
  final members = ref.read(memberRepositoryProvider);
  final expenses = ref.read(expenseRepositoryProvider);

  final id = await trips.createTrip(
    name: 'Sample: Goa weekend',
    startDate: _ymd(today),
    endDate: _ymd(today.add(const Duration(days: 2))),
    baseCurrency: currency,
    ownerId: userId,
    creatorName: userName,
    destination: 'Goa',
  );
  final me = (await members.watchMembers(id).first).first.id;
  final sam = await members.addMember(id, 'Sam');
  final riya = await members.addMember(id, 'Riya');
  final everyone = [me, sam, riya];

  Future<void> add(String title, double amount, String category, String paidBy) async {
    await expenses.submit(
      ExpenseSubmission(
        title: title,
        amount: amount,
        currency: currency,
        category: category,
        date: _ymd(today),
        paidBy: paidBy,
        splitMode: 'equal',
        splitMemberIds: everyone,
      ),
      tripId: id,
      userId: userId,
    );
  }

  await add('Beach shack lunch', 1800, 'cat-food', me);
  await add('Scooter rental', 900, 'cat-travel', sam);
  await add('Sunset boat ride', 1500, 'cat-activities', riya);
  await add('Hotel', 6000, 'cat-stay', me);
  return id;
}
