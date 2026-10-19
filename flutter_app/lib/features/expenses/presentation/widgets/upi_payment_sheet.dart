import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../core/platform/external_launcher.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../domain/logic/trip_utilities.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../application/money_providers.dart';

class UpiAppOption {
  const UpiAppOption({
    required this.id,
    required this.name,
    required this.scheme,
    required this.emoji,
    required this.color,
  });

  final String id;
  final String name;
  final String scheme;
  final String emoji;
  final Color color;
}

const List<UpiAppOption> popularUpiApps = [
  UpiAppOption(id: 'gpay', name: 'Google Pay', scheme: 'gpay', emoji: '🟢', color: Color(0xFF4285F4)),
  UpiAppOption(id: 'phonepe', name: 'PhonePe', scheme: 'phonepe', emoji: '🟣', color: Color(0xFF5F259F)),
  UpiAppOption(id: 'paytm', name: 'Paytm', scheme: 'paytm', emoji: '🔵', color: Color(0xFF00B9F5)),
  UpiAppOption(id: 'cred', name: 'CRED', scheme: 'cred', emoji: '💳', color: Color(0xFF1E1E1E)),
  UpiAppOption(id: 'generic', name: 'Any UPI App', scheme: 'upi', emoji: '⚡', color: Color(0xFF2BA89E)),
];

/// 1-Tap UPI Settlement sheet supporting direct app launchers (Google Pay, PhonePe, Paytm, CRED),
/// dynamic QR code generation, and 1-tap copy.
class UpiPaymentSheet extends ConsumerStatefulWidget {
  const UpiPaymentSheet({
    required this.fromName,
    required this.toName,
    required this.toMemberId,
    required this.initialUpiId,
    required this.amount,
    required this.currency,
    this.tripName,
    required this.onConfirmSettled,
    super.key,
  });

  final String fromName;
  final String toName;
  final String toMemberId;
  final String initialUpiId;
  final double amount;
  final String currency;
  final String? tripName;
  final Future<void> Function() onConfirmSettled;

  static Future<void> show(
    BuildContext context, {
    required String fromName,
    required String toName,
    required String toMemberId,
    required String initialUpiId,
    required double amount,
    required String currency,
    String? tripName,
    required Future<void> Function() onConfirmSettled,
  }) {
    return AppSheet.show<void>(
      context: context,
      builder: (_) => UpiPaymentSheet(
        fromName: fromName,
        toName: toName,
        toMemberId: toMemberId,
        initialUpiId: initialUpiId,
        amount: amount,
        currency: currency,
        tripName: tripName,
        onConfirmSettled: onConfirmSettled,
      ),
    );
  }

  @override
  ConsumerState<UpiPaymentSheet> createState() => _UpiPaymentSheetState();
}

