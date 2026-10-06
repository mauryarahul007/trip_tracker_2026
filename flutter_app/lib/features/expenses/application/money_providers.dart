import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/env/app_env.dart';
import '../../../core/network/connectivity_provider.dart';
import '../../../core/storage/prefs.dart';
import '../../../data/providers.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../domain/logic/currency.dart';
import '../../../domain/logic/exchange_rates.dart';
import '../../../domain/models/trip.dart';

final rateFetchProvider = Provider<RateFetcher>((ref) => fetchFrankfurterUsd);

/// USD-based rates for the expense form. Falls back to [defaultExchangeRates].
final liveUsdRatesProvider = FutureProvider<Map<String, double>>((ref) async {
  final prefs = ref.watch(sharedPreferencesProvider);
  final online = ref.watch(isOnlineProvider).value ?? false;
  return loadExchangeRates(
    cachedJson: prefs.getString(fxCacheKey),
    writeCache: (json) => prefs.setString(fxCacheKey, json),
    online: online,
    fetch: ref.watch(rateFetchProvider),
  );
});

Map<String, double> liveRatesOf(WidgetRef ref) => ref.watch(liveUsdRatesProvider).value ?? defaultExchangeRates;

const _upiPrefix = 'member_upi:';

String? savedUpiId(WidgetRef ref, String memberId) => ref.watch(sharedPreferencesProvider).getString('$_upiPrefix$memberId');

Future<void> saveUpiId(WidgetRef ref, String memberId, String upiId) =>
    ref.read(sharedPreferencesProvider).setString('$_upiPrefix$memberId', upiId.trim());

/// Local file path, or an https URL, for a receipt preview. Null when neither exists.
final receiptPreviewProvider = FutureProvider.family<String?, (String, String?)>((ref, key) async {
  final local = await ref.watch(receiptStoreProvider).pendingLocalPath(key.$1);
  if (local != null) return local;
  final remote = key.$2;
  if (remote == null || remote.isEmpty) return null;
  if (remote.startsWith('http') || remote.startsWith('/') || remote.startsWith('file:')) return remote;
  if (!AppEnv.current.hasBackend) return null;
  try {
    return await ref.read(supabaseGatewayProvider).client.storage.from('receipts').createSignedUrl(remote, 60 * 60);
  } catch (_) {
    return null;
  }
});

Future<Map<String, double>?> fetchFrankfurterUsd() async {
  final client = HttpClient();
  try {
    final req = await client.getUrl(Uri.parse('https://api.frankfurter.app/latest?from=USD')).timeout(const Duration(seconds: 8));
    final res = await req.close().timeout(const Duration(seconds: 8));
    if (res.statusCode != 200) return null;
    final body = await res.transform(utf8.decoder).join();
    final json = jsonDecode(body);
    if (json is! Map || json['rates'] is! Map) return null;
    final rates = <String, double>{'USD': 1};
    for (final e in (json['rates'] as Map).entries) {
      if (e.value is num) rates[e.key.toString().toUpperCase()] = (e.value as num).toDouble();
    }
    return rates;
  } catch (_) {
    return null;
  } finally {
    client.close(force: true);
  }
}

/// Every non-archived trip, for the cross-trip line on the ledger.
final allTripsProvider = StreamProvider<List<Trip>>((ref) => ref.watch(tripRepositoryProvider).watchTrips());
