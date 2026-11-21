import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../expenses/application/expenses_providers.dart';
import 'trip_nav.dart';

/// Warm the trip's local streams before the shell route paints, so Summary opens on data instead of a skeleton blink.
/// Safe to call from a list tap: providers are cached; a miss just starts the watch early.
void prefetchTrip(WidgetRef ref, String tripId) {
  ref.read(tripProvider(tripId));
  ref.read(tripExpensesProvider(tripId));
  ref.read(tripMembersProvider(tripId));
  ref.read(tripSettlementProvider(tripId));
  ref.read(visibleTabsProvider(tripId));
}