class _UpiPaymentSheetState extends ConsumerState<UpiPaymentSheet> {
  late final TextEditingController _upiController;
  bool _showQr = false;
  bool _copiedId = false;
  bool _copiedUri = false;
  bool _isSettling = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _upiController = TextEditingController(text: widget.initialUpiId);
  }

  @override
  void dispose() {
    _upiController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildUpiDetails() => {
        'payeeUpiId': _upiController.text.trim(),
        'payeeName': widget.toName,
        'amount': widget.amount,
        'note': widget.tripName != null && widget.tripName!.isNotEmpty
            ? 'Settlement for ${widget.tripName}'
            : 'Trip Settlement',
      };

  Future<void> _launchApp(String scheme) async {
    final upiId = _upiController.text.trim();
    if (!isValidUpiId(upiId)) {
      setState(() => _error = 'Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }
    await AppHaptics.medium();
    await saveUpiId(ref, widget.toMemberId, upiId);

    final uriStr = generateUpiUri(_buildUpiDetails(), scheme == 'upi' ? null : scheme);
    final uri = Uri.parse(uriStr);
    final launcher = ref.read(externalLauncherProvider);
    final opened = await launcher(uri);

    if (!opened && mounted) {
      await Clipboard.setData(ClipboardData(text: upiId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not launch selected UPI app. UPI ID copied to clipboard!'),
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _copyUpiId() async {
    final upiId = _upiController.text.trim();
    if (upiId.isEmpty) return;
    await AppHaptics.light();
    await Clipboard.setData(ClipboardData(text: upiId));
    await saveUpiId(ref, widget.toMemberId, upiId);
    setState(() => _copiedId = true);
    Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedId = false);
    });
  }

  Future<void> _copyPaymentUri() async {
    final upiId = _upiController.text.trim();
    if (!isValidUpiId(upiId)) {
      setState(() => _error = 'Please enter a valid UPI ID first');
      return;
    }
    await AppHaptics.light();
    final uri = generateUpiUri(_buildUpiDetails());
    await Clipboard.setData(ClipboardData(text: uri));
    await saveUpiId(ref, widget.toMemberId, upiId);
    setState(() => _copiedUri = true);
    Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedUri = false);
    });
  }

  Future<void> _markSettled() async {
    await AppHaptics.selection();
    setState(() => _isSettling = true);
    try {
      final upiId = _upiController.text.trim();
      if (upiId.isNotEmpty && isValidUpiId(upiId)) {
        await saveUpiId(ref, widget.toMemberId, upiId);
      }
      await widget.onConfirmSettled();
      if (mounted) {
        Navigator.of(context).pop();
      }
    } finally {
      if (mounted) {
        setState(() => _isSettling = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final upiId = _upiController.text.trim();
    final valid = isValidUpiId(upiId);
    final upiUri = valid ? generateUpiUri(_buildUpiDetails()) : '';

    return SingleChildScrollView(
      key: const Key('upi-payment-sheet'),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '1-TAP UPI SETTLEMENT',
                    style: TextStyle(
                      fontFamily: AppTypography.fontMono,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: tokens.primaryAccent,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Pay ${widget.toName}',
                    style: TextStyle(
                      fontFamily: AppTypography.fontTitle,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: tokens.textPrimary,
                    ),
                  ),
                ],
              ),
              IconButton(
                key: const Key('upi-sheet-close'),
                icon: const Icon(Icons.close_rounded, size: 20),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Amount Card
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            decoration: BoxDecoration(
              color: tokens.bgSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: tokens.borderColor),
            ),
            child: Column(
              children: [
                Text(
                  'Amount to Transfer',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.textSecondary),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${widget.amount.toStringAsFixed(2)}',
                  key: const Key('upi-amount-display'),
                  style: TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: tokens.colorSuccess,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'From ${widget.fromName} to ${widget.toName}',
                  style: TextStyle(fontSize: 12, color: tokens.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // UPI ID Input Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Receiver's UPI ID / VPA",
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: tokens.textSecondary),
              ),
              if (valid)
                TextButton.icon(
                  key: const Key('upi-copy-id-btn'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  icon: Icon(_copiedId ? Icons.check_rounded : Icons.copy_rounded, size: 13),
                  label: Text(_copiedId ? 'Copied' : 'Copy ID', style: const TextStyle(fontSize: 11.5)),
                  onPressed: _copyUpiId,
                ),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            key: const Key('upi-id-input'),
            controller: _upiController,
            decoration: InputDecoration(
              hintText: 'e.g. mobile@paytm or name@okhdfcbank',
              filled: true,
              fillColor: tokens.bgSurface,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: tokens.borderColor)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: tokens.borderColor)),
            ),
            onChanged: (_) => setState(() => _error = null),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(_error!, style: TextStyle(fontSize: 11.5, color: tokens.colorDanger)),
            ),
          const SizedBox(height: 14),

          // Dynamic QR Code View / Toggle
          if (valid) ...[
            OutlinedButton.icon(
              key: const Key('upi-toggle-qr-btn'),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
              icon: Icon(_showQr ? Icons.qr_code_scanner_rounded : Icons.qr_code_2_rounded, size: 18),
              label: Text(_showQr ? 'Hide Dynamic QR' : 'Show Dynamic UPI QR Code'),
              onPressed: () {
                AppHaptics.light();
                setState(() => _showQr = !_showQr);
              },
            ),
            if (_showQr) ...[
              const SizedBox(height: 12),
              Center(
                child: Container(
                  key: const Key('upi-qr-card'),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                    boxShadow: tokens.shadowSm,
                  ),
                  child: Column(
                    children: [
                      QrImageView(
                        data: upiUri,
                        size: 190,
                        backgroundColor: Colors.white,
                        eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF0F172A)),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Scan with any UPI app to pay',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 14),
          ],

          // App Launch Grid
          if (valid) ...[
            Text(
              'PAY VIA APP',
              style: TextStyle(
                fontFamily: AppTypography.fontMono,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: tokens.textMuted,
              ),
            ),
            const SizedBox(height: 8),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 3.0,
              children: [
                for (final app in popularUpiApps)
                  ElevatedButton(
                    key: Key('upi-app-${app.id}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: tokens.bgSurface,
                      foregroundColor: tokens.textPrimary,
                      elevation: 0,
                      side: BorderSide(color: tokens.borderColor),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => _launchApp(app.scheme),
                    child: Row(
                      children: [
                        Text(app.emoji, style: const TextStyle(fontSize: 16)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            app.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Center(
              child: TextButton.icon(
                key: const Key('upi-copy-link-btn'),
                icon: Icon(_copiedUri ? Icons.check_rounded : Icons.link_rounded, size: 14),
                label: Text(
                  _copiedUri ? 'Copied Payment Link!' : 'Copy Full Payment Link',
                  style: const TextStyle(fontSize: 12),
                ),
                onPressed: _copyPaymentUri,
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Mark as Settled Button
          AppButton(
            key: const Key('upi-confirm-settled-btn'),
            label: 'I Have Paid · Mark as Settled',
            isLoading: _isSettling,
            onPressed: _isSettling ? null : _markSettled,
          ),
        ],
      ),
    );
  }
}
