import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/platform/external_launcher.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/platform/map_gateway.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/repositories/supabase_location_share_repository.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/location_share.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
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
  Timer? _pollTimer;
  late final AnimationController _pulseController;

  static const Duration _pollInterval = Duration(seconds: 20);

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _fetch();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _fetch());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
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
        });
      }
    } catch (_) {
      if (mounted && _location == null) {
        setState(() {
          _isLoading = false;
          _isEnded = true;
        });
      }
    }
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
    share.share(
      'My live location: $url',
      subject: 'Trip Tracker · Live location',
    );
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
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: tokens.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        leading: IconButton(
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
            IconButton(
              icon: const Icon(AppIcons.share, size: 20),
              tooltip: 'Share link',
              onPressed: _shareLink,
            ),
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
            Text(
              'Connecting to live radar...',
              style: TextStyle(fontSize: 14, color: tokens.textSecondary),
            ),
          ],
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
                decoration: BoxDecoration(
                  color: tokens.textMuted.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(AppIcons.location, size: 36, color: tokens.textMuted),
              ),
              const SizedBox(height: 20),
              Text(
                'Live Location Ended',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: tokens.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'This live location share has ended or expired. The traveler is no longer sharing their position.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: tokens.textSecondary, height: 1.4),
              ),
              const SizedBox(height: 24),
              AppButton(
                label: 'Back to Trips',
                variant: AppButtonVariant.primary,
                onPressed: () => context.go('/'),
              ),
            ],
          ),
        ),
      );
    }

    final loc = _location!;
    final mapGateway = ref.watch(mapGatewayProvider);
    final relativeTime = formatRelativeTime(loc.updatedAt);

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
        // Top status chip floating card
        Positioned(
          top: 16,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: tokens.bgSurface.withValues(alpha: 0.94),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: tokens.borderColor.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                AnimatedBuilder(
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
                          const SizedBox(width: 6),
                          Text(
                            '· Updated $relativeTime',
                            style: TextStyle(
                              fontSize: 12,
                              color: tokens.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '${loc.lat.toStringAsFixed(4)}°, ${loc.lng.toStringAsFixed(4)}°',
                        style: TextStyle(
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: tokens.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
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
