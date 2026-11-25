import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

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

class _JoinCodeForm extends StatefulWidget {
  const _JoinCodeForm();

  @override
  State<_JoinCodeForm> createState() => _JoinCodeFormState();
}

class _JoinCodeFormState extends State<_JoinCodeForm> {
  final _controller = TextEditingController();
  String? _error;
  bool _pasted = false;

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
                  onChanged: (_) => setState(() {
                    _error = null;
                    _pasted = false;
                  }),
                  onSubmitted: (_) => _go(),
                ),
              ),
            ],
          ),
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
}
