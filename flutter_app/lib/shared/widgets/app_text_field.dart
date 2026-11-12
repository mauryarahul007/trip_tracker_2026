import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import '../theme/app_typography.dart';

class AppTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hintText;
  final String? hint;
  final String? errorText;
  final bool obscureText;
  final TextInputType keyboardType;
  final TextInputAction? textInputAction;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;
  final int maxLines;

  /// Password-manager / keyboard autofill. Defaults from the field: email keyboards get email, masked fields get
  /// password. Pass an empty list to turn it off.
  final Iterable<String>? autofillHints;

  const AppTextField({
    super.key,
    this.controller,
    this.label,
    this.hintText,
    this.hint,
    this.errorText,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.textInputAction,
    this.prefixIcon,
    this.suffixIcon,
    this.onChanged,
    this.onSubmitted,
    this.autofocus = false,
    this.maxLines = 1,
    this.autofillHints,
  });

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  bool _hidden = true;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[AppFieldLabel(widget.label!), const SizedBox(height: 6)],
        TextField(
          controller: widget.controller,
          obscureText: widget.obscureText && _hidden,
          // visiblePassword keeps shift/caps working on Android keyboards that lock it for masked fields.
          keyboardType: widget.obscureText ? TextInputType.visiblePassword : widget.keyboardType,
          enableSuggestions: !widget.obscureText,
          autocorrect: !widget.obscureText,
          textInputAction: widget.textInputAction,
          autofillHints:
              widget.autofillHints ??
              (widget.obscureText
                  ? const [AutofillHints.password]
                  : widget.keyboardType == TextInputType.emailAddress
                  ? const [AutofillHints.email]
                  : null),
          autofocus: widget.autofocus,
          maxLines: widget.maxLines,
          onChanged: widget.onChanged,
          onSubmitted: widget.onSubmitted,
          style: TextStyle(fontSize: 16, color: tokens.textPrimary),
          decoration: appFieldDecoration(
            tokens,
            hint: widget.hintText ?? widget.hint,
            errorText: widget.errorText,
            prefixIcon: widget.prefixIcon,
            suffixIcon: widget.obscureText
                ? IconButton(
                    key: const Key('password-visibility'),
                    tooltip: _hidden ? 'Show password' : 'Hide password',
                    icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _hidden = !_hidden),
                  )
                : widget.suffixIcon,
          ),
        ),
      ],
    );
  }
}

/// Mono uppercase label above a field (`.form-label`: 11px, 0.08em tracking). Shared by text fields and dropdowns.
class AppFieldLabel extends StatelessWidget {
  const AppFieldLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: TextStyle(
      fontFamily: AppTypography.fontMono,
      fontSize: 11,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.88,
      color: context.tokens.textSecondary,
    ),
  );
}

/// The filled, rounded input look of [AppTextField]; reuse it for dropdowns so every field reads the same.
InputDecoration appFieldDecoration(
  AppTokens tokens, {
  String? hint,
  String? errorText,
  Widget? prefixIcon,
  Widget? suffixIcon,
}) {
  OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(tokens.radiusSm + 4),
    borderSide: BorderSide(color: color, width: width),
  );
  return InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(color: tokens.textMuted, fontSize: 16),
    errorText: errorText,
    errorStyle: TextStyle(color: tokens.colorDanger, fontSize: 12),
    prefixIcon: prefixIcon,
    suffixIcon: suffixIcon,
    filled: true,
    fillColor: tokens.bgSurface,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    border: border(tokens.borderColor),
    enabledBorder: border(tokens.borderColor),
    focusedBorder: border(tokens.primaryAccent, 1.5),
    errorBorder: border(tokens.colorDanger),
  );
}
