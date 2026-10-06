import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../core/platform/map_gateway.dart';
import '../../../core/flags/feature_flags.dart';
import '../../../data/repositories/supabase_location_share_repository.dart';
import '../../../domain/logic/trip_utilities.dart';
import '../../../domain/models/location_share.dart';
import '../../../domain/models/member.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_avatar.dart';

class LiveLocationChatBanner extends ConsumerStatefulWidget {
  const LiveLocationChatBanner({super.key, required this.tripId, required this.members, this.onShareMyLocation});

  final String tripId;
  final List<Member> members;
  final VoidCallback? onShareMyLocation;

  @override
  ConsumerState<LiveLocationChatBanner> createState() => _LiveLocationChatBannerState();
}

class _LiveLocationChatBannerState extends ConsumerState<LiveLocationChatBanner> {
  List<TripActiveShare> _shares = const [];
  String? _expandedMemberId;
  Timer? _pollTimer;

  static const Duration _pollInterval = Duration(seconds: 30);

  @override
  void initState() {
    super.initState();
    _fetchShares();
    _pollTimer = Timer.periodic(_pollInterval, (_) => _fetchShares());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchShares() async {
    final enabled = ref.read(featureFlagsProvider).isLiveLocationEnabled;
    if (!enabled) {
      return;
    }
    try {
      final repo = ref.read(locationShareRepositoryProvider);
      final shares = await repo.getActiveTripLocationShares(widget.tripId);
      if (mounted) {
        setState(() {
          _shares = shares;
          if (_expandedMemberId != null && !shares.any((s) => s.memberId == _expandedMemberId)) {
            _expandedMemberId = null;
          }
        });
      }
    } catch (_) {}
  }

  Member? _findMember(String memberId) {
    try {
      return widget.members.firstWhere((m) => m.id == memberId);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final shares = _shares;

    if (shares.isEmpty && widget.onShareMyLocation == null) {
      return const SizedBox.shrink();
    }

    final expandedShare = shares.where((s) => s.memberId == _expandedMemberId).firstOrNull;
    final mapGateway = ref.watch(mapGatewayProvider);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: tokens.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tokens.borderColor.withValues(alpha: 0.6)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: tokens.colorSuccess.withValues(alpha: 0.12), shape: BoxShape.circle),
                  child: Icon(AppIcons.location, size: 16, color: tokens.colorSuccess),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(color: tokens.colorSuccess, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              shares.isEmpty
                                  ? 'Live Location Radar'
                                  : '${shares.length} ${shares.length == 1 ? "member" : "members"} sharing live location',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (shares.isNotEmpty)
                        Text(
                          'Tap a traveler to see live position',
                          style: TextStyle(fontSize: 11, color: tokens.textSecondary),
                        ),
                    ],
                  ),
                ),
                if (widget.onShareMyLocation != null)
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () {
                      AppHaptics.selection();
                      widget.onShareMyLocation!();
                    },
                    icon: Icon(AppIcons.location, size: 14, color: tokens.primaryAccent),
                    label: Text(
                      'Share Mine',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.primaryAccent),
                    ),
                  ),
              ],
            ),
          ),
          if (shares.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  for (final share in shares) ...[_buildMemberChip(context, tokens, share)],
                ],
              ),
            ),
          ],
          if (expandedShare != null) ...[
            ClipRRect(
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
              child: SizedBox(
                height: 180,
                child: mapGateway.buildMap(
                  context: context,
                  initialLat: expandedShare.lat,
                  initialLng: expandedShare.lng,
                  initialZoom: 13.5,
                  markers: [
                    MapMarker(
                      id: expandedShare.memberId,
                      lat: expandedShare.lat,
                      lng: expandedShare.lng,
                      title: _findMember(expandedShare.memberId)?.name ?? 'Traveler',
                      subtitle: 'Updated ${formatRelativeTime(expandedShare.updatedAt)}',
                      color: tokens.primaryAccent,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMemberChip(BuildContext context, AppTokens tokens, TripActiveShare share) {
    final member = _findMember(share.memberId);
    final isSelected = _expandedMemberId == share.memberId;
    final name = member?.name ?? 'Traveler';

    return InkWell(
      onTap: () {
        AppHaptics.selection();
        setState(() {
          _expandedMemberId = isSelected ? null : share.memberId;
        });
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.fromLTRB(4, 4, 10, 4),
        decoration: BoxDecoration(
          color: isSelected ? tokens.primaryAccent.withValues(alpha: 0.15) : tokens.borderColor.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? tokens.primaryAccent : tokens.borderColor.withValues(alpha: 0.4)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppAvatar(name: name, size: 20),
            const SizedBox(width: 6),
            Text(
              name,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? tokens.primaryAccent : tokens.textPrimary,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              isSelected ? AppIcons.close : AppIcons.location,
              size: 12,
              color: isSelected ? tokens.primaryAccent : tokens.textMuted,
            ),
          ],
        ),
      ),
    );
  }
}
