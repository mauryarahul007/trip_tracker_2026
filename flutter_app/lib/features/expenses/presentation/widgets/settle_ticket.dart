import 'package:flutter/material.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_avatar.dart';
import '../../../../shared/widgets/app_button.dart';

/// A boarding pass: a [top] half and a [stub] half on one pastel tone, split by a dotted tear line with a
/// notch cut out of each edge. The notches are painted in the page ground colour, so use this on [AppTokens.bgPage].
class TicketFrame extends StatelessWidget {
  const TicketFrame({required this.tone, required this.top, required this.stub, super.key});

  final BentoTone tone;
  final Widget top;
  final Widget stub;

  static const _radius = 24.0;
  static const _notch = 11.0;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final bg = t.tones[tone].bg;
    return DefaultTextStyle.merge(
      style: TextStyle(color: t.textPrimary),
      child: IconTheme.merge(
        data: IconThemeData(color: t.textPrimary),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Material(
              color: bg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(_radius)),
              child: Padding(padding: const EdgeInsets.fromLTRB(18, 16, 18, 8), child: top),
            ),
            SizedBox(
              height: _notch * 2,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned.fill(child: ColoredBox(color: bg)),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: _notch + 8),
                      child: CustomPaint(
                        painter: _Dashes(t.textPrimary.withValues(alpha: 0.28)),
                        child: const SizedBox(height: 2, width: double.infinity),
                      ),
                    ),
                  ),
                  Positioned(left: -_notch, top: 0, child: _Notch(t.bgPage)),
                  Positioned(right: -_notch, top: 0, child: _Notch(t.bgPage)),
                ],
              ),
            ),
            Material(
              color: bg,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(_radius)),
              child: Padding(padding: const EdgeInsets.fromLTRB(18, 6, 18, 16), child: stub),
            ),
          ],
        ),
      ),
    );
  }
}

class _Notch extends StatelessWidget {
  const _Notch(this.color);
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: TicketFrame._notch * 2,
    height: TicketFrame._notch * 2,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

class _Dashes extends CustomPainter {
  _Dashes(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (double x = 0; x < size.width; x += 10) {
      canvas.drawLine(Offset(x, 1), Offset(x + 5, 1), p);
    }
  }

  @override
  bool shouldRepaint(_Dashes old) => old.color != color;
}

/// "Upama ✈ Rahul": who pays whom as a boarding pass. The stub carries the amount and (optionally) Settle.
class SettleTicket extends StatelessWidget {
  const SettleTicket({
    required this.fromName,
    required this.toName,
    required this.fromLabel,
    required this.toLabel,
    required this.caption,
    required this.amountText,
    required this.tone,
    this.onSettle,
    this.settleLabel = '',
    this.settleKey,
    super.key,
  });

  final String fromName;
  final String toName;

  /// Small captions above each name ("From", "To").
  final String fromLabel;
  final String toLabel;

  /// One readable line, e.g. "Ben pays Asha" (also what a screen reader says).
  final String caption;
  final String amountText;
  final BentoTone tone;
  final VoidCallback? onSettle;
  final String settleLabel;
  final Key? settleKey;

  Widget _end(BuildContext context, String label, String name, {required bool alignEnd}) {
    final t = context.tokens;
    final text = Column(
      crossAxisAlignment: alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: t.tones[tone].accent),
        ),
        const SizedBox(height: 2),
        Text(
          name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          textAlign: alignEnd ? TextAlign.end : TextAlign.start,
          style: TextStyle(
            fontFamily: AppTypography.fontTitle,
            fontSize: 20,
            height: 1.05,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
            color: t.textPrimary,
          ),
        ),
      ],
    );
    final avatar = AppAvatar(name: name, size: 36);
    return Row(
      mainAxisAlignment: alignEnd ? MainAxisAlignment.end : MainAxisAlignment.start,
      children: alignEnd
          ? [Flexible(child: text), const SizedBox(width: 8), avatar]
          : [avatar, const SizedBox(width: 8), Flexible(child: text)],
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Semantics(
      container: true,
      label: '$caption, $amountText',
      child: TicketFrame(
        tone: tone,
        top: ExcludeSemantics(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(child: _end(context, fromLabel, fromName, alignEnd: false)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Icon(Icons.flight_takeoff_rounded, size: 22, color: t.textPrimary),
              ),
              Expanded(child: _end(context, toLabel, toName, alignEnd: true)),
            ],
          ),
        ),
        stub: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    caption,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: t.textSecondary),
                  ),
                  Text(amountText, style: AppTypography.moneyDisplay(fontSize: 30, color: t.textPrimary)),
                ],
              ),
            ),
            if (onSettle != null)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 130),
                child: AppButton(key: settleKey, label: settleLabel, onPressed: onSettle),
              ),
          ],
        ),
      ),
    );
  }
}

/// Decorative boarding-pass barcode: bars derived from [seed], so a trip keeps the same strip.
class TicketBarcode extends StatelessWidget {
  const TicketBarcode({required this.seed, this.height = 40, super.key});

  final String seed;
  final double height;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: CustomPaint(
      painter: _BarcodePainter(seed, context.tokens.textPrimary.withValues(alpha: 0.85)),
      child: SizedBox(height: height, width: double.infinity),
    ),
  );
}

class _BarcodePainter extends CustomPainter {
  _BarcodePainter(this.seed, this.color);
  final String seed;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = color;
    var h = seed.codeUnits.fold<int>(7, (a, b) => (a * 31 + b) & 0x7fffffff);
    var x = 0.0;
    while (x < size.width) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      final w = 1.0 + (h % 3); // bar 1-3 px
      final gap = 1.5 + ((h >> 4) % 3); // gap 1.5-3.5 px
      if (x + w > size.width) break;
      canvas.drawRect(Rect.fromLTWH(x, 0, w, size.height), p);
      x += w + gap;
    }
  }

  @override
  bool shouldRepaint(_BarcodePainter old) => old.seed != seed || old.color != color;
}
