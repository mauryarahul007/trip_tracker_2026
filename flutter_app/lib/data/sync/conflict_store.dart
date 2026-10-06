import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/logic/sync_merge.dart';

/// Latest per-trip sync conflicts reported by the pull sync (dirty local edit
/// vs a different server version). The resolver UI reads this; entries clear
/// when a later pull finds no conflict for the trip.
class ConflictStore extends Notifier<Map<String, List<ExpenseConflict>>> {
  @override
  Map<String, List<ExpenseConflict>> build() => const {};

  void setForTrip(String tripId, List<ExpenseConflict> conflicts) {
    final next = {...state};
    if (conflicts.isEmpty) {
      next.remove(tripId);
    } else {
      next[tripId] = conflicts;
    }
    state = next;
  }
}

final conflictStoreProvider = NotifierProvider<ConflictStore, Map<String, List<ExpenseConflict>>>(ConflictStore.new);
