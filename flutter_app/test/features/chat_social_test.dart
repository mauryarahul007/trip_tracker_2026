import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:trip_tracker/domain/logic/chat_poll.dart';
import 'package:trip_tracker/features/chat/application/chat_providers.dart';

import '../support/pump_app.dart';
import '../support/seed.dart';

Finder key(String k) => find.byKey(Key(k));

Future<Seed> openChat(WidgetTester tester, {Set<String> flagsOn = const {}, Set<String> flagsOff = const {}}) async {
  await pumpApp(tester, user: asha, flagsOn: {'enableTripChat', ...flagsOn}, flagsOff: flagsOff);
  final s = await seedTrip(tester);
  await settle(tester);
  GoRouter.of(tester.element(find.byType(Scaffold).first)).go('/trip/${s.tripId}/notes');
  await settle(tester, rounds: 14);
  await tester.tap(find.descendant(of: key('notes-panes'), matching: find.text('Chat')));
  await settle(tester, rounds: 6);
  return s;
}

Future<void> say(WidgetTester tester, String text) async {
  await tester.enterText(key('chat-input'), text);
  await tester.tap(key('chat-send'));
  await settle(tester, rounds: 8);
}

void main() {
  group('poll logic', () {
    test('one vote per person: voting moves it, voting again withdraws it, closed polls ignore votes', () {
      var p = newPollPayload('Dinner?', ['Thali', ' ', 'Pizza']);
      expect((p['options'] as List).length, 2);
      p = pollWithVote(p, 'o1', 'a');
      p = pollWithVote(p, 'o1', 'b');
      expect(pollFromPayload(p)!.options.first.count, 2);
      p = pollWithVote(p, 'o2', 'a'); // a moves
      var v = pollFromPayload(p)!;
      expect([for (final o in v.options) o.count], [1, 1]);
      expect(v.votedBy('a'), 'o2');
      p = pollWithVote(p, 'o2', 'a'); // a withdraws
      v = pollFromPayload(p)!;
      expect([for (final o in v.options) o.count], [1, 0]);
      expect(v.leaders, {'o1'});
      final closed = pollClosed(p);
      expect(pollWithVote(closed, 'o2', 'c'), closed);
      expect(pollFromPayload(closed)!.closed, isTrue);
    });
  });

  group('Chat polls', () {
    testApp('create, vote, change vote and close a poll', (tester) async {
      await openChat(tester);
      await tester.tap(key('chat-poll'));
      await settle(tester, rounds: 6);
      await tester.enterText(key('poll-question'), 'Where to eat?');
      await tester.enterText(key('poll-option-0'), 'Thali');
      await tester.enterText(key('poll-option-1'), 'Pizza');
      await tester.pump();
      await tester.tap(key('poll-post'));
      await settle(tester, rounds: 10);
      expect(find.text('Where to eat?'), findsOneWidget);
      final opt = find.byWidgetPredicate(
        (w) => w.key.toString().contains("-o1'") && w.key.toString().contains('poll-'),
      );
      await tester.tap(opt);
      await settle(tester, rounds: 6);
      expect(find.text('1 vote'), findsOneWidget);
      await tester.tap(
        find.byWidgetPredicate((w) => w.key.toString().contains("-o2'") && w.key.toString().contains('poll-')),
      );
      await settle(tester, rounds: 6);
      expect(find.text('1 vote'), findsOneWidget); // moved, not added
      await tester.tap(find.text('Close poll'));
      await settle(tester, rounds: 6);
      expect(find.textContaining('Closed'), findsOneWidget);
      expect(find.text('Close poll'), findsNothing);
    });

    testApp('flag off: no poll button', (tester) async {
      await openChat(tester, flagsOff: {'enableTripPolls'});
      expect(key('chat-poll'), findsNothing);
    });
  });

  group('Chat reactions', () {
    testApp('long-press, pick an emoji, tap the chip to take it back', (tester) async {
      final s = await openChat(tester, flagsOn: {'enableChatReactionsAndReplies'});
      await say(tester, 'Nice view');
      await tester.longPress(find.text('Nice view'));
      await settle(tester, rounds: 6);
      await tester.tap(key('react-pick-👍'));
      await settle(tester, rounds: 8);
      expect(find.text('👍 1'), findsOneWidget);
      final msgs = containerOf(tester).read(tripMessagesProvider(s.tripId)).value!;
      expect(msgs.last.reactions['👍'], [s.me]);
      await tester.tap(find.text('👍 1'));
      await settle(tester, rounds: 8);
      expect(find.text('👍 1'), findsNothing);
    });

    testApp('flag off: long-press still just offers Edit on your own message', (tester) async {
      await openChat(tester);
      await say(tester, 'Hello');
      await tester.longPress(find.text('Hello'));
      await settle(tester, rounds: 6);
      expect(key('react-pick-👍'), findsNothing);
    });
  });
}
