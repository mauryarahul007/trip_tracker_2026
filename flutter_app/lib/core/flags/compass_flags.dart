import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../domain/logic/flag_defaults.g.dart';

/// The Compass redesign flags (Superadmin Ops Deck). Each gates one surface; OFF keeps today's screen.
const compassNavFlag = 'enableCompassNav';
const compassSpendFlag = 'enableCompassSpend';
const compassMoneyFlag = 'enableCompassMoney';
const compassTripPagesFlag = 'enableCompassTripPages';
const tripPollsFlag = 'enableTripPolls';
const guestJoinFlag = 'enableGuestJoin';
const compassMeFlag = 'enableCompassMe';
const compassWebFlag = 'enableCompassWeb';
const calmPassportFlag = 'enableCalmPassportUi';

/// `(flag key, trip id)`: pass the trip id inside a trip so per-trip overrides apply, null elsewhere.
/// Falls back to the registry default while flags load so a screen never flickers between layouts.
final compassFlagProvider = Provider.family<bool, (String, String?)>((ref, k) {
  if (retiredNavFlags.contains(k.$1) && !ref.watch(legacyNavAllowedProvider)) return true;
  return ref.watch(flagProvider(k)).value ?? (defaultFeatureFlags[k.$1] ?? false);
});

/// Navigation flags the app no longer reads: one trip and home navigation ships (Calm Passport layout on the Compass
/// dock), and `enableChatFirstNav` no longer moves Chat. They stay registered for the web app and the Ops Deck, but
/// always read ON here.
const retiredNavFlags = {compassNavFlag, calmPassportFlag};

/// False in the app: the retired navigation flags are ignored. The older widget tests that still drive the legacy
/// and Compass docks override this to true until they are moved to the Calm Passport layout.
final legacyNavAllowedProvider = Provider<bool>((ref) => false);

/// Global (no trip) navigation flag: the Trips home dock.
final compassNavProvider = Provider<bool>((ref) => ref.watch(compassFlagProvider((compassNavFlag, null))));

/// Calm Passport layout (flag `enableCalmPassportUi`): floating dock, 5-tab trip bar. The colours are Calm either
/// way; this only picks the layout. Per-trip overrides use [compassFlagProvider] with the trip id.
final calmPassportProvider = Provider<bool>((ref) => ref.watch(compassFlagProvider((calmPassportFlag, null))));
