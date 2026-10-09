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
        if (widget.label != null) ...[
          // .form-label: mono, uppercase, 11px, 0.08em tracking.
          Text(
            widget.label!.toUpperCase(),
            style: TextStyle(
              fontFamily: AppTypography.fontMono,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.88,
              color: tokens.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: widget.controller,
          obscureText: widget.obscureText && _hidden,
          // visiblePassword keeps shift/caps working on Android keyboards that lock it for masked fields.
          keyboardType: widget.obscureText ? TextInputType.visiblePassword : widget.keyboardType,
          enableSuggestions: !widget.obscureText,
          autocorrect: !widget.obscureText,
          textInputAction: widget.textInputAction,
          autofocus: widget.autofocus,
          maxLines: widget.maxLines,
          onChanged: widget.onChanged,
          onSubmitted: widget.onSubmitted,
          style: TextStyle(fontSize: 16, color: tokens.textPrimary),
          decoration: InputDecoration(
            hintText: widget.hintText ?? widget.hint,
            hintStyle: TextStyle(color: tokens.textMuted, fontSize: 15),
            errorText: widget.errorText,
            errorStyle: TextStyle(color: tokens.colorDanger, fontSize: 12),
            prefixIcon: widget.prefixIcon,
            suffixIcon: widget.obscureText
                ? IconButton(
                    key: const Key('password-visibility'),
                    tooltip: _hidden ? 'Show password' : 'Hide password',
                    icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _hidden = !_hidden),
                  )
                : widget.suffixIcon,
            filled: true,
            fillColor: tokens.bgSurface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(tokens.radiusSm + 4),
              borderSide: BorderSide(color: tokens.borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(tokens.radiusSm + 4),
              borderSide: BorderSide(color: tokens.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(tokens.radiusSm + 4),
              borderSide: BorderSide(color: tokens.primaryAccent, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(tokens.radiusSm + 4),
              borderSide: BorderSide(color: tokens.colorDanger),
            ),
          ),
        ),
      ],
    );
  }
}
