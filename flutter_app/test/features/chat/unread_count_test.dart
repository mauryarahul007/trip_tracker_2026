import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/models/trip_message.dart';
import 'package:trip_tracker/features/chat/application/chat_providers.dart';

TripMessage msg(String id, String by, {int? deletedAt}) =>
    TripMessage(id: id, tripId: 't', memberId: by, body: id, createdAt: 0, deletedAt: deletedAt);

void main() {
  final messages = [
    msg('a', 'me'),
    msg('b', 'x'),
    msg('c', 'y'),
    msg('d', 'me'),
    msg('e', 'x', deletedAt: 1),
    msg('f', 'x'),
  ];

  group('unreadMessageCount', () {
    test('counts other people\'s messages after the last seen one', () {
      expect(unreadMessageCount(messages, seenId: 'b', myMemberId: 'me'), 2); // c and f; d is mine, e is deleted
    });

    test('counts every message from others when nothing was seen yet', () {
      expect(unreadMessageCount(messages, seenId: null, myMemberId: 'me'), 3); // b, c, f
    });

    test('is zero when the newest message is the seen one', () {
      expect(unreadMessageCount(messages, seenId: 'f', myMemberId: 'me'), 0);
    });

    test('treats an unknown seen id as nothing seen', () {
      expect(unreadMessageCount(messages, seenId: 'gone', myMemberId: 'me'), 3);
    });
  });
}
