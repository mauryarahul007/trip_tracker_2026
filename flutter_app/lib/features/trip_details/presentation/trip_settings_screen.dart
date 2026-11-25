import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/currency.dart' show getCurrencySymbol;
import '../../../domain/models/trip.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/undo_snackbar.dart';
import '../../../core/settings/app_settings.dart' show geotagExpensesPrefProvider;
import '../../expenses/application/expenses_providers.dart' show tripExpensesProvider, tripMembersProvider;
import '../../expenses/presentation/closeout_sheet.dart';
import '../../notifications/application/notification_prefs_providers.dart';
import '../../settings/presentation/settings_widgets.dart';
import '../application/trip_nav.dart';

/// Per-trip settings (replaces the Phase 6 stub). Money rules and freeze/close/archive are
/// owner-only here, matching the trips list; the server enforces the same with RLS.
class TripSettingsScreen extends ConsumerWidget {
  const TripSettingsScreen({required this.tripId, super.key});

  final String tripId;

  Future<void> _threshold(BuildContext context, WidgetRef ref, Trip trip) async {
    final picked = await AppSheet.show<ApprovalThresholdResult>(
      context: context,
      title: context.l10n.approvalTitle,
      builder: (_) => ApprovalThresholdSheet(
        currency: trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency,
        initial: trip.approvalThreshold,
      ),
    );
    if (picked == null) return;
    await ref.read(tripRepositoryProvider).setApprovalThreshold(tripId, picked.value);
  }

  /// Applies the change at once and offers UNDO, instead of asking first: every one of these can be flipped back.
  Future<void> _state(BuildContext context, WidgetRef ref, String message, {bool? frozen, bool? closed}) async {
    final repo = ref.read(tripRepositoryProvider); // captured: the screen may be gone when UNDO is tapped
    await repo.setTripState(tripId, frozen: frozen, closed: closed);
    if (!context.mounted) return;
    UndoSnackbar.show(
      context: context,
      message: message,
      onUndo: () => unawaited(
        repo.setTripState(tripId, frozen: frozen == null ? null : !frozen, closed: closed == null ? null : !closed),
      ),
    );
  }

