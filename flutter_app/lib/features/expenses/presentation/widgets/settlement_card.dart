import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../../domain/logic/settlement_share_card.dart';
import '../../../../shared/theme/app_tokens.dart';

/// Draws the share-card layout to PNG. The widget below paints the same lines.
Future<List<int>> renderSettlementPng(SettlementShareCardLayout layout) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final w = layout.width.toDouble();
  final h = layout.height.toDouble();
  final rect = Rect.fromLTWH(0, 0, w, h);
  // Dusk surface, same gradient as the in-app Wrapped / celebration cards.
  canvas.drawRect(rect, Paint()..shader = AppTokens.duskGradient.createShader(rect));
  var y = 72.0;
  for (var i = 0; i < layout.lines.length; i++) {
    final big = i == 3;
    final tp = TextPainter(
      text: TextSpan(
        text: layout.lines[i],
        style: TextStyle(
          color: Colors.white,
          fontSize: big ? 72 : 40,
          fontWeight: big ? FontWeight.w800 : FontWeight.w600,
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    )..layout(maxWidth: w - 96);
    tp.paint(canvas, Offset((w - tp.width) / 2, y));
    y += tp.height + 28;
  }
  final image = await recorder.endRecording().toImage(layout.width, layout.height);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  return data!.buffer.asUint8List();
}

class SettlementCardPreview extends StatelessWidget {
  const SettlementCardPreview({required this.layout, super.key});
  final SettlementShareCardLayout layout;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('share-card-preview'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(gradient: AppTokens.duskGradient, borderRadius: BorderRadius.circular(24)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final line in layout.lines)
            Text(
              line,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white),
            ),
        ],
      ),
    );
  }
}
