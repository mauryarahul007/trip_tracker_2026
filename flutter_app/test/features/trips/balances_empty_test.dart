import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../support/pump_app.dart';

void main() {
  testApp('Balances with no trips offers Create trip', (tester) async {
    await pumpApp(tester, user: asha);
    await settle(tester);
    GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/balances');
    await settle(tester, rounds: 14);
    expect(find.byKey(const Key('balances-create-trip')), findsOneWidget);
  });
}
