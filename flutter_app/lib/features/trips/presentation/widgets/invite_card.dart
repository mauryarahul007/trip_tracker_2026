import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_colors.dart';

/// File name for an invite picture: `invite_Goa_weekend.png` (letters, digits and underscores only).
String inviteCardFileName(String tripName) {
  final slug = tripName.trim().replaceAll(RegExp(r'\s+'), '_').replaceAll(RegExp(r'[^\w-]'), '');
  return 'invite_${slug.isEmpty ? 'trip' : slug}.png';
}

/// Draws the invite picture: the trip photo (when there is one) over a dusk gradient, the name and dates, the join
/// code, and a QR code of the join link. No expenses or member names go on it.
Future<List<int>> renderInviteCardPng({
  required String tripName,
  required String dates,
  required String code,
  required String link,
  required String joinLabel,
  required String scanLabel,
  Uint8List? coverBytes,
}) async {
  const w = 1080.0, h = 1350.0;
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  const rect = Rect.fromLTWH(0, 0, w, h);
  canvas.drawRect(rect, Paint()..shader = AppTokens.duskGradient.createShader(rect));

  if (coverBytes != null) {
    try {
      final codec = await ui.instantiateImageCodec(coverBytes, targetWidth: 1080);
      final img = (await codec.getNextFrame()).image;
      paintImage(canvas: canvas, rect: const Rect.fromLTWH(0, 0, w, 560), image: img, fit: BoxFit.cover);
      img.dispose();
    } catch (_) {
      // A photo that cannot be decoded just leaves the gradient.
    }
    const wash = Rect.fromLTWH(0, 0, w, 560);
    canvas.drawRect(
      wash,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x66000000), Color(0xE6000000)],
        ).createShader(wash),
    );
  }

  void text(String s, double y, double size, FontWeight weight, {Color color = Colors.white, double spacing = 0}) {
    final tp = TextPainter(
      text: TextSpan(
        text: s,
        style: TextStyle(color: color, fontSize: size, fontWeight: weight, letterSpacing: spacing),
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
      maxLines: 2,
      ellipsis: '…',
    )..layout(maxWidth: w - 120);
    tp.paint(canvas, Offset((w - tp.width) / 2, y));
  }

  text(tripName, 380, 84, FontWeight.w800);
  if (dates.isNotEmpty) text(dates, 500, 40, FontWeight.w600, color: Colors.white70);
  text(joinLabel.toUpperCase(), 610, 30, FontWeight.w700, color: Colors.white70, spacing: 4);
  text(code, 650, 96, FontWeight.w800, spacing: 14);

  // QR on a white card.
  const card = Rect.fromLTWH((w - 420) / 2, 810, 420, 420);
  canvas.drawRRect(RRect.fromRectAndRadius(card, const Radius.circular(36)), Paint()..color = Colors.white);
  final qr = QrPainter(
    data: link,
    version: QrVersions.auto,
    gapless: true,
    eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppColors.heroNavyDeep),
    dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: AppColors.heroNavyDeep),
  );
  final qrImage = await qr.toImage(360);
  canvas.drawImage(qrImage, Offset(card.left + 30, card.top + 30), Paint());
  qrImage.dispose();

  text(scanLabel, 1260, 32, FontWeight.w600, color: Colors.white70);

  final image = await recorder.endRecording().toImage(w.toInt(), h.toInt());
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  return data!.buffer.asUint8List();
}
