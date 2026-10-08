import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../domain/logic/bug_report.dart';
import '../../../domain/logic/pii_scrub.dart';
import '../../../domain/repositories/feedback_repository.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../application/feedback_providers.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';

class FeatureRequestScreen extends ConsumerStatefulWidget {
  const FeatureRequestScreen({super.key});

  @override
  ConsumerState<FeatureRequestScreen> createState() => _FeatureRequestScreenState();
}

class _FeatureRequestScreenState extends ConsumerState<FeatureRequestScreen> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  String _category = 'general';
  bool _busy = false;
  String? _error;
  bool _sent = false;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Give your idea a short title.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final env = await ref.read(feedbackEnvironmentProvider)('settings/feature-request');
      await ref
          .read(feedbackRepositoryProvider)
          .submitFeatureRequest(
            title: scrubPii(title),
            description: scrubPii(_desc.text.trim()),
            category: _category,
            requestedBy: 'in-app-flutter',
            environment: env,
          );
      if (!mounted) return;
      _title.clear();
      _desc.clear();
      setState(() {
        _busy = false;
        _sent = true;
      });
    } on FeedbackUnavailable catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e.toString();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = 'Could not send. Check your connection and try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final signedIn = ref.watch(authStateProvider.select((a) => a.user != null && !a.isLocalOnly));
    return AppScaffold(
      appBar: AppBar(
        title: const Text('Suggest a feature'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Container(
              width: 64,
              height: 64,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: context.tokens.warningColor.withValues(alpha: 0.16),
              ),
              child: Icon(Icons.lightbulb_outline_rounded, size: 30, color: context.tokens.warningColor),
            ),
          ),
          if (!signedIn)
            const Padding(padding: EdgeInsets.only(bottom: 12), child: Text('Sign in with an account to send ideas.')),
          AppTextField(
            key: const Key('feature-title'),
            controller: _title,
            label: 'Your idea',
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          AppTextField(key: const Key('feature-desc'), controller: _desc, label: 'Why would it help?', maxLines: 4),
          const SizedBox(height: 12),
          _chipLabel(context, 'Area'),
          Wrap(
            key: const Key('feature-category'),
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final c in featureCategories)
                ChoiceChip(
                  key: Key('feature-category-$c'),
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  label: Text(c),
                  selected: _category == c,
                  onSelected: (_) => setState(() => _category = c),
                ),
            ],
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                _error!,
                key: const Key('feature-error'),
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          if (_sent)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text('Thanks, we read every idea.', key: Key('feature-sent')),
            ),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('feature-submit'),
            label: 'Send idea',
            isLoading: _busy,
            isFullWidth: true,
            onPressed: _busy ? null : _submit,
          ),
        ],
      ),
    );
  }
}

Widget _chipLabel(BuildContext context, String text) => Padding(
  padding: const EdgeInsets.only(bottom: 8),
  child: Text(
    text.toUpperCase(),
    style: TextStyle(
      fontFamily: AppTypography.fontMono,
      fontSize: 10.5,
      fontWeight: FontWeight.w600,
      letterSpacing: 1.1,
      color: context.tokens.textMuted,
    ),
  ),
);
