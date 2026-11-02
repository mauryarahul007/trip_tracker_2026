import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/models/trip_message.dart';
import '../../expenses/application/expenses_providers.dart';

final tripMessagesProvider = StreamProvider.family<List<TripMessage>, String>(
  (ref, tripId) => ref.watch(messageRepositoryProvider).watch(tripId),
);

class ChatSeen extends Notifier<String?> {
  ChatSeen(this.tripId);
  final String tripId;

  @override
  String? build() => ref.read(sharedPreferencesProvider).getString('chatSeen:$tripId');

  void mark(String id) {
    ref.read(sharedPreferencesProvider).setString('chatSeen:$tripId', id);
    state = id;
  }
}

final chatSeenProvider = NotifierProvider.family<ChatSeen, String?, String>(ChatSeen.new);

TripMessage? latestVisible(List<TripMessage> messages) {
  for (var i = messages.length - 1; i >= 0; i--) {
    if (messages[i].deletedAt == null) return messages[i];
  }
  return null;
}

/// True when someone else posted after the last time this device opened chat.
final chatUnreadProvider = Provider.family<bool, String>((ref, tripId) {
  final on =
      ref.watch(flagProvider(('enableTripChat', tripId))).value ?? (defaultFeatureFlags['enableTripChat'] ?? false);
  if (!on) return false;
  final latest = latestVisible(ref.watch(tripMessagesProvider(tripId)).value ?? const []);
  if (latest == null) return false;
  if (latest.memberId == ref.watch(myMemberIdProvider(tripId))) return false;
  return latest.id != ref.watch(chatSeenProvider(tripId));
});

/// Messages from other people after the last one this device has seen (all of theirs when nothing is marked seen).
int unreadMessageCount(List<TripMessage> messages, {required String? seenId, required String? myMemberId}) {
  final seenAt = seenId == null ? -1 : messages.indexWhere((m) => m.id == seenId);
  var count = 0;
  for (var i = seenAt + 1; i < messages.length; i++) {
    final m = messages[i];
    if (m.deletedAt == null && m.memberId != myMemberId) count++;
  }
  return count;
}

/// The number behind [chatUnreadProvider], shown on the Chat tab when `enableNavPolish` is on.
final chatUnreadCountProvider = Provider.family<int, String>((ref, tripId) {
  if (!ref.watch(chatUnreadProvider(tripId))) return 0;
  return unreadMessageCount(
    ref.watch(tripMessagesProvider(tripId)).value ?? const [],
    seenId: ref.watch(chatSeenProvider(tripId)),
    myMemberId: ref.watch(myMemberIdProvider(tripId)),
  );
});
