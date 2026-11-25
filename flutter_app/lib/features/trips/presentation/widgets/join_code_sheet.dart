import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../data/providers.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/join_share.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';

final _codeShape = RegExp(r'^[A-Za-z0-9]{6}$');

/// A trip code found in copied text: the code itself, or the code at the end of a /join/ link.
String? joinCodeFromClipboard(String? text) {
  final t = (text ?? '').trim();
  if (_codeShape.hasMatch(t)) return t.toUpperCase();
  final m = RegExp(r'/join/([A-Za-z0-9]{6})\b').firstMatch(t);
  return m?.group(1)?.toUpperCase();
}

/// Manual invite-code entry (also the fallback when no QR scanner is available).
Future<void> showJoinCodeSheet(BuildContext context) => AppSheet.show<void>(
  context: context,
  title: context.tokens.horizon ? context.l10n.horizonJoinTitle : context.l10n.joinEnterCodeTitle,
  builder: (_) => const _JoinCodeForm(),
);

class _JoinCodeForm extends ConsumerStatefulWidget {
  const _JoinCodeForm();

  @override
  ConsumerState<_JoinCodeForm> createState() => _JoinCodeFormState();
}

class _JoinCodeFormState extends ConsumerState<_JoinCodeForm> {
  final _controller = TextEditingController();
  String? _error;
  bool _pasted = false;

  // Flag enableJoinCodePreview: the trip behind a full code, looked up once per code.
  String? _previewCode;
  JoinPreview? _preview;
  bool _previewLoading = false;
  bool _previewMissing = false;

  bool get _previewOn => ref.read(flagProvider(('enableJoinCodePreview', null))).value ?? false;

  Future<void> _lookup() async {
    final code = _controller.text.trim().toUpperCase();
    if (!_codeShape.hasMatch(code) || !_previewOn) {
      if (_previewCode != null) {
        setState(() {
          _previewCode = null;
          _preview = null;
          _previewMissing = false;
          _previewLoading = false;
        });
      }
      return;
    }
    if (code == _previewCode) return;
    setState(() {
      _previewCode = code;
      _preview = null;
      _previewMissing = false;
      _previewLoading = true;
    });
    JoinPreview? found;
    try {
      found = await ref.read(joinRepositoryProvider).preview(code);
    } catch (_) {
      // Offline or rate-limited: show nothing; the join page explains on Join trip.
      if (mounted && _previewCode == code) setState(() => _previewLoading = false);
      return;
    }
    if (!mounted || _previewCode != code) return;
    setState(() {
      _previewLoading = false;
      _preview = found;
      _previewMissing = found == null;
    });
  }

  @override
  void initState() {
    super.initState();
    // Horizon: fill in a trip code that is already on the clipboard (a pasted invite or link).
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || !context.tokens.horizon) return;
      final data = await Clipboard.getData(Clipboard.kTextPlain).catchError((_) => null);
      final code = joinCodeFromClipboard(data?.text);
      if (code == null || !mounted || _controller.text.isNotEmpty) return;
      setState(() {
        _controller.text = code;
        _pasted = true;
      });
      unawaited(_lookup());
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go() {
    final code = _controller.text.trim();
    if (!_codeShape.hasMatch(code)) {
      setState(() => _error = context.l10n.joinCodeInvalid);
      return;
    }
    Navigator.of(context).pop();
    context.push('/join/${code.toUpperCase()}');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    ref.watch(flagProvider(('enableJoinCodePreview', null))); // keeps the flag loaded for _lookup
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (context.tokens.horizon) ...[
            Text(
              _pasted ? l10n.horizonJoinPasted : l10n.horizonJoinHint,
              key: const Key('join-hint'),
              style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, color: context.tokens.textSecondary),
            ),
            const SizedBox(height: 12),
          ],
          // Six frosted boxes (board 02) over one invisible field, so paste, autofill and the
          // keyboard behave exactly as with a normal text field.
          Stack(
            alignment: Alignment.center,
            children: [
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _controller,
                builder: (context, v, _) {
                  final chars = v.text.trim().toUpperCase();
                  final t = context.tokens;
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var i = 0; i < 6; i++)
                        Container(
                          width: 46,
                          height: 56,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            // Horizon: filled grey boxes, 12px corners, the active one outlined in ink.
                            color: t.horizon && i != chars.length.clamp(0, 5) ? t.bgPage : t.bgSurface,
                            borderRadius: BorderRadius.circular(t.horizon ? 12 : 16),
                            border: Border.all(
                              color: i == chars.length.clamp(0, 5) ? t.primaryAccent : t.borderColor,
                              width: i == chars.length.clamp(0, 5) ? 2 : 1,
                            ),
                          ),
                          child: Text(
                            i < chars.length ? chars[i] : '',
                            style: TextStyle(
                              fontFamily: t.horizon ? AppTypography.fontMono : null,
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: t.horizon ? t.textPrimary : t.primaryAccent,
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              Positioned.fill(
                child: TextField(
                  controller: _controller,
                  autofocus: true,
                  textInputAction: TextInputAction.go,
                  textCapitalization: TextCapitalization.characters,
                  showCursor: false,
                  enableInteractiveSelection: false,
                  style: const TextStyle(color: Colors.transparent),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                    counterText: '',
                  ),
                  onChanged: (_) {
                    setState(() {
                      _error = null;
                      _pasted = false;
                    });
                    unawaited(_lookup());
                  },
                  onSubmitted: (_) => _go(),
                ),
              ),
            ],
          ),
          if (_previewLoading || _preview != null || _previewMissing) _previewCard(context),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: context.tokens.dangerColor, fontSize: 13),
              ),
            ),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('join-code-go'),
            label: context.tokens.horizon ? l10n.horizonJoinTrip : l10n.joinEnterCodeAction,
            isFullWidth: true,
            onPressed: _go,
          ),
        ],
      ),
    );
  }

  Widget _previewCard(BuildContext context) {
    final t = context.tokens;
    final p = _preview;
    final Widget child;
    if (_previewLoading) {
      child = const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)));
    } else if (p == null) {
      child = Text(
        'No trip uses this code. Check it with the organiser.',
        key: const Key('join-preview-missing'),
        style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, color: t.dangerColor),
      );
    } else {
      final names = p.memberFirstNames;
      final people = names.isEmpty
          ? ''
          : names.length <= 3
          ? names.join(', ')
          : '${names.take(3).join(', ')} +${names.length - 3}';
      child = Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: t.primaryAccent, borderRadius: BorderRadius.circular(12)),
            child: Icon(Icons.flight_takeoff_rounded, color: t.ctaFg, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.tripName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: AppTypography.fontBody,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: t.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (names.isNotEmpty) '${names.length} ${names.length == 1 ? 'person' : 'people'}',
                    if (p.startDate.isNotEmpty) formatDateRange(p.startDate, p.endDate),
                    if (people.isNotEmpty) people,
                  ].join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 13, color: t.textSecondary),
                ),
              ],
            ),
          ),
          Icon(Icons.check_circle_rounded, color: t.colorSuccess, size: 22),
        ],
      );
    }
    return Container(
      key: const Key('join-preview'),
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: t.bgSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: t.borderColor),
      ),
      child: child,
    );
  }
}
