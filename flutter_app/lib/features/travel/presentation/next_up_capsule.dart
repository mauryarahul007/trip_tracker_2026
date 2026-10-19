import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/travel_status_service.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/theme/app_tokens.dart';
import 'live_travel_status_modal.dart';
import 'pass_scanner_modal.dart';

DateTime? parsePassDateTime(String? dateStr) {
  if (dateStr == null || dateStr.trim().isEmpty) return null;
  final raw = dateStr.trim();
  final direct = DateTime.tryParse(raw);
  if (direct != null && raw.contains(':')) return direct;

  final parsedFlight = parseFlightDate(raw);
  if (parsedFlight != null &&
      parsedFlight.year != null &&
      parsedFlight.month != null &&
      parsedFlight.day != null) {
    if (parsedFlight.timeString != null) {
      final timeMatch = RegExp(r'(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?').firstMatch(parsedFlight.timeString!);
      if (timeMatch != null) {
        var h = int.parse(timeMatch.group(1)!);
        final m = int.parse(timeMatch.group(2)!);
        final ampm = timeMatch.group(3)?.toUpperCase();
        if (ampm == 'PM' && h < 12) h += 12;
        if (ampm == 'AM' && h == 12) h = 0;
        return DateTime(parsedFlight.year!, parsedFlight.month!, parsedFlight.day!, h, m);
      }
    }
    return DateTime(parsedFlight.year!, parsedFlight.month!, parsedFlight.day!);
  }
  return direct;
}

class ImminentPassTarget {
  const ImminentPassTarget({
    required this.pass,
    required this.status,
    required this.countdownText,
    required this.badgeColor,
    required this.diffHours,
    this.isCompleted = false,
    this.layoverInfo,
  });

  final TravelPass pass;
  final String status;
  final String countdownText;
  final Color badgeColor;
  final double diffHours;
  final bool isCompleted;
  final String? layoverInfo;
}

