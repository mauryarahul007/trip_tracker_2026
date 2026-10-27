import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/platform/haptics.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_colors.dart';

class PassScannerModal extends StatefulWidget {
  const PassScannerModal({required this.pass, super.key});
  final TravelPass pass;

  static Future<void> show(BuildContext context, {required TravelPass pass}) {
    // Full-screen white page so the QR scans well (board 06 #4).
    return showDialog<void>(
      context: context,
      builder: (_) => Dialog.fullscreen(
        backgroundColor: Colors.white,
        child: PassScannerModal(pass: pass),
      ),
    );
  }

  @override
  State<PassScannerModal> createState() => _PassScannerModalState();
}

class _PassScannerModalState extends State<PassScannerModal> {
  bool _copied = false;
  Timer? _copyTimer;

  @override
  void dispose() {
    _copyTimer?.cancel();
    super.dispose();
  }

  void _copy(String text) {
    AppHaptics.light();
    Clipboard.setData(ClipboardData(text: text));
    _copyTimer?.cancel();
    setState(() => _copied = true);
    _copyTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final pass = widget.pass;
    final isFlight = pass.type.toLowerCase() == 'flight';
    final isTrain = pass.type.toLowerCase() == 'train';

    final qrData = pass.qrData?.trim().isNotEmpty == true
        ? pass.qrData!
        : (pass.bookingId?.trim().isNotEmpty == true
              ? pass.bookingId!
              : (pass.referenceCode?.trim().isNotEmpty == true ? pass.referenceCode! : pass.title));

    final refCode = pass.referenceCode ?? pass.bookingId;

    return Column(
      children: [
        Expanded(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Material(
                color: Colors.transparent,
                child: Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxWidth: 380),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header
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
                                style: const TextStyle(fontSize: 20),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                isFlight
                                    ? 'BOARDING PASS SCANNER'
                                    : isTrain
                                    ? 'RAILWAY TICKET SCANNER'
                                    : 'ENTRY PASS SCANNER',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                  color: AppColors.calmMute,
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                            key: const Key('scanner-close'),
                            icon: const Icon(Icons.close, color: AppColors.calmInk, size: 20),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Pass Title
                      Text(
                        pass.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.calmInk),
                      ),

                      if (pass.origin != null || pass.destination != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          [pass.origin, pass.destination].whereType<String>().join(' → '),
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.calmTeal),
                        ),
                      ],
                      const SizedBox(height: 16),

                      // QR Code
                      Center(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.calmLine, width: 2),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, spreadRadius: 2),
                            ],
                          ),
                          child: QrImageView(
                            data: qrData,
                            version: QrVersions.auto,
                            size: 210,
                            backgroundColor: Colors.white,
                            eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppColors.calmInk),
                            dataModuleStyle: const QrDataModuleStyle(
                              dataModuleShape: QrDataModuleShape.square,
                              color: AppColors.calmInk,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Seat / Berth / Room
                      if (pass.seatOrRoom != null && pass.seatOrRoom!.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppColors.calmPaperHover,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                isFlight
                                    ? 'SEAT: '
                                    : isTrain
                                    ? 'BERTH: '
                                    : 'ROOM: ',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.calmMute,
                                ),
                              ),
                              Text(
                                pass.seatOrRoom!,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.calmInk,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Reference / Booking Code with copy
                      if (refCode != null && refCode.isNotEmpty)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.calmPaper,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.calmLine),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'BOOKING / PNR CODE',
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.calmMute,
                                    ),
                                  ),
                                  Text(
                                    refCode,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                      color: AppColors.calmInk,
                                    ),
                                  ),
                                ],
                              ),
                              TextButton.icon(
                                key: const Key('scanner-copy'),
                                icon: Icon(
                                  _copied ? Icons.check : Icons.copy,
                                  size: 16,
                                  color: _copied ? tokens.colorSuccess : AppColors.calmTeal,
                                ),
                                label: Text(
                                  _copied ? 'Copied' : 'Copy',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: _copied ? tokens.colorSuccess : AppColors.calmTeal,
                                  ),
                                ),
                                onPressed: () => _copy(refCode),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                key: const Key('scanner-done'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.calmNightDeep,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(52),
                  shape: const StadiumBorder(),
                ),
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
