import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'ticket_scallop_divider.dart';

/// A luxury airline boarding-pass ticket card.
///
/// Features an upper flight segment, a perforated scallop divider with side bite notches,
/// and a lower boarding stub with barcode/metadata.
class BoardingPassCard extends StatelessWidget {
  const BoardingPassCard({
    required this.top,
    required this.stub,
    this.banner,
    this.tone = BentoTone.mint,
    this.notchRadius = 11.0,
    this.backgroundColor,
    this.pageColor,
    this.borderRadius = 22.0,
    super.key,
  });

  /// Optional full-bleed atmospheric banner above [top] (trip cover / twilight gradient).
  final Widget? banner;

  /// The main top segment of the boarding pass.
  final Widget top;

  /// The tear-off lower stub section.
  final Widget stub;

  /// Tone for tint accents.
  final BentoTone tone;

  /// Radius of the side bite cutout notches.
  final double notchRadius;

  /// Background color of the ticket card (defaults to tone bg or surface).
  final Color? backgroundColor;

  /// Background color of the page outside the ticket (drawn in cutout notches).
  final Color? pageColor;

  /// Outer corner border radius.
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final bg = backgroundColor ?? tokens.bgSurface;
    final page = pageColor ?? tokens.bgPage;

    return DefaultTextStyle.merge(
      style: TextStyle(color: tokens.textPrimary),
      child: IconTheme.merge(
        data: IconThemeData(color: tokens.textPrimary),
        child: Container(
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(color: tokens.borderColor.withValues(alpha: 0.5), width: 1.0),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 4)),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ?banner,
              // Top boarding pass body
              Padding(padding: const EdgeInsets.fromLTRB(18, 16, 18, 12), child: top),

              // Perforated scallop divider
              TicketScallopDivider(
                notchRadius: notchRadius,
                cardColor: bg,
                cutoutColor: page,
                perforationColor: tokens.textPrimary.withValues(alpha: 0.2),
                useDashes: true,
              ),

              // Bottom tear-off stub
              Padding(padding: const EdgeInsets.fromLTRB(18, 10, 18, 16), child: stub),
            ],
          ),
        ),
      ),
    );
  }
}
