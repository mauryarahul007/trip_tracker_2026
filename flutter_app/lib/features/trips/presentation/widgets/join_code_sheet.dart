import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/theme/app_tokens.dart';

final _codeShape = RegExp(r'^[A-Za-z0-9]{6}$');

/// Manual invite-code entry (also the fallback when no QR scanner is available).
Future<void> showJoinCodeSheet(BuildContext context) => AppSheet.show<void>(
  context: context,
  title: context.l10n.joinEnterCodeTitle,
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
                            color: t.bgSurface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: i == chars.length.clamp(0, 5) ? t.primaryAccent : t.borderColor,
                              width: i == chars.length.clamp(0, 5) ? 2 : 1,
                            ),
                          ),
                          child: Text(
                            i < chars.length ? chars[i] : '',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: t.primaryAccent),
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
                  onChanged: (_) => setState(() => _error = null),
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
          AppButton(label: l10n.joinEnterCodeAction, isFullWidth: true, onPressed: _go),
        ],
      ),
    );
  }
}