  /// Horizon ("Trip settings" mockup): one card of trip rules, a card for Categories and Recycle bin, Trip state as
  /// tappable rows (Freeze, Archive, Close trip opens Close out) and a red Delete trip card at the end.
  Widget _horizon(
    BuildContext context,
    WidgetRef ref,
    Trip trip, {
    required bool isOwner,
    required bool muted,
    required bool simplify,
    required bool approval,
  }) {
    final l10n = context.l10n;
    final t = context.tokens;
    final repo = ref.read(tripRepositoryProvider);
    final base = trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency;
    final expenses = ref.watch(tripExpensesProvider(tripId)).value ?? const [];
    final foreign = <String, int>{};
    for (final e in expenses) {
      if (e.currency.isNotEmpty && e.currency != base) foreign[e.currency] = (foreign[e.currency] ?? 0) + 1;
    }
    final currencySub = foreign.isEmpty
        ? base
        : l10n.horizonCurrencyMixed(base, foreign.keys.join(', '), foreign.values.fold(0, (a, b) => a + b));
    final geotagFlag = ref.watch(flagProvider(('enableGeotagging', null))).value ?? true;
    final people = ref.watch(tripMembersProvider(tripId)).value?.length ?? 0;
    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        SettingsSection(
          title: '',
          children: [
            SettingsTile(
              key: const Key('trip-currency'),
              icon: Icons.account_balance_wallet_outlined,
              title: l10n.horizonCurrency,
              subtitle: currencySub,
            ),
            if (simplify)
              SettingsSwitchTile(
                key: const Key('trip-simplify'),
                icon: Icons.balance_rounded,
                title: 'Simplify debts',
                subtitle: l10n.horizonFewestPayments,
                value: trip.simplifyDebts,
                onChanged: isOwner ? (v) => repo.setSimplifyDebts(tripId, v) : null,
              ),
            if (approval)
              SettingsTile(
                key: const Key('trip-approval'),
                icon: Icons.verified_user_outlined,
                title: l10n.approvalTitle,
                subtitle: trip.approvalThreshold == null
                    ? l10n.approvalOff
                    : l10n.approvalOn(formatMoney(context, trip.approvalThreshold!, base)),
                onTap: isOwner ? () => _threshold(context, ref, trip) : null,
              ),
            if (geotagFlag)
              SettingsSwitchTile(
                key: const Key('trip-geotag'),
                icon: Icons.location_on_outlined,
                title: 'Geotag expenses',
                subtitle: l10n.horizonGeotagSub,
                value: ref.watch(geotagExpensesPrefProvider),
                onChanged: (v) => ref.read(geotagExpensesPrefProvider.notifier).set(v),
              ),
            SettingsSwitchTile(
              key: const Key('trip-mute'),
              icon: Icons.notifications_none_rounded,
              title: 'Mute this trip',
              value: muted,
              onChanged: (v) async {
                await ref.read(notificationPrefsRepositoryProvider).setTripMuted(tripId, v);
                ref.invalidate(tripMutedProvider(tripId));
              },
            ),
          ],
        ),
        SettingsSection(
          title: '',
          children: [
            SettingsTile(
              key: const Key('trip-categories'),
              icon: Icons.sell_outlined,
              title: 'Categories',
              onTap: () => context.push('/trip/$tripId/categories'),
            ),
            SettingsTile(
              key: const Key('trip-recycle'),
              icon: Icons.delete_outline_rounded,
              title: 'Recycle bin',
              onTap: () => context.push('/trip/$tripId/recycle-bin'),
            ),
          ],
        ),
        if (isOwner) ...[
          SettingsSection(
            title: 'Trip state',
            children: [
              SettingsTile(
                key: const Key('trip-freeze'),
                icon: Icons.ac_unit_rounded,
                title: 'Freeze trip',
                subtitle: trip.frozen ? l10n.horizonFrozenSub : l10n.horizonFreezeSub,
                onTap: () => _state(context, ref, trip.frozen ? 'Trip unfrozen' : 'Trip frozen', frozen: !trip.frozen),
              ),
              SettingsTile(
                key: const Key('trip-archive'),
                icon: Icons.inventory_2_outlined,
                title: 'Archive',
                subtitle: trip.archived ? l10n.horizonArchivedSub : 'Hide from the main list',
                onTap: () => repo.setTripState(tripId, archived: !trip.archived),
              ),
              SettingsTile(
                key: const Key('trip-close'),
                icon: Icons.check_rounded,
                title: l10n.horizonCloseTrip,
                subtitle: trip.closed ? l10n.horizonClosedSub : l10n.horizonCloseSub,
                onTap: trip.closed
                    ? () => _state(context, ref, 'Trip reopened', closed: false)
                    : () => AppSheet.show<void>(
                        context: context,
                        builder: (_) => CloseoutSheet(tripId: tripId),
                      ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Material(
              color: t.bgSurface,
              clipBehavior: Clip.antiAlias,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(t.radiusMd),
                side: BorderSide(color: t.borderColor),
              ),
              child: SettingsTile(
                key: const Key('trip-delete'),
                icon: Icons.delete_outline_rounded,
                danger: true,
                title: l10n.tripDelete,
                subtitle: people > 1 ? l10n.horizonDeleteForPeople(people) : l10n.horizonDeleteForAll,
                trailing: const SizedBox.shrink(),
                onTap: () => _delete(context, ref, trip),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Trip trip) async {
    final l10n = context.l10n;
    final ok = await ConfirmDialog.show(
      context: context,
      title: l10n.tripDeleteTitle,
      message: l10n.tripDeleteBody(trip.name),
      confirmLabel: l10n.actionDelete,
      cancelLabel: l10n.actionCancel,
      isDestructive: true,
    );
    if (!ok || !context.mounted) return;
    final repo = ref.read(tripRepositoryProvider);
    context.go('/');
    await repo.deleteTrip(tripId);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trip = ref.watch(tripProvider(tripId)).value;
    final userId = ref.watch(authStateProvider.select((a) => a.userId));
    final repo = ref.read(tripRepositoryProvider);
    final muted = ref.watch(tripMutedProvider(tripId)).value ?? false;
    final isOwner = trip != null && trip.ownerId == userId;
    final approvalFlag = ref.watch(flagProvider(('enableExpenseApprovalThreshold', tripId))).value ?? false;
    final simplifyFlag = ref.watch(flagProvider(('enableSimplifyDebtsToggle', tripId))).value ?? false;

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Trip settings'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: trip == null
          ? const EmptyState(icon: AppIcons.settings, title: 'Trip not found', subtitle: 'It may have been deleted.')
          : context.tokens.horizon
          ? _horizon(context, ref, trip, isOwner: isOwner, muted: muted, simplify: simplifyFlag, approval: approvalFlag)
          : ListView(
              padding: const EdgeInsets.only(bottom: 32),
              children: [
                SettingsSection(
                  title: 'Notifications',
                  children: [
                    SettingsSwitchTile(
                      key: const Key('trip-mute'),
                      icon: Icons.notifications_off_outlined,
                      title: 'Mute this trip',
                      subtitle: 'No push alerts from this trip. In-app notifications still arrive.',
                      value: muted,
                      onChanged: (v) async {
                        await ref.read(notificationPrefsRepositoryProvider).setTripMuted(tripId, v);
                        ref.invalidate(tripMutedProvider(tripId));
                      },
                    ),
                  ],
                ),
                SettingsSection(
                  title: 'Money',
                  children: [
                    if (simplifyFlag)
                      SettingsSwitchTile(
                        key: const Key('trip-simplify'),
                        icon: Icons.swap_horiz_rounded,
                        title: 'Simplify debts',
                        subtitle: 'Fewest payments to settle up',
                        value: trip.simplifyDebts,
                        onChanged: isOwner ? (v) => repo.setSimplifyDebts(tripId, v) : null,
                      ),
                    if (approvalFlag)
                      SettingsTile(
                        key: const Key('trip-approval'),
                        icon: Icons.verified_user_outlined,
                        title: context.l10n.approvalTitle,
                        subtitle: trip.approvalThreshold == null
                            ? context.l10n.approvalOff
                            : context.l10n.approvalOn(
                                formatMoney(
                                  context,
                                  trip.approvalThreshold!,
                                  trip.baseCurrency.isEmpty ? 'INR' : trip.baseCurrency,
                                ),
                              ),
                        onTap: isOwner ? () => _threshold(context, ref, trip) : null,
                      ),
                    SettingsTile(
                      key: const Key('trip-categories'),
                      icon: Icons.sell_outlined,
                      title: 'Categories',
                      onTap: () => context.push('/trip/$tripId/categories'),
                    ),
                    SettingsTile(
                      key: const Key('trip-recycle'),
                      icon: Icons.delete_outline_rounded,
                      title: 'Recycle bin',
                      onTap: () => context.push('/trip/$tripId/recycle-bin'),
                    ),
                  ],
                ),
                if (isOwner)
                  SettingsSection(
                    title: 'Trip state',
                    children: [
                      SettingsSwitchTile(
                        key: const Key('trip-freeze'),
                        icon: Icons.lock_outline_rounded,
                        title: 'Freeze trip',
                        subtitle: 'Read-only: nobody can add or edit expenses',
                        value: trip.frozen,
                        onChanged: (v) => _state(context, ref, v ? 'Trip frozen' : 'Trip unfrozen', frozen: v),
                      ),
                      SettingsSwitchTile(
                        key: const Key('trip-close'),
                        icon: Icons.check_circle_outline_rounded,
                        title: 'Trip closed',
                        subtitle: 'Marks the trip as settled and finished',
                        value: trip.closed,
                        onChanged: (v) => _state(context, ref, v ? 'Trip closed' : 'Trip reopened', closed: v),
                      ),
                      SettingsSwitchTile(
                        key: const Key('trip-archive'),
                        icon: Icons.inventory_2_outlined,
                        title: 'Archive',
                        subtitle: 'Hide from the main list',
                        value: trip.archived,
                        onChanged: (v) => repo.setTripState(tripId, archived: v),
                      ),
                    ],
                  ),
              ],
            ),
    );
  }
}

/// What the approval-threshold sheet returns: [value] null means "turn the threshold off".
class ApprovalThresholdResult {
  const ApprovalThresholdResult(this.value);
  final double? value;
}

/// Body of the approval-threshold sheet: currency-prefixed amount field with a live "Expenses above ?X need
/// approval" preview. Empty field = off; zero, negative or non-numeric input is refused.
class ApprovalThresholdSheet extends StatefulWidget {
  const ApprovalThresholdSheet({required this.currency, this.initial, super.key});

  final String currency;
  final double? initial;

  @override
  State<ApprovalThresholdSheet> createState() => _ApprovalThresholdSheetState();
}

class _ApprovalThresholdSheetState extends State<ApprovalThresholdSheet> {
  late final TextEditingController _c = TextEditingController(
    text: widget.initial == null
        ? ''
        : (widget.initial == widget.initial!.roundToDouble()
              ? widget.initial!.toInt().toString()
              : widget.initial!.toString()),
  );

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  /// null = empty (off); NaN = invalid; otherwise the positive amount.
  double? get _parsed {
    final t = _c.text.trim().replaceAll(',', '');
    if (t.isEmpty) return null;
    final v = double.tryParse(t);
    if (v == null || !v.isFinite || v <= 0) return double.nan;
    return v;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tk = context.tokens;
    final v = _parsed;
    final invalid = v != null && v.isNaN;
    final preview = invalid
        ? l10n.approvalInvalid
        : v == null
        ? l10n.approvalPreviewOff
        : l10n.approvalOn(formatMoney(context, v, widget.currency));
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('threshold-field'),
            controller: _c,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: AppTypography.moneyDisplay(
              fontSize: 28,
              color: tk.textPrimary,
            ).copyWith(fontWeight: FontWeight.w800, fontFeatures: AppTypography.tabularFigures),
            decoration: InputDecoration(
              prefixText: '${getCurrencySymbol(widget.currency)} ',
              suffixText: widget.currency,
              hintText: l10n.approvalHint,
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),
          Text(
            preview,
            key: const Key('threshold-preview'),
            style: TextStyle(fontWeight: FontWeight.w600, color: invalid ? tk.colorDanger : tk.textSecondary),
          ),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('threshold-save'),
            label: l10n.actionSave,
            onPressed: invalid ? null : () => Navigator.pop(context, ApprovalThresholdResult(v)),
          ),
          if (widget.initial != null)
            Align(
              alignment: Alignment.center,
              child: TextButton(
                key: const Key('threshold-off'),
                onPressed: () => Navigator.pop(context, const ApprovalThresholdResult(null)),
                child: Text(l10n.approvalTurnOff),
              ),
            ),
        ],
      ),
    );
  }
}
