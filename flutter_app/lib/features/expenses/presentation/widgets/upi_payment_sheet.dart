import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../core/platform/external_launcher.dart';
import '../../../../core/platform/haptics.dart';
import '../../../../domain/logic/payment_rails_logic.dart';
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

/// 1-Tap Global Settlement sheet supporting UPI (GPay, PhonePe, Paytm, QR)
/// and Global Payment Rails (Revolut, Venmo, Cash App, PayPal, IBAN).
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
  late PaymentRail _activeRail;
  late final TextEditingController _handleController;
  final Map<PaymentRail, String> _handleCache = {};

  bool _showQr = false;
  bool _copiedHandle = false;
  bool _copiedLink = false;
  bool _isSettling = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final upperCurr = widget.currency.toUpperCase();
    if (upperCurr == 'INR') {
      _activeRail = PaymentRail.upi;
    } else if (upperCurr == 'EUR' || upperCurr == 'GBP' || upperCurr == 'CHF') {
      _activeRail = PaymentRail.revolut;
    } else if (upperCurr == 'USD') {
      _activeRail = PaymentRail.venmo;
    } else {
      _activeRail = PaymentRail.paypal;
    }

    _handleCache[PaymentRail.upi] = widget.initialUpiId;
    _handleController = TextEditingController(text: _handleCache[_activeRail] ?? '');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Pre-populate cached handles from SharedPreferences
    for (final rail in PaymentRail.values) {
      if (!_handleCache.containsKey(rail) || (_handleCache[rail] ?? '').isEmpty) {
        final saved = rail == PaymentRail.upi
            ? (savedUpiId(ref, widget.toMemberId) ?? widget.initialUpiId)
            : savedRailHandle(ref, widget.toMemberId, rail.name);
        if (saved != null && saved.isNotEmpty) {
          _handleCache[rail] = saved;
        }
      }
    }
    if (_handleController.text.isEmpty && _handleCache[_activeRail] != null) {
      _handleController.text = _handleCache[_activeRail]!;
    }
  }

  @override
  void dispose() {
    _handleController.dispose();
    super.dispose();
  }

  void _onSwitchRail(PaymentRail newRail) {
    if (_activeRail == newRail) return;
    AppHaptics.light();
    _handleCache[_activeRail] = _handleController.text.trim();

    setState(() {
      _activeRail = newRail;
      _error = null;
      _handleController.text = _handleCache[newRail] ?? '';
    });
  }

  Future<void> _saveCurrentHandle(String text) async {
    final clean = cleanPaymentHandle(_activeRail, text);
    _handleCache[_activeRail] = clean;
    if (_activeRail == PaymentRail.upi) {
      await saveUpiId(ref, widget.toMemberId, clean);
    } else {
      await saveRailHandle(ref, widget.toMemberId, _activeRail.name, clean);
    }
  }

  bool _isCurrentHandleValid() {
    final val = _handleController.text.trim();
    if (val.isEmpty) return false;
    if (_activeRail == PaymentRail.upi) {
      return isValidUpiId(val);
    }
    if (_activeRail == PaymentRail.iban) {
      return val.length >= 8;
    }
    return val.length >= 2;
  }

  Map<String, dynamic> _buildUpiDetails() => {
    'payeeUpiId': _handleController.text.trim(),
    'payeeName': widget.toName,
    'amount': widget.amount,
    'note': widget.tripName != null && widget.tripName!.isNotEmpty
        ? 'Settlement for ${widget.tripName}'
        : 'Trip Settlement',
  };

  Future<void> _launchUpiApp(String scheme) async {
    final upiId = _handleController.text.trim();
    if (!isValidUpiId(upiId)) {
      setState(() => _error = 'Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }
    await AppHaptics.medium();
    await _saveCurrentHandle(upiId);

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

  Future<void> _launchPaymentLink() async {
    final handle = _handleController.text.trim();
    if (!_isCurrentHandleValid()) {
      setState(() => _error = 'Please enter a valid handle');
      return;
    }
    await AppHaptics.medium();
    await _saveCurrentHandle(handle);

    final link = buildPaymentLink(
      rail: _activeRail,
      handle: handle,
      payeeName: widget.toName,
      amount: widget.amount,
      currency: widget.currency,
      note: widget.tripName ?? 'Trip Settlement',
    );

    final uri = Uri.parse(link.url);
    final launcher = ref.read(externalLauncherProvider);
    final opened = await launcher(uri);

    if (!opened && mounted) {
      final copyVal = link.copyText ?? link.url;
      await Clipboard.setData(ClipboardData(text: copyVal));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open ${_activeRail.name}. Details copied to clipboard!'),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _copyHandle() async {
    final val = _handleController.text.trim();
    if (val.isEmpty) return;
    await AppHaptics.light();
    await Clipboard.setData(ClipboardData(text: val));
    await _saveCurrentHandle(val);
    setState(() => _copiedHandle = true);
    Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedHandle = false);
    });
  }

  Future<void> _copyPaymentLink() async {
    final handle = _handleController.text.trim();
    if (!_isCurrentHandleValid()) {
      setState(() => _error = 'Please enter a valid handle first');
      return;
    }
    await AppHaptics.light();
    await _saveCurrentHandle(handle);

    final link = buildPaymentLink(
      rail: _activeRail,
      handle: handle,
      payeeName: widget.toName,
      amount: widget.amount,
      currency: widget.currency,
      note: widget.tripName ?? 'Trip Settlement',
    );

    final text = link.copyText ?? link.url;
    await Clipboard.setData(ClipboardData(text: text));
    setState(() => _copiedLink = true);
    Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedLink = false);
    });
  }

  Future<void> _markSettled() async {
    await AppHaptics.selection();
    setState(() => _isSettling = true);
    try {
      final handle = _handleController.text.trim();
      if (handle.isNotEmpty && _isCurrentHandleValid()) {
        await _saveCurrentHandle(handle);
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
    final valid = _isCurrentHandleValid();
    final railDef = paymentRailDefs[_activeRail]!;
    final upiUri = (_activeRail == PaymentRail.upi && valid)
        ? generateUpiUri(_buildUpiDetails())
        : '';

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
                    '1-TAP SETTLEMENT RAILS',
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
                tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
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
                  '${widget.currency} ${widget.amount.toStringAsFixed(2)}',
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

          // Payment Rails Horizontal Segment Chips
          Text(
            'CHOOSE PAYMENT RAIL',
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: tokens.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final rail in PaymentRail.values) ...[
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      key: Key('rail-chip-${rail.name}'),
                      selected: _activeRail == rail,
                      avatar: Text(paymentRailDefs[rail]!.emoji, style: const TextStyle(fontSize: 13)),
                      label: Text(
                        paymentRailDefs[rail]!.name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: _activeRail == rail ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                      onSelected: (_) => _onSwitchRail(rail),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Receiver Handle Input Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _activeRail == PaymentRail.upi ? "Receiver's UPI ID / VPA" :
                _activeRail == PaymentRail.revolut ? "Receiver's Revolut Tag" :
                _activeRail == PaymentRail.venmo ? "Receiver's Venmo Handle" :
                _activeRail == PaymentRail.cashapp ? "Receiver's \$Cashtag" :
                _activeRail == PaymentRail.paypal ? "Receiver's PayPal.me Handle" :
                "Receiver's IBAN / Bank Details",
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: tokens.textSecondary),
              ),
              if (valid)
                TextButton.icon(
                  key: const Key('upi-copy-id-btn'),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  icon: Icon(_copiedHandle ? Icons.check_rounded : Icons.copy_rounded, size: 13),
                  label: Text(_copiedHandle ? 'Copied' : 'Copy', style: const TextStyle(fontSize: 11.5)),
                  onPressed: _copyHandle,
                ),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            key: const Key('upi-id-input'),
            controller: _handleController,
            decoration: InputDecoration(
              hintText: _activeRail == PaymentRail.upi ? 'e.g. mobile@paytm or name@okhdfcbank' :
                        _activeRail == PaymentRail.revolut ? 'e.g. alex or revolut.me/alex' :
                        _activeRail == PaymentRail.venmo ? 'e.g. alex or @alex' :
                        _activeRail == PaymentRail.cashapp ? r'e.g. $alex or alex' :
                        _activeRail == PaymentRail.paypal ? 'e.g. alex or paypal.me/alex' :
                        'e.g. GB29NWBK60161331926819',
              filled: true,
              fillColor: tokens.bgSurface,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: tokens.borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: tokens.borderColor),
              ),
            ),
            onChanged: (val) {
              setState(() => _error = null);
              _saveCurrentHandle(val);
            },
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(_error!, style: TextStyle(fontSize: 11.5, color: tokens.colorDanger)),
            ),
          const SizedBox(height: 14),

          // Rail Specific Content
          if (_activeRail == PaymentRail.upi) ...[
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
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF475569)),
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
                'PAY VIA UPI APP',
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
                      onPressed: () => _launchUpiApp(app.scheme),
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
                  icon: Icon(_copiedLink ? Icons.check_rounded : Icons.link_rounded, size: 14),
                  label: Text(
                    _copiedLink ? 'Copied Payment Link!' : 'Copy Full Payment Link',
                    style: const TextStyle(fontSize: 12),
                  ),
                  onPressed: _copyPaymentLink,
                ),
              ),
            ],
          ] else ...[
            // Global Rails View (Revolut, Venmo, Cash App, PayPal, IBAN)
            if (valid) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: tokens.bgSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: tokens.borderColor),
                ),
                child: Row(
                  children: [
                    Text(railDef.emoji, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(railDef.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                          Text(railDef.tagline, style: TextStyle(fontSize: 11.5, color: tokens.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              if (_activeRail == PaymentRail.iban) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: tokens.bgSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: tokens.borderColor),
                  ),
                  child: Text(
                    formatIbanCopyText(
                      payeeName: widget.toName,
                      iban: cleanPaymentHandle(PaymentRail.iban, _handleController.text.trim()),
                      amount: widget.amount,
                      currency: widget.currency,
                      note: widget.tripName ?? 'Trip Settlement',
                    ),
                    style: TextStyle(
                      fontFamily: AppTypography.fontMono,
                      fontSize: 11,
                      color: tokens.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                AppButton(
                  key: const Key('iban-copy-details-btn'),
                  label: _copiedLink ? '✓ Wire Details Copied!' : '📋 Copy Full Wire Details',
                  variant: AppButtonVariant.primary,
                  onPressed: _copyPaymentLink,
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: AppButton(
                        key: Key('launch-rail-${_activeRail.name}'),
                        label: 'Open ${railDef.name}',
                        variant: AppButtonVariant.primary,
                        onPressed: _launchPaymentLink,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: AppButton(
                        key: const Key('copy-rail-link-btn'),
                        label: _copiedLink ? 'Copied' : 'Copy Link',
                        variant: AppButtonVariant.secondary,
                        onPressed: _copyPaymentLink,
                      ),
                    ),
                  ],
                ),
              ],
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: tokens.bgSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: tokens.borderColor),
                ),
                child: Text(
                  "Enter ${widget.toName}'s ${railDef.name} handle above to generate the payment link.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                ),
              ),
            ],
          ],

          const SizedBox(height: 16),

          // Non-Custodial Disclaimer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: tokens.bgSurface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: tokens.borderColor),
            ),
            child: Text(
              '🛡️ Non-Custodial: Trip Tracker never holds funds. All transfers happen directly within your personal banking or payment apps.',
              style: TextStyle(fontSize: 11, color: tokens.textMuted, height: 1.35),
            ),
          ),
          const SizedBox(height: 14),

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
