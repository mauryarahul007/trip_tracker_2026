import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/links/signup_attribution.dart';
import '../domain/logic/deep_links.dart';
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
    unawaited(source.initial().then((u) {
      if (u != null) _handle(u);
    }).catchError((Object _) {}));
    _sub = source.stream.listen(_handle, onError: (Object _) {});
  }

  void _handle(Uri uri) {
    final target = routeForDeepLink(uri);
    if (target == null || !mounted) return;
    unawaited(ref.read(signupAttributionStoreProvider).captureIfFirst(target.attribution));
    ref.read(routerProvider).go(target.location);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
