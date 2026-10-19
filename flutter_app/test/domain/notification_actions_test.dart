import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/logic/notification_actions.dart';

import '../support/model_builders.dart';

void main() {
  final members = [memberOf('m1', linkedUserId: 'u1'), memberOf('m2', linkedUserId: 'u2')];

  test('the recipient of an unconfirmed settlement gets the confirm action; others and confirmed ones do not', () {
    final s = expenseOf('e1', 't1', 'Settlement: Ben ➔ Asha', isSettlement: true, splitMemberIds: ['m1']);
    Object? ask(String? user, {List<dynamic>? expenses, String title = 'Settlement: Ben ➔ Asha'}) =>
        settlementToConfirm(
          tripId: 't1',
          expenseTitle: title,
          userId: user,
          expenses: (expenses ?? [s]).cast(),
          members: members,
        );
    expect((ask('u1') as dynamic).id, 'e1'); // m1 is the recipient and is u1
    expect(ask('u2'), isNull); // not the recipient
    expect(ask(null), isNull);
    expect(ask('u1', title: 'Something else'), isNull);
    final done = expenseOf(
      'e1',
      't1',
      'Settlement: Ben ➔ Asha',
      isSettlement: true,
      splitMemberIds: ['m1'],
      settlementConfirmedAt: 5,
    );
    expect(ask('u1', expenses: [done]), isNull);
  });

  test('with several matching settlements the newest is the one to confirm', () {
    final older = expenseOf(
      'old',
      't1',
      'Settlement: Ben ➔ Asha',
      isSettlement: true,
      splitMemberIds: ['m1'],
      createdAt: 1,
    );
    final newer = expenseOf(
      'new',
      't1',
      'Settlement: Ben ➔ Asha',
      isSettlement: true,
      splitMemberIds: ['m1'],
      createdAt: 9,
    );
    expect(
      settlementToConfirm(
        tripId: 't1',
        expenseTitle: 'Settlement: Ben ➔ Asha',
        userId: 'u1',
        expenses: [older, newer],
        members: members,
      )?.id,
      'new',
    );
  });
}