ImminentPassTarget? evaluateImminentPass(List<TravelPass> passes, [DateTime? referenceNow]) {
  if (passes.isEmpty) return null;
  final now = referenceNow ?? DateTime.now();

  final activeCandidates = <ImminentPassTarget>[];
  final upcomingCandidates = <ImminentPassTarget>[];
  final completedCandidates = <({ImminentPassTarget target, double elapsedHours})>[];

  for (final pass in passes) {
    final startTime = parsePassDateTime(pass.startDateTime);
    if (startTime == null) continue;

    var endTime = parsePassDateTime(pass.endDateTime);
    if (endTime != null && endTime.isBefore(startTime)) {
      endTime = endTime.add(const Duration(days: 1));
    }

    final diffMs = startTime.difference(now).inMilliseconds;
    final diffHours = diffMs / (1000 * 60 * 60);
    final isFlight = pass.type.toLowerCase() == 'flight';

    final bool isCompleted;
    final bool isActive;
    final bool isUpcoming;
    final double elapsedHours;

    if (endTime != null) {
      isCompleted = now.isAfter(endTime) || now.isAtSameMomentAs(endTime);
      isActive = !isCompleted && (now.isAfter(startTime) || now.isAtSameMomentAs(startTime));
      isUpcoming = now.isBefore(startTime);
      elapsedHours = now.difference(endTime).inMilliseconds / (1000 * 60 * 60);
    } else {
      isCompleted = diffHours < -3.0;
      isActive = diffHours < 0 && diffHours >= -3.0;
      isUpcoming = diffHours >= 0;
      elapsedHours = -diffHours;
    }

    if (isActive) {
      final countdownText = isFlight ? 'En Route / Airborne' : 'In Transit / Active';
      activeCandidates.add(
        ImminentPassTarget(
          pass: pass,
          status: 'en-route',
          countdownText: countdownText,
          badgeColor: const Color(0xFF10B981),
          diffHours: diffHours,
        ),
      );
    } else if (isUpcoming && diffHours <= 36.0) {
      String status;
      String countdownText;
      Color badgeColor;

      if (diffHours <= 1.5) {
        status = 'boarding-soon';
        final mins = (diffMs / (1000 * 60)).round().clamp(1, 90);
        countdownText = 'Boarding in ${mins}m';
        badgeColor = const Color(0xFFEF4444);
      } else if (diffHours <= 24) {
        status = 'upcoming';
        final h = diffHours.floor();
        final m = ((diffHours - h) * 60).round();
        countdownText = m > 0 ? 'Departs in ${h}h ${m}m' : 'Departs in ${h}h';
        badgeColor = const Color(0xFF2563EB);
      } else {
        status = 'today';
        final parsedFlight = parseFlightDate(pass.startDateTime);
        final dStr = parsedFlight?.formattedDateString ?? pass.startDateTime!.split('T').first;
        countdownText = 'Tomorrow · $dStr';
        badgeColor = const Color(0xFF6366F1);
      }

      upcomingCandidates.add(
        ImminentPassTarget(
          pass: pass,
          status: status,
          countdownText: countdownText,
          badgeColor: badgeColor,
          diffHours: diffHours,
        ),
      );
    } else if (isCompleted && elapsedHours <= 3.0) {
      final countdownText = isFlight ? 'Landed / Arrived' : 'Completed / Arrived';
      completedCandidates.add((
        target: ImminentPassTarget(
          pass: pass,
          status: 'completed',
          countdownText: countdownText,
          badgeColor: const Color(0xFF64748B),
          diffHours: diffHours,
          isCompleted: true,
        ),
        elapsedHours: elapsedHours,
      ));
    }
  }

  // Priority 1: Currently active / underway leg (most recent departure first)
  if (activeCandidates.isNotEmpty) {
    activeCandidates.sort((a, b) => b.diffHours.compareTo(a.diffHours));
    return activeCandidates.first;
  }

  // Priority 2: Next upcoming leg (earliest departure first)
  if (upcomingCandidates.isNotEmpty) {
    upcomingCandidates.sort((a, b) => a.diffHours.compareTo(b.diffHours));
    final bestUpcoming = upcomingCandidates.first;

    // Detect if there's a recently completed predecessor pass that forms a layover connection
    String? layoverInfo;
    for (final c in completedCandidates) {
      final prevPass = c.target.pass;
      final prevEndTime = parsePassDateTime(prevPass.endDateTime);
      final nextStartTime = parsePassDateTime(bestUpcoming.pass.startDateTime);
      if (prevEndTime != null && nextStartTime != null && nextStartTime.isAfter(prevEndTime)) {
        final layoverMs = nextStartTime.difference(prevEndTime).inMilliseconds;
        final layoverHours = layoverMs / (1000 * 60 * 60);
        if (layoverHours > 0 && layoverHours <= 12) {
          final h = layoverHours.floor();
          final m = ((layoverHours - h) * 60).round();
          final layoverLocation = prevPass.destination ?? bestUpcoming.pass.origin ?? '';
          final locSuffix = layoverLocation.isNotEmpty ? ' at $layoverLocation' : '';
          final timeStr = m > 0 ? '${h}h ${m}m' : '${h}h';
          if (layoverHours <= 1.5) {
            layoverInfo = '⚠️ Tight Connection · $timeStr$locSuffix';
          } else {
            layoverInfo = '⏱️ Layover: $timeStr$locSuffix';
          }
          break;
        }
      }
    }

    if (layoverInfo != null) {
      return ImminentPassTarget(
        pass: bestUpcoming.pass,
        status: bestUpcoming.status,
        countdownText: bestUpcoming.countdownText,
        badgeColor: bestUpcoming.badgeColor,
        diffHours: bestUpcoming.diffHours,
        isCompleted: bestUpcoming.isCompleted,
        layoverInfo: layoverInfo,
      );
    }
    return bestUpcoming;
  }

  // Priority 3: Recently completed leg (only if no active or upcoming leg, within 3h of completion)
  if (completedCandidates.isNotEmpty) {
    completedCandidates.sort((a, b) => a.elapsedHours.compareTo(b.elapsedHours));
    return completedCandidates.first.target;
  }

  return null;
}

