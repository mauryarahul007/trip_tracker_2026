import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/pump_app.dart';

/// Chat lives in the Notes tab's Chat pane.
Future<void> openChat(WidgetTester tester, String tripId) async {
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/$tripId/notes');
  await settle(tester, rounds: 14);
  await tester.tap(find.descendant(of: find.byKey(const Key('notes-panes')), matching: find.text('Chat')));
  await settle(tester, rounds: 6);
  expect(find.byKey(const Key('chat-input')), findsOneWidget);
}
