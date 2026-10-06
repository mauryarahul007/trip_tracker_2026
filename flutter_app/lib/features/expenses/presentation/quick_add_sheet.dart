import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/platform/speech_recognition_gateway.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/expense_quick_parser.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';

class QuickAddSheet extends ConsumerStatefulWidget {
  const QuickAddSheet({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<QuickAddSheet> createState() => _QuickAddSheetState();
}

class _QuickAddSheetState extends ConsumerState<QuickAddSheet> {
  final _text = TextEditingController();
  ParsedQuickExpense? _parsed;
  String? _error;
  bool _busy = false;
  bool _isListening = false;
  SpeechRecognitionSession? _speechSession;

  @override
  void dispose() {
    _speechSession?.cancel();
    _text.dispose();
    super.dispose();
  }

  Future<void> _toggleVoiceInput() async {
    final gateway = ref.read(speechRecognitionGatewayProvider);
    if (_isListening) {
      _speechSession?.stop();
      setState(() => _isListening = false);
      return;
    }

    final isSupported = await gateway.isSupported();
    if (!isSupported) {
      setState(() => _error = 'Speech recognition not supported on this device.');
      return;
    }

    final permGranted = await gateway.requestPermission();
    if (!permGranted) {
      setState(() => _error = 'Microphone permission not granted.');
      return;
    }

    unawaited(AppHaptics.selection());
    setState(() {
      _isListening = true;
      _error = null;
    });

    _speechSession = gateway.startListening(
      onResult: (transcript, isFinal) {
        if (!mounted) return;
        setState(() {
          _text.text = transcript;
          _parse(transcript);
        });
      },
      onError: (err) {
        if (!mounted) return;
        unawaited(AppHaptics.warning());
        setState(() {
          _isListening = false;
          _error = err;
        });
      },
      onEnd: () {
        if (!mounted) return;
        setState(() => _isListening = false);
      },
    );
  }

  void _parse(String raw) {
    final cats = ref.read(tripCategoriesProvider(widget.tripId));
    final expenses = ref.read(tripExpensesProvider(widget.tripId)).value ?? const [];
    final members = ref.read(tripMembersProvider(widget.tripId)).value ?? const [];
    final mine = ref.read(myMemberIdProvider(widget.tripId));
    setState(() {
      _parsed = parseQuickExpense(raw, cats, expenses, members, mine, ref.read(nowProvider)());
      _error = null;
    });
  }

  Future<void> _save() async {
    final p = _parsed;
    final l10n = context.l10n;
    if (p == null || p.amount == null || p.amount! <= 0) {
      setState(() => _error = l10n.quickAddEmpty);
      return;
    }
    final trip = ref.read(tripProvider(widget.tripId)).value;
    final mine = ref.read(myMemberIdProvider(widget.tripId));
    final members = ref.read(visibleMembersProvider(widget.tripId));
    if (trip == null || mine == null) return;
    setState(() => _busy = true);
    final r = await ref.read(expenseRepositoryProvider).submit(
          ExpenseSubmission(
            title: p.title.isEmpty ? l10n.quickAddFallback : p.title,
            amount: p.amount!,
            currency: p.currency ?? trip.baseCurrency,
            category: p.categoryId ?? 'cat-misc',
            date: p.date ?? todayDateString(ref.read(nowProvider)()),
            paidBy: p.paidById ?? mine,
            splitMode: 'equal',
            splitMemberIds: p.splitMemberIds ?? [for (final m in members) m.id],
          ),
          tripId: widget.tripId,
          userId: ref.read(authStateProvider).userId ?? '',
        );
    if (!mounted) return;
    if (r.isOk) {
      Navigator.of(context).pop();
    } else {
      setState(() {
        _busy = false;
        _error = r.error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final p = _parsed;
    final voiceEnabled = ref.watch(flagProvider(('enableVoiceInput', widget.tripId))).value ??
        (defaultFeatureFlags['enableVoiceInput'] ?? true);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l10n.toolsQuickAdd, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: AppTextField(
                key: const Key('quick-add-text'),
                controller: _text,
                label: l10n.quickAddHint,
                onChanged: _parse,
              ),
            ),
            if (voiceEnabled) ...[
              const SizedBox(width: 8),
              IconButton(
                key: const Key('quick-add-mic'),
                icon: Icon(
                  _isListening ? Icons.mic : AppIcons.mic,
                  color: _isListening ? tokens.colorDanger : tokens.primaryAccent,
                ),
                tooltip: _isListening ? 'Stop recording' : 'Voice input',
                onPressed: _busy ? null : _toggleVoiceInput,
              ),
            ],
          ],
        ),
        if (p != null && p.amount != null)
          Padding(padding: const EdgeInsets.only(top: 8), child: Text('${p.title} · ${p.amount}', key: const Key('quick-add-preview'))),
        if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, key: const Key('quick-add-error'))),
        const SizedBox(height: 12),
        AppButton(key: const Key('quick-add-save'), label: l10n.quickAddConfirm, isLoading: _busy, onPressed: _busy ? null : _save),
      ]),
    );
  }
}