/// Dynamic Next Up travel countdown capsule with gate scanner and radar integrations.
class NextUpTravelCapsule extends ConsumerWidget {
  const NextUpTravelCapsule({required this.trip, this.passes, super.key});

  final Trip trip;
  final List<TravelPass>? passes;

  bool _flag(WidgetRef ref, String key) =>
      ref.watch(flagProvider((key, trip.id))).value ?? (defaultFeatureFlags[key] ?? false);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!_flag(ref, 'enableNextUpCapsule')) {
      return const SizedBox.shrink();
    }

    final allPasses = passes ?? trip.passes;
    final target = evaluateImminentPass(allPasses);
    if (target == null) return const SizedBox.shrink();

    final pass = target.pass;
    final isFlight = pass.type.toLowerCase() == 'flight';
    final isTrain = pass.type.toLowerCase() == 'train';
    final tokens = context.tokens;

    final statusInfo = getTravelStatusInfo(pass);
    final gateScannerOn = _flag(ref, 'enableGateScanner');
    final flightRadarOn = _flag(ref, 'enableFlightRadar');

    return Container(
      key: const Key('next-up-capsule'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(18),
      // Night Sky boarding pass (board 06 / Iconly "Progress at a Glance").
      decoration: BoxDecoration(
        gradient: AppTokens.nightSkyGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: tokens.shadowLg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top pill row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    isFlight
                        ? '✈️'
                        : isTrain
                        ? '🚆'
                        : '🎫',
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    target.status == 'completed'
                        ? 'COMPLETED'
                        : target.status == 'en-route'
                            ? 'EN ROUTE'
                            : 'NEXT UP',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: target.badgeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: target.badgeColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  target.countdownText,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: target.badgeColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Route & Title
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pass.title,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                    if (pass.origin != null || pass.destination != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        [pass.origin, pass.destination].whereType<String>().join(' → '),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                    ],
                  ],
                ),
              ),
              if (pass.seatOrRoom != null && pass.seatOrRoom!.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      isFlight
                          ? 'SEAT'
                          : isTrain
                          ? 'BERTH'
                          : 'ROOM',
                      style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Colors.white70),
                    ),
                    Text(
                      pass.seatOrRoom!,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          if (target.layoverInfo != null) ...[
            const SizedBox(height: 8),
            Container(
              key: const Key('next-up-layover-badge'),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
              ),
              child: Text(
                target.layoverInfo!,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),

          // Quick Action Buttons
          Row(
            children: [
              if (gateScannerOn)
                ElevatedButton.icon(
                  key: const Key('next-up-show-pass'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    visualDensity: VisualDensity.compact,
                  ),
                  icon: const Text('📲', style: TextStyle(fontSize: 12)),
                  label: const Text('Show Pass', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                  onPressed: () {
                    AppHaptics.light();
                    PassScannerModal.show(context, pass: pass);
                  },
                ),
              if (gateScannerOn && flightRadarOn && statusInfo != null) const SizedBox(width: 8),
              if (flightRadarOn && statusInfo != null)
                OutlinedButton.icon(
                  key: const Key('next-up-live-status'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white38),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    visualDensity: VisualDensity.compact,
                  ),
                  icon: Text(isFlight ? '🛫' : '🚆', style: const TextStyle(fontSize: 12)),
                  label: Text(
                    isFlight ? 'Live Status' : 'PNR Status',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                  onPressed: () {
                    AppHaptics.light();
                    LiveTravelStatusModal.show(context, statusInfo);
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }
}
