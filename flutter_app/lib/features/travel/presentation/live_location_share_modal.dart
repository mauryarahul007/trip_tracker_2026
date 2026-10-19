import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../core/platform/location_gateway.dart';
import '../../../core/platform/share_service.dart';
import '../../../data/repositories/supabase_location_share_repository.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/location_share.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../application/live_location_service.dart';

class LiveLocationShareModal extends ConsumerStatefulWidget {
  const LiveLocationShareModal({super.key, required this.tripId, required this.memberId, required this.userId});

  final String tripId;
  final String memberId;
  final String userId;

  static Future<void> show(
    BuildContext context, {
    required String tripId,
    required String memberId,
    required String userId,
  }) {
    return AppSheet.show<void>(
      context: context,
      builder: (ctx) => LiveLocationShareModal(tripId: tripId, memberId: memberId, userId: userId),
    );
  }

  @override
  ConsumerState<LiveLocationShareModal> createState() => _LiveLocationShareModalState();
}

class _LiveLocationShareModalState extends ConsumerState<LiveLocationShareModal> {
  MyLocationShare? _share;
  bool _isLoading = true;
  bool _isBusy = false;
  String? _errorMessage;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _loadShare();
  }

  Future<void> _loadShare() async {
    try {
      final repo = ref.read(locationShareRepositoryProvider);
      final share = await repo.getMyLocationShare(widget.tripId);
      if (mounted) {
        setState(() {
          _share = share;
          _isLoading = false;
        });
        if (share != null && share.isActive) {
          ref.read(liveLocationServiceProvider).startHeartbeat(widget.tripId);
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleStartSharing() async {
    final locationGateway = ref.read(locationGatewayProvider);
    final repo = ref.read(locationShareRepositoryProvider);
    final heartbeat = ref.read(liveLocationServiceProvider);

    setState(() {
      _isBusy = true;
      _errorMessage = null;
    });

    try {
      final serviceEnabled = await locationGateway.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _errorMessage = 'Location services are disabled on your device. Please turn on GPS.';
          _isBusy = false;
        });
        return;
      }

      var perm = await locationGateway.checkPermission();
      if (perm == LocationPermissionStatus.denied) {
        perm = await locationGateway.requestPermission();
      }

      if (perm == LocationPermissionStatus.deniedForever) {
        setState(() {
          _errorMessage =
              'Location permissions are permanently denied. Please grant location access in device Settings.';
          _isBusy = false;
        });
        return;
      }

      if (!perm.hasPermission) {
        setState(() {
          _errorMessage = 'Location permission is required to share your live location with trip members.';
          _isBusy = false;
        });
        return;
      }

      final pos = await locationGateway.getCurrentPosition();
      if (pos == null) {
        setState(() {
          _errorMessage = 'Unable to determine GPS location. Please check signal and try again.';
          _isBusy = false;
        });
        return;
      }

      final share = await repo.startLocationShare(
        tripId: widget.tripId,
        memberId: widget.memberId,
        userId: widget.userId,
        lat: pos.lat,
        lng: pos.lng,
      );

      heartbeat.startHeartbeat(widget.tripId);
      unawaited(AppHaptics.success());

      if (mounted) {
        setState(() {
          _share = share;
          _isBusy = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to start live location sharing. Please try again.';
          _isBusy = false;
        });
      }
    }
  }

  Future<void> _handleStopSharing() async {
    final repo = ref.read(locationShareRepositoryProvider);
    final heartbeat = ref.read(liveLocationServiceProvider);

    setState(() {
      _isBusy = true;
      _errorMessage = null;
    });

    try {
      await repo.stopLocationShare(widget.tripId);
      heartbeat.stopHeartbeat(widget.tripId);
      unawaited(AppHaptics.medium());

      if (mounted) {
        setState(() {
          _share = MyLocationShare(isSharing: false, shareToken: _share?.shareToken, expiresAt: _share?.expiresAt);
          _isBusy = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to stop sharing. Please check your network connection.';
          _isBusy = false;
        });
      }
    }
  }

  String _buildShareUrl(String token) {
    return 'https://trip-tracker.blackmaroon.in/live/$token';
  }

  Future<void> _copyLink(String url) async {
    await AppHaptics.selection();
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      setState(() => _copied = true);
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() => _copied = false);
        }
      });
    }
  }

  void _shareLink(String url) {
    final share = ref.read(shareServiceProvider);
    AppHaptics.selection();
    share.share('Track my live location: $url', subject: 'Trip Tracker · Live location');
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isSharing = _share?.isActive ?? false;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: isSharing
                    ? tokens.colorSuccess.withValues(alpha: 0.14)
                    : tokens.primaryAccent.withValues(alpha: 0.14),
                shape: BoxShape.circle,
              ),
              child: Icon(AppIcons.location, size: 30, color: isSharing ? tokens.colorSuccess : tokens.primaryAccent),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Live Location Sharing',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: tokens.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            isSharing ? 'Active · Broadcast to trip squad' : 'Share your real-time position',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: tokens.textSecondary),
          ),
          const SizedBox(height: 16),
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: tokens.colorDanger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: tokens.colorDanger.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.alert, size: 18, color: tokens.colorDanger),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_errorMessage!, style: TextStyle(fontSize: 13, color: tokens.colorDanger)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (isSharing) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: tokens.colorSuccess.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: tokens.colorSuccess.withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(color: tokens.colorSuccess, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'YOU ARE CURRENTLY SHARING',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: tokens.colorSuccess,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Trip members can see your live location on the trip map and in chat.',
                    style: TextStyle(fontSize: 13, color: tokens.textSecondary, height: 1.3),
                  ),
                  if (_share?.expiresAt != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Expires: ${formatRelativeTime(_share!.expiresAt!)}',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.textMuted),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_share?.shareToken != null) ...[
              Row(
                children: [
                  Expanded(
                    child: AppButton(
                      label: _copied ? 'Copied Link!' : 'Copy Link',
                      icon: AppIcons.copy,
                      variant: AppButtonVariant.secondary,
                      onPressed: () => _copyLink(_buildShareUrl(_share!.shareToken!)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: AppButton(
                      label: 'Share...',
                      icon: AppIcons.share,
                      variant: AppButtonVariant.secondary,
                      onPressed: () => _shareLink(_buildShareUrl(_share!.shareToken!)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            AppButton(
              label: 'Stop Sharing Location',
              icon: AppIcons.close,
              variant: AppButtonVariant.danger,
              isLoading: _isBusy,
              onPressed: _handleStopSharing,
            ),
          ] else ...[
            for (final r in const [
              (Icons.visibility_outlined, 'Only active trip squad members can see your position'),
              (Icons.schedule_rounded, 'Automatically expires after 12 hours'),
              (Icons.battery_charging_full_rounded, 'Low-frequency 60s heartbeat protects battery life'),
              (Icons.lock_outline_rounded, 'Stop sharing at any time with one tap'),
            ])
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Icon(r.$1, size: 18, color: tokens.primaryAccent),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(r.$2, style: TextStyle(fontSize: 13.5, color: tokens.textSecondary, height: 1.35)),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 20),
            AppButton(
              label: 'Start Sharing Live Location',
              icon: AppIcons.location,
              variant: AppButtonVariant.primary,
              isLoading: _isBusy,
              onPressed: _handleStartSharing,
            ),
          ],
        ],
      ),
    );
  }
}
