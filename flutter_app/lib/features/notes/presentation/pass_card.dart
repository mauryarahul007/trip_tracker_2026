import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../domain/logic/pass_sort.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/bento_tile.dart';

IconData passIcon(String type) => switch (type) {
  'flight' => Icons.flight_rounded,
  'train' => Icons.train_rounded,
  'stay' => Icons.bed_rounded,
  'activity' => Icons.local_activity_outlined,
  _ => Icons.directions_transit_rounded,
};

/// One travel pass: type badge, bold route, passenger + flight lines, date chip, action buttons.
class PassCard extends StatelessWidget {
  const PassCard({super.key, required this.pass, this.onTap, this.onScan, this.onStatus});

  final TravelPass pass;
  final VoidCallback? onTap;
  final VoidCallback? onScan;
  final VoidCallback? onStatus;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final p = pass;
    final o = p.origin?.trim() ?? '', d = p.destination?.trim() ?? '';
    final route = o.isEmpty && d.isEmpty ? null : '${o.isEmpty ? '—' : o}  →  ${d.isEmpty ? '—' : d}';
    final parts = p.title.split(' · ');
    final hasName = (p.passengerName?.trim().isNotEmpty ?? false) || parts.length > 1;
    final detail = parts.length > 1
        ? parts.sublist(1).join(' · ').replaceFirst(RegExp(r'\s*\(.*\)\s*$'), '')
        : (route != null ? p.title : null);
    final start = DateTime.tryParse(p.startDateTime ?? '');
    final when = start == null ? null : DateFormat('d MMM · HH:mm').format(start);

    // Same flight, same colour: tiles are tinted by leg, so a group of passengers on one flight reads as a set.
    final tone = toneFor(passLeg(p).isEmpty ? p.id : passLeg(p));
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: BentoTile(
        key: Key('pass-${p.id}'),
        tone: tone,
        onTap: onTap,
        padding: const EdgeInsets.fromLTRB(14, 12, 6, 12),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: t.textPrimary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(t.radiusSm),
              ),
              child: Icon(passIcon(p.type), color: t.textPrimary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    route ?? p.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppTypography.fontTitle,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: t.textPrimary,
                    ),
                  ),
                  if (hasName)
                    Text(
                      passPassenger(p),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: t.textPrimary),
                    ),
                  if (detail != null && detail.isNotEmpty)
                    Text(
                      detail,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: t.textSecondary),
                    ),
                  if (when != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: t.textPrimary.withValues(alpha: 0.09),
                          borderRadius: BorderRadius.circular(t.radiusFull),
                        ),
                        child: Text(
                          when,
                          style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 11, color: t.textPrimary),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            if (onScan != null)
              IconButton(
                key: Key('pass-scan-${p.id}'),
                icon: const Icon(Icons.qr_code_2_rounded),
                color: t.textPrimary,
                tooltip: 'Show Pass / QR',
                onPressed: onScan,
              ),
            if (onStatus != null)
              IconButton(
                icon: const Icon(Icons.radar_rounded),
                color: t.textPrimary,
                tooltip: 'Live Travel Status',
                onPressed: onStatus,
              ),
          ],
        ),
      ),
    );
  }
}
