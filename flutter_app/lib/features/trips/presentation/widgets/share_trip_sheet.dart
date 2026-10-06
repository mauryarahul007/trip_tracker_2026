import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../core/clock.dart';
import '../../../../core/platform/share_service.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/flag_defaults.g.dart';
import '../../../../domain/logic/trip_utilities.dart'
    show buildCanonicalJoinLink, canonicalAppOrigin;
import '../../../../domain/models/join_share.dart';
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../trip_details/application/trip_nav.dart';

String shareLinkFor(String token) => '$canonicalAppOrigin/share/$token';

/// Invite sheet: join code + QR + share, and the read-only view link.
class ShareTripSheet extends ConsumerStatefulWidget {
  const ShareTripSheet({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<ShareTripSheet> createState() => _ShareTripSheetState();
}

class _ShareTripSheetState extends ConsumerState<ShareTripSheet> {
  ShareLinkState?
  _link; // after generate/revoke in this sheet; otherwise from the synced trip
  bool _busy = false;
  String? _error;

  ShareLinkState? _fromTrip(Trip t) => (t.shareToken ?? '').isEmpty
      ? null
      : ShareLinkState(
          token: t.shareToken!,
          enabled: t.shareEnabled,
          expiresAt: DateTime.tryParse(t.shareExpiresAt ?? ''),
        );

  Future<void> _change(Future<ShareLinkState?> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final next = await action();
      if (mounted) setState(() => _link = next);
    } catch (_) {
      if (mounted) setState(() => _error = context.l10n.viewOnlyOffline);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copy(String text) async {
    await ref.read(shareServiceProvider).copy(text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.l10n.inviteCopied),
          duration: const Duration(seconds: 2),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    if (trip == null) {
      return const SizedBox(
        height: 120,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    final auth = ref.watch(authRepositoryProvider).currentUser;
    final canManage = trip.ownerId == auth?.id;
    final now = ref.read(nowProvider)();
    final code = trip.joinCode;
    final joinLink = code.isEmpty ? '' : buildCanonicalJoinLink(code);
    final link = _link ?? _fromTrip(trip);
    final active = link?.isActive(now) ?? false;
    // Same Ops Deck flag as the web's ShareTripModal (per-trip overrides apply).
    final linkEnabled =
        ref.watch(flagProvider(('enableTripShareLink', widget.tripId))).value ??
        (defaultFeatureFlags['enableTripShareLink'] ?? false);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (code.isEmpty)
            Text(
              l10n.inviteCodePending,
              key: const Key('code-pending'),
              textAlign: TextAlign.center,
              style: TextStyle(color: tokens.textSecondary),
            )
          else ...[
            Text(
              l10n.inviteJoinCode,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: tokens.textMuted),
            ),
            const SizedBox(height: 4),
            SelectableText(
              code,
              key: const Key('join-code'),
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 32,
                letterSpacing: 6,
                fontWeight: FontWeight.w800,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Container(
                key: const Key('join-qr'),
                padding: const EdgeInsets.all(12),
                color: Colors.white,
                child: Semantics(
                  label: l10n.joinTripTitle,
                  child: QrImageView(
                    key: ValueKey(joinLink),
                    data: joinLink,
                    size: 180,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            AppButton(
              label: l10n.inviteShare,
              isFullWidth: true,
              onPressed: () => ref
                  .read(shareServiceProvider)
                  .share(
                    l10n.inviteShareText(trip.name, joinLink, code),
                    subject: trip.name,
                  ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: l10n.inviteCopyCode,
                    variant: AppButtonVariant.secondary,
                    onPressed: () => _copy(code),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AppButton(
                    label: l10n.inviteCopyLink,
                    variant: AppButtonVariant.secondary,
                    onPressed: () => _copy(joinLink),
                  ),
                ),
              ],
            ),
          ],
          if (linkEnabled) ...[
            const Divider(height: 36),
            Text(
              l10n.viewOnlyTitle,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: tokens.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l10n.viewOnlyBody,
              style: TextStyle(fontSize: 13, color: tokens.textSecondary),
            ),
            const SizedBox(height: 12),
            if (!canManage)
              Text(
                l10n.viewOnlyOwnerOnly,
                style: TextStyle(fontSize: 13, color: tokens.textMuted),
              )
            else if (active) ...[
              Text(
                l10n.viewOnlyActiveUntil(
                  '${link!.expiresAt!.toLocal().year}-${link.expiresAt!.toLocal().month.toString().padLeft(2, '0')}-${link.expiresAt!.toLocal().day.toString().padLeft(2, '0')}',
                ),
                style: TextStyle(fontSize: 13, color: tokens.textMuted),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: AppButton(
                      label: l10n.inviteShare,
                      onPressed: () => ref
                          .read(shareServiceProvider)
                          .share(
                            l10n.viewOnlyShareText(
                              trip.name,
                              shareLinkFor(link.token),
                            ),
                          ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: AppButton(
                      label: l10n.inviteCopyLink,
                      variant: AppButtonVariant.secondary,
                      onPressed: () => _copy(shareLinkFor(link.token)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              AppButton(
                label: l10n.viewOnlyRevoke,
                variant: AppButtonVariant.danger,
                isLoading: _busy,
                isFullWidth: true,
                onPressed: _busy
                    ? null
                    : () => _change(() async {
                        await ref.read(shareRepositoryProvider).revoke(trip.id);
                        return ShareLinkState(
                          token: link.token,
                          enabled: false,
                          expiresAt: link.expiresAt,
                        );
                      }),
              ),
            ] else
              AppButton(
                label: l10n.viewOnlyCreate,
                variant: AppButtonVariant.secondary,
                isLoading: _busy,
                isFullWidth: true,
                onPressed: _busy
                    ? null
                    : () => _change(
                        () =>
                            ref.read(shareRepositoryProvider).generate(trip.id),
                      ),
              ),
          ],
          if (linkEnabled && _error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              key: const Key('share-error'),
              style: TextStyle(color: tokens.colorDanger, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }
}
