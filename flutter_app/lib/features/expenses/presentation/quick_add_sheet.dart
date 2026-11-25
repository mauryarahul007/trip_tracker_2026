import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/format/money.dart';
import '../../../core/platform/haptics.dart';
import '../../../core/platform/speech_recognition_gateway.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/expense_form_logic.dart';
import '../../../domain/logic/expense_quick_parser.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../domain/logic/member_weights.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/theme/category_icons.dart';
import '../../../shared/widgets/bento_tile.dart' show toneFor;
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_surface.dart' show AppCard, Eyebrow;
import '../../../shared/widgets/app_text_field.dart';
import '../../trip_details/application/trip_nav.dart';
import '../application/expenses_providers.dart';

class QuickAddSheet extends ConsumerStatefulWidget {
  const QuickAddSheet({required this.tripId, this.autoListen = false, super.key});
  final String tripId;

  /// Start the microphone as soon as the sheet opens (the Voice button on Expenses).
  final bool autoListen;

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
  void initState() {
    super.initState();
    if (widget.autoListen) WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_toggleVoiceInput()));
  }

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
      setState(
        () => _error = 'Voice input is not available on this phone. Install or enable Google speech services, or type the expense.',
      );
      return;
    }

    final permGranted = await gateway.requestPermission();
    if (!permGranted) {
      setState(() => _error = speechErrorText('permission'));
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
          _error = speechErrorText(err);
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
      _parsed = parseQuickExpense(normalizeSpokenNumbers(raw), cats, expenses, members, mine, ref.read(nowProvider)());
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
    var splitMode = 'equal';
    var splitIds = p.splitMemberIds ?? [for (final m in members) m.id];
    Map<String, double>? splitConfig;
    // Couples count as 2: a member someone else pays for drops out and their payer carries the share.
    final weightsOn =
        ref.read(flagProvider(('enableMemberWeights', widget.tripId))).value ??
        (defaultFeatureFlags['enableMemberWeights'] ?? true);
    if (weightsOn) {
      final w = weightedDefaultSplit(
        selected: splitIds.toSet(),
        weights: trip.memberWeights,
        covers: trip.memberCovers,
      );
      if (w != null) {
        splitMode = 'custom';
        splitIds = [
          for (final id in splitIds)
            if (w.selected.contains(id)) id,
        ];
        splitConfig = w.weights;
      }
    }
    final r = await ref
        .read(expenseRepositoryProvider)
        .submit(
          ExpenseSubmission(
            title: p.title.isEmpty ? l10n.quickAddFallback : p.title,
            amount: p.amount!,
            currency: p.currency ?? trip.baseCurrency,
            category: p.categoryId ?? 'cat-misc',
            date: p.date ?? todayDateString(ref.read(nowProvider)()),
            paidBy: p.paidById ?? mine,
            splitMode: splitMode,
            splitMemberIds: splitIds,
            splitConfig: splitConfig,
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

  /// Horizon: what Quick add understood, as the expense row it will become, then chips to change the trip-side
  /// details on the full form (split, receipt).
  List<Widget> _horizonPreview(BuildContext context, ParsedQuickExpense p) {
    final l10n = context.l10n;
    final t = context.tokens;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    final cats = ref.watch(tripCategoriesProvider(widget.tripId));
    final members = ref.watch(visibleMembersProvider(widget.tripId));
    final mine = ref.watch(myMemberIdProvider(widget.tripId));
    final cat = cats.where((c) => c.id == (p.categoryId ?? 'cat-misc')).firstOrNull;
    final tone = t.tones[toneFor(cat?.id ?? 'cat-misc')];
    final payerId = p.paidById ?? mine;
    final payerName = members.where((m) => m.id == payerId).firstOrNull?.name;
    final count = p.splitMemberIds?.length ?? members.length;
    final today = todayDateString(ref.read(nowProvider)());
    final sub = [
      payerId == mine ? l10n.horizonYouPaid : l10n.horizonNamePaid(payerName ?? p.paidByName ?? ''),
      l10n.horizonEqualCount(count),
      if (p.date == null || p.date == today) l10n.horizonToday else p.date!,
    ].join(' · ');
    void openForm(String then) {
      final router = GoRouter.of(context);
      Navigator.of(context).pop();
      router.push(
        Uri(
          path: '/trip/${widget.tripId}/expenses/new',
          queryParameters: {'quick': _text.text, 'then': then},
        ).toString(),
      );
    }

    // The trip chip only names the trip; a plain Chip keeps it from looking disabled.
    Widget chip(Key key, Widget? icon, String label, VoidCallback? onTap) => onTap == null
        ? Chip(
            key: key,
            label: Text(label),
            backgroundColor: t.bgSurfaceHover,
            side: BorderSide.none,
            labelStyle: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: t.textSecondary,
            ),
          )
        : ActionChip(
            key: key,
            avatar: icon,
            label: Text(label),
            backgroundColor: t.bgSurfaceHover,
            side: BorderSide.none,
            labelStyle: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: t.textSecondary,
            ),
            onPressed: onTap,
          );
    return [
      Container(
        key: const Key('quick-add-preview'),
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: t.bgSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: t.borderColor),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(12)),
              child: Center(child: categoryGlyph(cat, 20, tone.accent, vector: true)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.title.isEmpty ? l10n.quickAddFallback : p.title,
                    key: const Key('quick-add-preview-title'),
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: AppTypography.fontBody,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: t.textPrimary,
                    ),
                  ),
                  Text(
                    sub,
                    key: const Key('quick-add-preview-sub'),
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 12.5, color: t.textSecondary),
                  ),
                ],
              ),
            ),
            Text(
              formatMoney(context, p.amount!, p.currency ?? trip?.baseCurrency ?? 'INR'),
              key: const Key('quick-add-preview-amount'),
              style: TextStyle(
                fontFamily: AppTypography.fontMono,
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: t.textPrimary,
              ),
            ),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            if (trip != null) chip(const Key('quick-add-trip'), null, trip.name, null),
            chip(
              const Key('quick-add-split'),
              const Icon(Icons.call_split_rounded, size: 16),
              l10n.horizonChangeSplit,
              () => openForm('split'),
            ),
            chip(
              const Key('quick-add-scan'),
              const Icon(Icons.photo_camera_outlined, size: 16),
              l10n.horizonScanBill,
              () => openForm('scan'),
            ),
          ],
        ),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final p = _parsed;
    final voiceEnabled =
        ref.watch(flagProvider(('enableVoiceInput', widget.tripId))).value ??
        (defaultFeatureFlags['enableVoiceInput'] ?? true);
    // Keep the couples flag loaded so _save reads its real value.
    ref.watch(flagProvider(('enableMemberWeights', widget.tripId)));

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.toolsQuickAdd,
            style: tokens.horizon
                ? TextStyle(
                    fontFamily: AppTypography.fontTitle,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: tokens.textPrimary,
                  )
                : Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                // Horizon: "Type it like a message" over the box, the example as the hint.
                child: tokens.horizon
                    ? TextField(
                        key: const Key('quick-add-text'),
                        controller: _text,
                        autofocus: !widget.autoListen,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          labelText: l10n.horizonQuickLabel,
                          hintText: l10n.horizonQuickHint,
                          floatingLabelBehavior: FloatingLabelBehavior.always,
                        ),
                        onChanged: _parse,
                      )
                    : AppTextField(
                        key: const Key('quick-add-text'),
                        controller: _text,
                        label: l10n.quickAddHint,
                        onChanged: _parse,
                      ),
              ),
              if (voiceEnabled) ...[
                const SizedBox(width: 8),
                IconButton.filled(
                  key: const Key('quick-add-mic'),
                  style: IconButton.styleFrom(
                    backgroundColor: (_isListening ? tokens.colorDanger : tokens.primaryAccent).withValues(alpha: 0.12),
                  ),
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
          if (_isListening)
            Padding(
              key: const Key('quick-add-listening'),
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(Icons.mic, color: tokens.colorDanger),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _text.text.isEmpty ? 'Listening… say "500 lunch at the dhaba"' : _text.text,
                          style: TextStyle(color: tokens.textSecondary, fontStyle: FontStyle.italic),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const LinearProgressIndicator(),
                ],
              ),
            ),
          if (tokens.horizon && p != null && p.amount != null) ..._horizonPreview(context, p),
          if (!tokens.horizon && p != null && p.amount != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: AppCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ponytail: English-only label until the ARB files are regenerated.
                    const Eyebrow('We understood'),
                    const SizedBox(height: 6),
                    Text(
                      '${p.title} · ${p.amount}',
                      key: const Key('quick-add-preview'),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Expanded(child: Text(_error!, key: const Key('quick-add-error'))),
                  if (voiceEnabled)
                    TextButton(
                      key: const Key('quick-add-retry'),
                      onPressed: _busy || _isListening ? null : _toggleVoiceInput,
                      child: const Text('Try again'),
                    ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          AppButton(
            key: const Key('quick-add-save'),
            // Horizon names the trip on the button, so an add from Home never lands somewhere unexpected.
            label: () {
              final name = context.tokens.horizon ? ref.watch(tripProvider(widget.tripId)).value?.name : null;
              return name == null || name.isEmpty ? l10n.quickAddConfirm : l10n.horizonAddTo(name);
            }(),
            isLoading: _busy,
            onPressed: _busy ? null : _save,
          ),
        ],
      ),
    );
  }
}
