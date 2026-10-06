import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/platform/haptics.dart';
import '../../../domain/models/travel_pass.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';

class PassScannerModal extends StatefulWidget {
  const PassScannerModal({required this.pass, super.key});
  final TravelPass pass;

  static Future<void> show(BuildContext context, {required TravelPass pass}) {
    return showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.85),
      builder: (_) => PassScannerModal(pass: pass),
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
            : (pass.referenceCode?.trim().isNotEmpty == true
                ? pass.referenceCode!
                : pass.title));

    final refCode = pass.referenceCode ?? pass.bookingId;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Material(
          color: Colors.transparent,
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 380),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.45),
                  blurRadius: 30,
                  spreadRadius: 4,
                ),
              ],
            ),
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
                        Text(isFlight ? '✈️' : isTrain ? '🚆' : '🎫', style: const TextStyle(fontSize: 20)),
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
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      key: const Key('scanner-close'),
                      icon: const Icon(Icons.close, color: Color(0xFF1E293B), size: 20),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Pass Title
                Text(
                  pass.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                  ),
                ),

                if (pass.origin != null || pass.destination != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    [pass.origin, pass.destination].whereType<String>().join(' → '),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF2563EB),
                    ),
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
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: QrImageView(
                      data: qrData,
                      version: QrVersions.auto,
                      size: 200,
                      backgroundColor: Colors.white,
                      eyeStyle: const QrEyeStyle(
                        eyeShape: QrEyeShape.square,
                        color: Color(0xFF0F172A),
                      ),
                      dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: Color(0xFF0F172A),
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
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          isFlight ? 'SEAT: ' : isTrain ? 'BERTH: ' : 'ROOM: ',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        Text(
                          pass.seatOrRoom!,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F172A),
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
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
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
                                color: Color(0xFF64748B),
                              ),
                            ),
                            Text(
                              refCode,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'monospace',
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                        TextButton.icon(
                          key: const Key('scanner-copy'),
                          icon: Icon(
                            _copied ? Icons.check : Icons.copy,
                            size: 16,
                            color: _copied ? tokens.colorSuccess : const Color(0xFF2563EB),
                          ),
                          label: Text(
                            _copied ? 'Copied' : 'Copy',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _copied ? tokens.colorSuccess : const Color(0xFF2563EB),
                            ),
                          ),
                          onPressed: () => _copy(refCode),
                        ),
                      ],
                    ),
                  ),

                AppButton(
                  key: const Key('scanner-done'),
                  label: 'Done',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
