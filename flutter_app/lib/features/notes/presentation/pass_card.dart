import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../domain/logic/pass_sort.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/bento_tile.dart' show toneFor;

IconData passIcon(String type) => switch (type) {
  'flight' => Icons.flight_rounded,
  'train' => Icons.train_rounded,
  'stay' => Icons.bed_rounded,
  'activity' => Icons.local_activity_outlined,
  _ => Icons.directions_transit_rounded,
};

/// One travel pass as a boarding pass: route, time, passenger and seat on the main body, a vertical
/// perforation, and a QR / action stub.
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

    // Same flight, same colour: the accent tints each leg, so a group of passengers on one flight reads as a set.
    final tone = toneFor(passLeg(p).isEmpty ? p.id : passLeg(p));
    final accent = t.tones[tone].accent;
    final seat = p.seatOrRoom?.trim() ?? '';
    final qr = p.qrData?.trim() ?? '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        key: Key('pass-${p.id}'),
        color: t.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: t.borderColor.withValues(alpha: 0.7)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Stack(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Main ticket body.
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 14, 10, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(passIcon(p.type), size: 16, color: accent),
                              const SizedBox(width: 6),
                              if (detail != null && detail.isNotEmpty)
                                Expanded(
                                  child: Text(
                                    detail,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontFamily: AppTypography.fontMono,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: t.textSecondary,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            route ?? p.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontFamily: AppTypography.fontTitle,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: t.textPrimary,
                            ),
                          ),
                          if (when != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                when,
                                style: TextStyle(
                                  fontFamily: AppTypography.fontMono,
                                  fontSize: 13,
                                  color: t.textPrimary,
                                ),
                              ),
                            ),
                          if (hasName) ...[
                            const SizedBox(height: 10),
                            Text(
                              passPassenger(p),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontFamily: AppTypography.fontMono,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: t.textPrimary,
                              ),
                            ),
                          ],
                          if (seat.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                seat,
                                key: Key('pass-seat-${p.id}'),
                                style: TextStyle(
                                  fontFamily: AppTypography.fontMono,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: accent,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  // Scannable stub.
                  SizedBox(
                    width: _stubWidth,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(0, 10, 10, 10),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (qr.isNotEmpty)
                            Container(
                              key: Key('pass-qr-${p.id}'),
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                              child: QrImageView(data: qr, size: 64, padding: EdgeInsets.zero),
                            )
                          else
                            Icon(passIcon(p.type), size: 32, color: accent),
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
                  ),
                ],
              ),
              // Vertical perforation, centred on the stub's left edge.
              Positioned(
                top: 0,
                bottom: 0,
                right: _stubWidth - 7,
                width: 14,
                child: CustomPaint(
                  painter: PassPerforationPainter(
                    cutout: t.bgPage,
                    line: t.textPrimary.withValues(alpha: 0.25),
                    border: t.borderColor.withValues(alpha: 0.7),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static const _stubWidth = 92.0;
}

/// Dashed vertical tear line with a half-circle bite at the top and bottom edge.
class PassPerforationPainter extends CustomPainter {
  const PassPerforationPainter({required this.cutout, required this.line, required this.border});

  final Color cutout;
  final Color line;
  final Color border;

  static const _r = 7.0;

  @override
  void paint(Canvas canvas, Size size) {
    final x = size.width / 2;
    final dash = Paint()
      ..color = line
      ..strokeWidth = 1.4;
    for (var y = _r + 4; y < size.height - _r - 4; y += 7) {
      canvas.drawLine(Offset(x, y), Offset(x, y + 3.5), dash);
    }
    final fill = Paint()..color = cutout;
    final ring = Paint()
      ..color = border
      ..style = PaintingStyle.stroke;
    for (final cy in [0.0, size.height]) {
      canvas.drawCircle(Offset(x, cy), _r, fill);
      canvas.drawCircle(Offset(x, cy), _r, ring);
    }
  }

  @override
  bool shouldRepaint(PassPerforationPainter old) => old.cutout != cutout || old.line != line || old.border != border;
}
