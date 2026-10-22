import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../domain/logic/flag_defaults.g.dart';

/// The Compass redesign flags (Superadmin Ops Deck). Each gates one surface; OFF keeps today's screen.
const compassNavFlag = 'enableCompassNav';
const compassSpendFlag = 'enableCompassSpend';
const compassMoneyFlag = 'enableCompassMoney';
const compassTripPagesFlag = 'enableCompassTripPages';
const compassMeFlag = 'enableCompassMe';
const compassWebFlag = 'enableCompassWeb';

/// `(flag key, trip id)`: pass the trip id inside a trip so per-trip overrides apply, null elsewhere.
/// Falls back to the registry default while flags load so a screen never flickers between layouts.
final compassFlagProvider = Provider.family<bool, (String, String?)>(
  (ref, k) => ref.watch(flagProvider(k)).value ?? (defaultFeatureFlags[k.$1] ?? false),
);

/// Global (no trip) navigation flag: the Trips home dock.
final compassNavProvider = Provider<bool>((ref) => ref.watch(compassFlagProvider((compassNavFlag, null))));
