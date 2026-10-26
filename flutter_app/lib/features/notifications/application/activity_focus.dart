import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Where an Activity tap should land: a chat message or an expense detail. The destination screen reads it
/// once and clears it.
typedef ActivityFocus = ({String kind, String id});

class _Slot<T> extends Notifier<T?> {
  @override
  T? build() => null;
  void set(T? v) => state = v;
}

final activityFocusProvider = NotifierProvider<_Slot<ActivityFocus>, ActivityFocus?>(_Slot<ActivityFocus>.new);

/// Set by "See in Activity": the Activity tab then lists only rows about this expense id.
final activityOnlyProvider = NotifierProvider<_Slot<String>, String?>(_Slot<String>.new);
