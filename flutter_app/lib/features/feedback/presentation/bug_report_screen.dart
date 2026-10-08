import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/logging/app_logger.dart';
import '../../../data/providers.dart';
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

/// "Report a problem": a form plus the user's earlier reports. Recent logs are attached
/// (scrubbed of emails, tokens and phone numbers) unless switched off.
class BugReportScreen extends ConsumerStatefulWidget {
  const BugReportScreen({super.key});

  @override
  ConsumerState<BugReportScreen> createState() => _BugReportScreenState();
}

class _BugReportScreenState extends ConsumerState<BugReportScreen> {
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _steps = TextEditingController();
  String _severity = 'medium';
  String _category = 'general';
  bool _logs = true;
  bool _busy = false;
  String? _error;
  String? _sent;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    _steps.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Give the problem a short title.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final env = await ref.read(feedbackEnvironmentProvider)('settings/report-bug');
      final queue = (await ref.read(outboxStoreProvider).all()).length;
      final desc = scrubPii(_desc.text.trim());
      final id = await ref
          .read(feedbackRepositoryProvider)
          .reportBug(
            BugReport(
              title: scrubPii(title),
              description: desc,
              severity: _severity,
              category: _category,
              foundBy: 'in-app-flutter',
              environment: env,
              reproSteps: [
                for (final l in _steps.text.split('\n'))
                  if (l.trim().isNotEmpty) scrubPii(l.trim()),
              ],
              actualBehavior: desc,
              diagnostics: {
                'syncQueueLength': queue,
                if (_logs) 'consoleLogs': AppLogger.recent.reversed.take(60).toList().reversed.toList(),
              },
              fingerprint: bugFingerprint(title: title, category: _category, route: 'settings/report-bug'),
            ),
          );
      if (!mounted) return;
      ref.invalidate(myBugReportsProvider);
      _title.clear();
      _desc.clear();
      _steps.clear();
      setState(() {
        _busy = false;
        _sent = id.isEmpty ? 'Thanks, your report was sent.' : 'Thanks. Your report is $id.';
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
    final mine = ref.watch(myBugReportsProvider).value ?? const <MyBugReport>[];
    final signedIn = ref.watch(authStateProvider.select((a) => a.user != null && !a.isLocalOnly));
    return AppScaffold(
      appBar: AppBar(
        title: const Text('Report a problem'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (!signedIn)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text('Sign in with an account to send reports.', key: Key('bug-signin-note')),
            ),
          AppTextField(
            key: const Key('bug-title'),
            controller: _title,
            label: 'What went wrong?',
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          AppTextField(key: const Key('bug-desc'), controller: _desc, label: 'Details', maxLines: 4),
          const SizedBox(height: 12),
          AppTextField(
            key: const Key('bug-steps'),
            controller: _steps,
            label: 'Steps to reproduce (one per line)',
            maxLines: 3,
          ),
          const SizedBox(height: 12),
          _chipLabel(context, 'How bad is it?'),
          Wrap(
            key: const Key('bug-severity'),
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in bugSeverities)
                ChoiceChip(
                  key: Key('bug-severity-$s'),
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  label: Text(s[0].toUpperCase() + s.substring(1)),
                  selected: _severity == s,
                  onSelected: (_) => setState(() => _severity = s),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _chipLabel(context, 'Area'),
          Wrap(
            key: const Key('bug-category'),
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final c in bugCategories)
                ChoiceChip(
                  key: Key('bug-category-$c'),
                  showCheckmark: false,
                  shape: const StadiumBorder(),
                  label: Text(c),
                  selected: _category == c,
                  onSelected: (_) => setState(() => _category = c),
                ),
            ],
          ),
          SwitchListTile.adaptive(
            key: const Key('bug-logs'),
            contentPadding: EdgeInsets.zero,
            title: const Text('Attach recent app logs'),
            subtitle: const Text('Emails, tokens and phone numbers are removed first'),
            value: _logs,
            onChanged: (v) => setState(() => _logs = v),
          ),
          if (_error != null)
            Text(
              _error!,
              key: const Key('bug-error'),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          if (_sent != null) Text(_sent!, key: const Key('bug-sent')),
          const SizedBox(height: 12),
          AppButton(
            key: const Key('bug-submit'),
            label: 'Send report',
            isLoading: _busy,
            isFullWidth: true,
            onPressed: _busy ? null : _submit,
          ),
          if (mine.isNotEmpty) ...[
            const SizedBox(height: 24),
            const Text('Your reports', style: TextStyle(fontWeight: FontWeight.w800)),
            for (final r in mine)
              ListTile(
                key: Key('my-bug-${r.id}'),
                contentPadding: EdgeInsets.zero,
                title: Text(r.title),
                subtitle: Text('${r.id} · ${r.status} · ${r.severity}'),
              ),
          ],
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
