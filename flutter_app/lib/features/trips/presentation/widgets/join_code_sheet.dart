import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/widgets/app_text_field.dart';

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
          AppTextField(
            controller: _controller,
            hint: l10n.authTripCodeHint,
            errorText: _error,
            autofocus: true,
            textInputAction: TextInputAction.go,
            onSubmitted: (_) => _go(),
          ),
          const SizedBox(height: 16),
          AppButton(label: l10n.joinEnterCodeAction, isFullWidth: true, onPressed: _go),
        ],
      ),
    );
  }
}
