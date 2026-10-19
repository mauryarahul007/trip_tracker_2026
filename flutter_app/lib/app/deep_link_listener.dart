import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/links/signup_attribution.dart';
import '../data/providers.dart' show flagProvider;
import '../domain/logic/deep_links.dart';
import '../domain/logic/latest_trip.dart';
import '../domain/models/trip.dart';
import '../features/trips/application/trips_providers.dart' show tripsProvider;
import 'router.dart';

/// Incoming links: the one that launched the app plus any while it runs.
abstract class DeepLinkSource {
  Future<Uri?> initial();
  Stream<Uri> get stream;
}

class AppLinksSource implements DeepLinkSource {
  final _links = AppLinks();
  @override
  Future<Uri?> initial() => _links.getInitialLink();
  @override
  Stream<Uri> get stream => _links.uriLinkStream;
}

final deepLinkSourceProvider = Provider<DeepLinkSource>((ref) => AppLinksSource());

/// Routes join/share/live/reset-password links into the router and records
/// attribution. Signed-out users land on the public screens; the auth
/// redirect never swallows them.
class DeepLinkListener extends ConsumerStatefulWidget {
  const DeepLinkListener({required this.child, super.key});
  final Widget child;

  @override
  ConsumerState<DeepLinkListener> createState() => _DeepLinkListenerState();
}

class _DeepLinkListenerState extends ConsumerState<DeepLinkListener> {
  StreamSubscription<Uri>? _sub;

  @override
  void initState() {
    super.initState();
    final source = ref.read(deepLinkSourceProvider);
    unawaited(
      source
          .initial()
          .then((u) {
            if (u != null) _handle(u);
          })
          .catchError((Object _) {}),
    );
    _sub = source.stream.listen(_handle, onError: (Object _) {});
  }

  void _handle(Uri uri) {
    final target = routeForDeepLink(uri);
    if (target == null || !mounted) return;
    if (target.location.startsWith('/shortcut/')) {
      unawaited(_shortcut(target.location.substring('/shortcut/'.length)));
      return;
    }
    unawaited(ref.read(signupAttributionStoreProvider).captureIfFirst(target.attribution));
    ref.read(routerProvider).go(target.location);
  }

  /// The current value of [provider] if it has one, else the first value it emits within [wait] (cold start).
  Future<T?> _valueOf<T>(StreamProvider<T> provider, {Duration wait = const Duration(seconds: 3)}) {
    final now = ref.read(provider);
    if (now.hasValue) return Future.value(now.value);
    final done = Completer<T?>();
    late final ProviderSubscription<AsyncValue<T>> sub;
    sub = ref.listenManual(provider, (_, next) {
      if (next.hasValue && !done.isCompleted) done.complete(next.value);
    });
    return done.future.timeout(wait, onTimeout: () => null).whenComplete(sub.close);
  }

  /// Icon shortcuts: open the latest trip, or its Add expense form. With no trip (or the flag off) just the home screen.
  Future<void> _shortcut(String action) async {
    final router = ref.read(routerProvider);
    final on = await _valueOf(flagProvider(('enableAppShortcuts', null)), wait: const Duration(seconds: 1)) ?? true;
    final trips = on ? (await _valueOf(tripsProvider) ?? const <Trip>[]) : const <Trip>[];
    if (!mounted) return;
    final id = on ? latestTripId(trips, DateTime.now()) : null;
    if (id == null) {
      router.go('/');
      return;
    }
    router.go('/trip/$id/ledger');
    if (action == 'add-expense') unawaited(router.push<void>('/trip/$id/expenses/new'));
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
