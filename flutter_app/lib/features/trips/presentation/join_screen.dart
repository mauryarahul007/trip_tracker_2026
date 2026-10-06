import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../data/auth/social_auth.dart';
import '../../../domain/logic/trip_utilities.dart' show buildAutoGroupName, formatDateRange;
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../auth/application/auth_messages.dart';
import '../../auth/application/social_sign_in.dart';
import '../../../domain/repositories/repositories.dart';
import '../application/join_controller.dart';

String _cooldown(int sec) => sec >= 60 ? '${sec ~/ 60}m ${sec % 60}s' : '${sec}s';

/// `/join/:code`: public preview when signed out, claim flow when signed in.
class JoinScreen extends ConsumerStatefulWidget {
  const JoinScreen({required this.inviteCode, super.key});
  final String inviteCode;

  @override
  ConsumerState<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends ConsumerState<JoinScreen> {
  bool _busy = false;
  String? _signInError;

  String get _code => widget.inviteCode.trim().toUpperCase();

  Future<void> _social(Future<void> Function(WidgetRef) action) async {
    setState(() {
      _busy = true;
      _signInError = null;
    });
    try {
      await action(ref);
      // Signing in rebuilds the controller (it watches auth) into the claim flow.
    } on AuthException catch (e) {
      if (mounted) setState(() => _signInError = authErrorMessage(e.failure, context.l10n));
    } catch (_) {
      if (mounted) setState(() => _signInError = context.l10n.authErrorGeneric);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final auth = ref.watch(authStateProvider);
    final state = ref.watch(joinControllerProvider(_code));
    final controller = ref.read(joinControllerProvider(_code).notifier);

    // Successful claim: go straight into the trip.
    ref.listen(joinControllerProvider(_code), (prev, next) {
      final id = next.joinedTripId;
      if (id != null && prev?.joinedTripId != id) context.go('/trip/$id');
    });

    Widget card(List<Widget> children) => Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: tokens.bgSurface,
                  borderRadius: BorderRadius.circular(tokens.radiusLg),
                  border: Border.all(color: tokens.borderColor),
                ),
                child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
              ),
            ),
          ),
        );

    Text title(String t) => Text(t, textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: tokens.textPrimary));
    Text body(String t) => Text(t, textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: tokens.textSecondary, height: 1.4));
    const gap = SizedBox(height: 12);

    void home() => context.go(auth.isAuthenticated ? '/' : '/login');
    final homeLabel = auth.isAuthenticated ? l10n.joinGoToTrips : l10n.joinBackToSignIn;

    final Widget content = switch (state.status) {
      JoinStatus.loading || JoinStatus.claiming => const Center(child: CircularProgressIndicator()),
      JoinStatus.invalid => card([
          title(l10n.joinInvalidTitle),
          gap,
          body(l10n.joinInvalidBody),
          const SizedBox(height: 20),
          AppButton(label: homeLabel, isFullWidth: true, onPressed: home),
        ]),
      JoinStatus.error => card([
          title(l10n.joinErrorTitle),
          gap,
          body((state.lockoutSeconds ?? 0) > 0
              ? l10n.joinTooManyAttempts(_cooldown(state.lockoutSeconds!))
              : (state.message?.isNotEmpty ?? false)
                  ? state.message!
                  : l10n.errorGenericMessage),
          const SizedBox(height: 20),
          AppButton(label: l10n.actionRetry, isFullWidth: true, onPressed: (state.lockoutSeconds ?? 0) > 0 ? null : controller.load),
        ]),
      JoinStatus.preview => () {
          final p = state.preview!;
          final names = p.memberFirstNames;
          final who = names.isEmpty
              ? null
              : names.length == 1
                  ? l10n.joinAlreadyOnTrip(buildAutoGroupName(names))
                  : l10n.joinAlreadyOnTripPlural(buildAutoGroupName(names));
          final apple = ref.read(socialAuthProvider).appleAvailable;
          return card([
            title(l10n.joinInvitedTitle(p.tripName)),
            if (p.startDate.isNotEmpty) ...[gap, body(formatDateRange(p.startDate, p.endDate))],
            if (who != null) ...[gap, body(who)],
            gap,
            body(auth.isLocalOnly ? l10n.joinGuestsCantJoin : l10n.joinSignInPrompt),
            if (_signInError != null) ...[
              gap,
              Text(_signInError!, key: const Key('join-error'), textAlign: TextAlign.center, style: TextStyle(color: tokens.colorDanger, fontSize: 13)),
            ],
            const SizedBox(height: 20),
            AppButton(label: l10n.authContinueGoogle, isFullWidth: true, isLoading: _busy, onPressed: _busy ? null : () => _social(signInWithGoogle)),
            if (apple) ...[
              gap,
              AppButton(label: l10n.authContinueApple, isFullWidth: true, variant: AppButtonVariant.secondary, onPressed: _busy ? null : () => _social(signInWithApple)),
            ],
            TextButton(
              onPressed: () => context.go('/login?next=${Uri.encodeComponent('/join/$_code')}'),
              child: Text(l10n.joinMoreSignIn),
            ),
          ]);
        }(),
      JoinStatus.ready => () {
          final lookup = state.lookup!;
          return card([
            title(l10n.joinPickTitle(lookup.tripName)),
            gap,
            body(l10n.joinPickSubtitle),
            if (state.claimedByOther) ...[
              gap,
              Text(l10n.joinClaimedByOther, key: const Key('claimed-by-other'), textAlign: TextAlign.center, style: TextStyle(color: tokens.colorWarning, fontSize: 13)),
            ],
            if ((state.message ?? '').isNotEmpty) ...[gap, Text(state.message!, textAlign: TextAlign.center, style: TextStyle(color: tokens.colorDanger, fontSize: 13))],
            const SizedBox(height: 16),
            for (final m in lookup.unclaimedMembers)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: AppButton(
                  label: l10n.joinImMember(m.name),
                  icon: AppIcons.members,
                  variant: AppButtonVariant.secondary,
                  isFullWidth: true,
                  onPressed: () => controller.claim(m.id),
                ),
              ),
          ]);
        }(),
      JoinStatus.alreadyIn => card([
          title(l10n.joinAlreadyInTitle(state.lookup!.tripName)),
          gap,
          body(state.lookup!.isAdmin ? l10n.joinYoureAdmin : l10n.joinAlreadyClaimed),
          const SizedBox(height: 20),
          AppButton(label: l10n.joinOpenTrip, isFullWidth: true, onPressed: () => context.go('/trip/${state.lookup!.tripId}')),
        ]),
      JoinStatus.allClaimed => card([
          title(l10n.joinEveryoneTitle),
          gap,
          body(l10n.joinEveryoneBody(state.lookup!.tripName)),
          const SizedBox(height: 20),
          AppButton(label: l10n.joinGoToTrips, isFullWidth: true, onPressed: home),
        ]),
    };

    return AppScaffold(
      appBar: AppBar(
        title: Text(l10n.joinTripTitle),
        leading: IconButton(
          tooltip: l10n.actionBack,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.canPop() ? context.pop() : home(),
        ),
      ),
      body: SafeArea(child: content),
    );
  }
}
