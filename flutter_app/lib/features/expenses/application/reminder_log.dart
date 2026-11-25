import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs.dart';
import '../../../data/providers.dart' show flagProvider;

/// Flag `enableReminderStatus`: when I last sent a settle-up reminder to each person, kept on this phone only
/// (not synced, not shown to anyone else). Keyed by the person's name, lowercased, so the per-trip Settle up
/// list and the cross-trip All balances list share one record.
class ReminderLogNotifier extends Notifier<Map<String, int>> {
  static const _key = 'settle.reminded';

  static String keyFor(String name) => name.trim().toLowerCase();

  @override
  Map<String, int> build() {
    final raw = ref.read(sharedPreferencesProvider).getString(_key);
    if (raw == null) return const {};
    try {
      return {for (final e in (jsonDecode(raw) as Map).entries) '${e.key}': (e.value as num).toInt()};
    } catch (_) {
      return const {};
    }
  }

  /// Records a reminder to each name, only while the flag is on.
  Future<void> record(Iterable<String> names, {DateTime? now}) async {
    if (!(ref.read(flagProvider(('enableReminderStatus', null))).value ?? false)) return;
    final at = (now ?? DateTime.now()).millisecondsSinceEpoch;
    state = {...state, for (final n in names) keyFor(n): at};
    await ref.read(sharedPreferencesProvider).setString(_key, jsonEncode(state));
  }
}

final reminderLogProvider = NotifierProvider<ReminderLogNotifier, Map<String, int>>(ReminderLogNotifier.new);

/// "Reminded today", "Reminded yesterday", "Reminded 3d ago"; null when never reminded.
String? remindedLabel(Map<String, int> log, String name, {DateTime? now}) {
  final at = log[ReminderLogNotifier.keyFor(name)];
  if (at == null) return null;
  final n = now ?? DateTime.now();
  final then = DateTime.fromMillisecondsSinceEpoch(at);
  final days = DateTime(n.year, n.month, n.day).difference(DateTime(then.year, then.month, then.day)).inDays;
  if (days <= 0) return 'Reminded today';
  if (days == 1) return 'Reminded yesterday';
  return 'Reminded ${days}d ago';
}

/// One share message for everyone who owes me (flag `enableRemindEveryone`).
String remindEveryoneMessage(List<(String name, String amount)> owed) {
  final lines = [for (final (n, a) in owed) '• $n: $a'];
  return 'Hi all, a gentle reminder of what is still open from our trips:\n${lines.join('\n')}\n'
      'Settle up whenever you can. Sent from Trip Tracker.';
}
