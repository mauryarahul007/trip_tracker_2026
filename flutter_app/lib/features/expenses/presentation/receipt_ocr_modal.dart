import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../core/platform/ocr_gateway.dart';
import '../../../domain/logic/receipt_ocr_service.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';

/// Modal for scanning or pasting receipt text to extract itemized breakdown.
class ReceiptOcrModal extends ConsumerStatefulWidget {
  const ReceiptOcrModal({
    super.key,
    required this.tripId,
    this.defaultMemberIds = const [],
    required this.onApplyReceipt,
  });

  final String tripId;
  final List<String> defaultMemberIds;
  final void Function(ParsedReceiptData data) onApplyReceipt;

  static Future<void> show(
    BuildContext context, {
    required String tripId,
    List<String> defaultMemberIds = const [],
    required void Function(ParsedReceiptData data) onApplyReceipt,
  }) {
    return AppSheet.show<void>(
      context: context,
      title: 'Scan & Itemize Receipt',
      builder: (_) =>
          ReceiptOcrModal(tripId: tripId, defaultMemberIds: defaultMemberIds, onApplyReceipt: onApplyReceipt),
    );
  }

  @override
  ConsumerState<ReceiptOcrModal> createState() => _ReceiptOcrModalState();
}

class _ReceiptOcrModalState extends ConsumerState<ReceiptOcrModal> {
  final TextEditingController _textController = TextEditingController();
  ParsedReceiptData? _parsedData;
  String? _errorMessage;
  bool _isProcessing = false;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _handleParseText() {
    final text = _textController.text.trim();
    if (text.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter or paste receipt text to scan.';
        _parsedData = null;
      });
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final parsed = parseScannedReceipt(text, widget.defaultMemberIds);
      unawaited(AppHaptics.success());
      setState(() {
        _parsedData = parsed;
        _isProcessing = false;
        _errorMessage = null;
      });
    } on ReceiptOcrException catch (e) {
      unawaited(AppHaptics.warning());
      setState(() {
        _errorMessage = e.message;
        _parsedData = null;
        _isProcessing = false;
      });
    } catch (_) {
      unawaited(AppHaptics.warning());
      setState(() {
        _errorMessage = 'Failed to parse receipt text. Please check format.';
        _parsedData = null;
        _isProcessing = false;
      });
    }
  }

  Future<void> _handleImageScan(String fakeOrRealImagePath) async {
    final ocrGateway = ref.read(ocrGatewayProvider);
    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      final text = await ocrGateway.recognizeTextFromImage(fakeOrRealImagePath);
      if (text.trim().isEmpty) {
        throw const ReceiptOcrException(
          'Could not read text from this image. Please paste receipt text directly.',
          ReceiptOcrFailure.empty,
        );
      }
      _textController.text = text;
      final parsed = parseScannedReceipt(text, widget.defaultMemberIds);
      unawaited(AppHaptics.success());
      setState(() {
        _parsedData = parsed;
        _isProcessing = false;
      });
    } on ReceiptOcrException catch (e) {
      unawaited(AppHaptics.warning());
      setState(() {
        _errorMessage = e.message;
        _isProcessing = false;
      });
    } catch (e) {
      unawaited(AppHaptics.warning());
      setState(() {
        _errorMessage = 'OCR scanning failed. Try pasting the text manually.';
        _isProcessing = false;
      });
    }
  }

  void _handleApply() {
    if (_parsedData == null) return;
    unawaited(AppHaptics.selection());
    widget.onApplyReceipt(_parsedData!);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final parsed = _parsedData;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: tokens.primaryAccent.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(AppIcons.receipt, size: 20, color: tokens.primaryAccent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Scan & Itemize Receipt',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                    ),
                    Text(
                      'Extract items, taxes and tips automatically',
                      style: TextStyle(fontSize: 12, color: tokens.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: tokens.colorDanger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: tokens.colorDanger.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Icon(AppIcons.alert, size: 16, color: tokens.colorDanger),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_errorMessage!, style: TextStyle(fontSize: 12.5, color: tokens.colorDanger)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          AppTextField(
            key: const Key('receipt_text_input'),
            controller: _textController,
            label: 'Receipt text / bill lines',
            hintText: 'e.g.\nCaffe Latte 240.00\nMuffin 180.00\nCGST 17.75\nTotal 437.75',
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  key: const Key('btn_scan_receipt_image'),
                  label: 'Scan Camera/Photo',
                  variant: AppButtonVariant.secondary,
                  icon: AppIcons.camera,
                  isLoading: _isProcessing,
                  onPressed: _isProcessing ? null : () => _handleImageScan('demo_receipt_image'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: AppButton(
                  key: const Key('btn_parse_receipt'),
                  label: 'Parse Text',
                  variant: AppButtonVariant.secondary,
                  icon: AppIcons.search,
                  isLoading: _isProcessing,
                  onPressed: _isProcessing ? null : _handleParseText,
                ),
              ),
            ],
          ),
          if (parsed != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: tokens.colorSuccess.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: tokens.colorSuccess.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        parsed.merchant ?? 'Detected Receipt',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                      ),
                      if (parsed.date != null)
                        Text(parsed.date!, style: TextStyle(fontSize: 12, color: tokens.textMuted)),
                    ],
                  ),
                  const Divider(height: 20),
                  for (final item in parsed.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              item.name,
                              style: TextStyle(fontSize: 13, color: tokens.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            item.amount.toStringAsFixed(2),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              fontFamily: 'monospace',
                              color: tokens.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (parsed.tax > 0)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Tax / GST', style: TextStyle(fontSize: 12, color: tokens.textSecondary)),
                          Text(
                            parsed.tax.toStringAsFixed(2),
                            style: TextStyle(fontSize: 12, color: tokens.textSecondary, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                  if (parsed.tip > 0)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Tip / Gratuity', style: TextStyle(fontSize: 12, color: tokens.textSecondary)),
                          Text(
                            parsed.tip.toStringAsFixed(2),
                            style: TextStyle(fontSize: 12, color: tokens.textSecondary, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                  if (parsed.discount > 0)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Discount', style: TextStyle(fontSize: 12, color: tokens.colorSuccess)),
                          Text(
                            '-${parsed.discount.toStringAsFixed(2)}',
                            style: TextStyle(fontSize: 12, color: tokens.colorSuccess, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Amount',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: tokens.textPrimary),
                      ),
                      Text(
                        parsed.total.toStringAsFixed(2),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: tokens.primaryAccent,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppButton(
              key: const Key('btn_apply_receipt'),
              label: 'Apply ${parsed.items.length} Items (${parsed.total.toStringAsFixed(2)})',
              variant: AppButtonVariant.primary,
              icon: AppIcons.check,
              onPressed: _handleApply,
            ),
          ],
        ],
      ),
    );
  }
}
