import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs.dart';

/// A trip budget kept on this device only (not synced, not shared with other members). 0 = none set.
class TripBudgetNotifier extends Notifier<double> {
  TripBudgetNotifier(this.tripId);
  final String tripId;

  String get _key => 'trip.budget.$tripId';

  @override
  double build() => ref.read(sharedPreferencesProvider).getDouble(_key) ?? 0;

  Future<void> set(double value) async {
    state = value;
    final p = ref.read(sharedPreferencesProvider);
    if (value <= 0) {
      await p.remove(_key);
    } else {
      await p.setDouble(_key, value);
    }
  }
}

final tripBudgetProvider = NotifierProvider.family<TripBudgetNotifier, double, String>(TripBudgetNotifier.new);
