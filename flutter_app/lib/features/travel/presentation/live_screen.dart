import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/clock.dart';
import '../../../core/platform/motion.dart';
import '../../../data/providers.dart' show flagProvider;
import '../../../domain/logic/flag_defaults.g.dart' show defaultFeatureFlags;

import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/platform/map_gateway.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/repositories/supabase_location_share_repository.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/location_share.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';

class LiveScreen extends ConsumerStatefulWidget {
  const LiveScreen({super.key, required this.token});

  final String token;

  @override
  ConsumerState<LiveScreen> createState() => _LiveScreenState();
}

class _LiveScreenState extends ConsumerState<LiveScreen> with SingleTickerProviderStateMixin {
  SharedLocation? _location;
  bool _isLoading = true;
  bool _isEnded = false;
  bool _loadError = false;
  Timer? _pollTimer;
  Timer? _ageTimer;

  /// When the last poll succeeded (`enableLiveLocationStaleAge`). A failed poll leaves it alone, so the age keeps
  /// growing while we show the last known position.
  DateTime? _lastPollAt;
  late final AnimationController _pulseController;

  static const Duration _pollInterval = Duration(seconds: 20);

  /// Past this without a successful poll the age is shown as a warning (two missed polls plus a margin).
  static const Duration _staleAfter = Duration(seconds: 90);

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2), value: 1);
    _fetch();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _fetch());
    // Re-render the relative age between polls ("just now" becoming "1m ago").
    _ageTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && _lastPollAt != null) setState(() {});
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Reduce motion: the dot stays solid instead of pulsing forever.
    final still = AppMotion.reduce || MediaQuery.disableAnimationsOf(context);
    if (still) {
      _pulseController.stop();
      _pulseController.value = 1;
    } else if (!_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _ageTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    if (widget.token.isEmpty) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isEnded = true;
        });
      }
      return;
    }
    try {
      final repo = ref.read(locationShareRepositoryProvider);
      final loc = await repo.getSharedLocation(widget.token);
      if (!mounted) {
        return;
      }
      _lastPollAt = ref.read(nowProvider)();
      if (loc == null || loc.isExpired) {
        setState(() {
          _location = null;
          _isLoading = false;
          _isEnded = true;
        });
      } else {
        setState(() {
          _location = loc;
          _isLoading = false;
          _isEnded = false;
          _loadError = false;
        });
      }
    } catch (_) {
      // A failed fetch is not "ended": keep the last known position if we have one, otherwise offer a retry.
      if (mounted && _location == null) {
        setState(() {
          _isLoading = false;
          _isEnded = false;
          _loadError = true;
        });
      }
    }
  }

  void _retry() {
    setState(() {
      _isLoading = true;
      _loadError = false;
    });
    _fetch();
  }

  Future<void> _openExternalMap(double lat, double lng, String label) async {
    final launcher = ref.read(externalLauncherProvider);
    await AppHaptics.selection();
    final geoUri = Uri.parse('geo:$lat,$lng?q=$lat,$lng($label)');
    final webUri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    final opened = await launcher(geoUri);
    if (!opened) {
      await launcher(webUri);
    }
  }

  void _shareLink() {
    final share = ref.read(shareServiceProvider);
    AppHaptics.selection();
    final url = 'https://trip-tracker.blackmaroon.in/live/${widget.token}';
    share.share('My live location: $url', subject: 'Trip Tracker · Live location');
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final loc = _location;

    return AppScaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Trip Tracker · Live location',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: tokens.textSecondary,
                letterSpacing: 0.5,
              ),
            ),
            if (loc != null)
              Text(
                '${loc.memberName} · ${loc.tripName}',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        actions: [
          if (loc != null)
            IconButton(icon: const Icon(AppIcons.share, size: 20), tooltip: 'Share link', onPressed: _shareLink),
        ],
      ),
      body: _buildBody(context, tokens),
    );
  }

  Widget _buildBody(BuildContext context, AppTokens tokens) {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: tokens.primaryAccent),
            const SizedBox(height: 16),
            Text('Connecting to live radar...', style: TextStyle(fontSize: 14, color: tokens.textSecondary)),
          ],
        ),
      );
    }

    // Network / server failure: not the same as an ended share, so say so and let the viewer retry.
    if (_loadError && !_isEnded && _location == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: tokens.colorWarning.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(Icons.wifi_off_rounded, size: 36, color: tokens.colorWarning),
              ),
              const SizedBox(height: 20),
              Text(
                "Couldn't load live location",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: tokens.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                'Check your connection and try again. The share may still be live.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: tokens.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 24),
              AppButton(
                key: const Key('live-retry'),
                label: 'Retry',
                icon: Icons.refresh_rounded,
                variant: AppButtonVariant.primary,
                onPressed: _retry,
              ),
            ],
          ),
        ),
      );
    }

    if (_isEnded || _location == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: tokens.textMuted.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(AppIcons.location, size: 36, color: tokens.textMuted),
              ),
              const SizedBox(height: 20),
              Text(
                'Live Location Ended',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: tokens.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                'This live location share has ended or expired. The traveler is no longer sharing their position.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: tokens.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 24),
              AppButton(label: 'Back to Trips', variant: AppButtonVariant.primary, onPressed: () => context.go('/')),
            ],
          ),
        ),
      );
    }

    final loc = _location!;
    final mapGateway = ref.watch(mapGatewayProvider);
    // Flag ON: "Updated Xm ago" from last successful poll (warns when polls go stale). Flag OFF: no age line.
    final staleAgeOn =
        ref.watch(flagProvider(('enableLiveLocationStaleAge', null))).value ??
        (defaultFeatureFlags['enableLiveLocationStaleAge'] ?? false);
    final now = ref.read(nowProvider)();
    final polledAt = _lastPollAt;
    final showPollAge = staleAgeOn && polledAt != null;
    final pollAge = showPollAge ? now.difference(polledAt) : Duration.zero;
    final relativeTime = showPollAge
        ? formatRelativeTime(polledAt.millisecondsSinceEpoch, now.millisecondsSinceEpoch)
        : null;
    final isStale = showPollAge && pollAge >= _staleAfter;

    return Stack(
      children: [
        Positioned.fill(
          child: mapGateway.buildMap(
            context: context,
            initialLat: loc.lat,
            initialLng: loc.lng,
            initialZoom: 14.5,
            markers: [
              MapMarker(
                id: 'live_member',
                lat: loc.lat,
                lng: loc.lng,
                title: loc.memberName,
                subtitle: 'Live',
                color: tokens.primaryAccent,
              ),
            ],
          ),
        ),
        // Bottom status card (board 06 #8): who is sharing, freshness, and a primary Open in Maps.
        Positioned(
          bottom: 24,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: tokens.bgSurface.withValues(alpha: 0.94),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: tokens.borderColor.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 16, offset: const Offset(0, 4)),
              ],
            ),
            child: Row(
              children: [
                AppAvatar(name: loc.memberName, size: 40),
                const SizedBox(width: 12),
                RepaintBoundary(
                  child: AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      final scale = 0.8 + (_pulseController.value * 0.4);
                      return Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: tokens.colorSuccess,
                          boxShadow: [
                            BoxShadow(
                              color: tokens.colorSuccess.withValues(alpha: 0.6 * _pulseController.value),
                              blurRadius: 8 * scale,
                              spreadRadius: 2 * scale,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Text(
                            'LIVE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: tokens.colorSuccess,
                              letterSpacing: 0.8,
                            ),
                          ),
                          if (showPollAge && relativeTime != null) ...[
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                '· Updated $relativeTime',
                                key: const Key('live-updated'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isStale ? tokens.colorWarning : tokens.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      Text(
                        '${loc.lat.toStringAsFixed(4)}°, ${loc.lng.toStringAsFixed(4)}°',
                        style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: tokens.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton.filled(
                  style: IconButton.styleFrom(backgroundColor: tokens.primaryAccent),
                  icon: const Icon(Icons.open_in_new_rounded, size: 20),
                  tooltip: 'Open in Maps',
                  onPressed: () => _openExternalMap(loc.lat, loc.lng, loc.memberName),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
