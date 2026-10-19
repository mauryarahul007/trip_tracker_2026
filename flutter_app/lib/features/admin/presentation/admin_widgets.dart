import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';

/// Small tinted label ("critical", "Banned", "OPS") used across the portal.
class AdminPill extends StatelessWidget {
  const AdminPill(this.label, {required this.color, this.filled = false, super.key});

  final String label;
  final Color color;
  final bool filled;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: color.withValues(alpha: filled ? 0.9 : 0.14),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: color.withValues(alpha: 0.5)),
    ),
    child: Text(
      label,
      maxLines: 1,
      style: TextStyle(
        fontFamily: AppTypography.fontMono,
        fontSize: 10.5,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.4,
        color: filled ? Colors.white : color,
      ),
    ),
  );
}

/// Pill-shaped filter chip row item, same look as the Expenses category runway.
class AdminFilterChip extends StatelessWidget {
  const AdminFilterChip({required this.label, required this.selected, required this.onTap, super.key});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Semantics(
        button: true,
        selected: selected,
        child: GestureDetector(
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? t.primaryAccent.withValues(alpha: 0.16) : t.bgSurface,
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: selected ? t.primaryAccent : t.borderColor),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: selected ? t.textPrimary : t.textSecondary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AdminSearchField extends StatelessWidget {
  const AdminSearchField({required this.hint, required this.onChanged, super.key});

  final String hint;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return TextField(
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: const Icon(Icons.search_rounded),
        filled: true,
        fillColor: t.bgSurface,
        contentPadding: const EdgeInsets.symmetric(vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: BorderSide(color: t.borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(99),
          borderSide: BorderSide(color: t.borderColor),
        ),
      ),
    );
  }
}

/// Loading / error-with-retry / data wrapper with pull-to-refresh, shared by every portal page.
class AdminAsync<T> extends StatelessWidget {
  const AdminAsync({required this.value, required this.onRefresh, required this.builder, super.key});

  final AsyncValue<T> value;
  final Future<void> Function() onRefresh;
  final Widget Function(BuildContext context, T data) builder;

  @override
  Widget build(BuildContext context) => value.when(
    skipLoadingOnRefresh: true,
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (e, _) => ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 60),
        Icon(Icons.cloud_off_rounded, size: 40, color: context.tokens.textMuted),
        const SizedBox(height: 12),
        Text(
          '$e',
          textAlign: TextAlign.center,
          style: TextStyle(color: context.tokens.textSecondary),
        ),
        const SizedBox(height: 16),
        AppButton(label: 'Retry', variant: AppButtonVariant.secondary, onPressed: onRefresh),
      ],
    ),
    data: (data) => RefreshIndicator(onRefresh: onRefresh, child: builder(context, data)),
  );
}

/// Section label above a group of rows.
class AdminSectionLabel extends StatelessWidget {
  const AdminSectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 16, 4, 8),
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        fontFamily: AppTypography.fontMono,
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 1.2,
        color: context.tokens.textSecondary,
      ),
    ),
  );
}

Color adminSeverityColor(AppTokens t, String severity) => switch (severity) {
  'critical' => const Color(0xFFDC2626),
  'high' => const Color(0xFFEA580C),
  'medium' => t.colorWarning,
  _ => t.textMuted,
};

Color adminStatusColor(AppTokens t, String status) => switch (status) {
  'resolved' || 'active' => t.colorSuccess,
  'in_progress' || 'closed' => const Color(0xFF2563EB),
  'open' || 'grounded' => t.colorDanger,
  _ => t.textMuted,
};

String adminDate(DateTime? d) {
  if (d == null) return '';
  final l = d.toLocal();
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${l.day} ${m[l.month - 1]} ${l.year}';
}

void adminToast(BuildContext context, String message) => ScaffoldMessenger.of(context)
  ..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(message)));
