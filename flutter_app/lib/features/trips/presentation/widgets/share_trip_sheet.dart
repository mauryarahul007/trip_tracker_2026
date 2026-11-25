import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../core/clock.dart';
import '../../../../core/platform/external_launcher.dart';
import '../../../../core/platform/share_service.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/flag_defaults.g.dart';
import '../../../../domain/logic/trip_utilities.dart' show buildCanonicalJoinLink, canonicalAppOrigin;
import '../../../../domain/models/join_share.dart';
import '../../../../domain/models/trip.dart';
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../trip_details/application/trip_nav.dart';
import '../../../../shared/widgets/cached_photo.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../application/trips_providers.dart' show tripCoverKey, tripCoverProvider;
import 'invite_card.dart';

String shareLinkFor(String token) => '$canonicalAppOrigin/share/$token';

/// Invite sheet: join code + QR + share, and the read-only view link.
class ShareTripSheet extends ConsumerStatefulWidget {
  const ShareTripSheet({required this.tripId, super.key});
  final String tripId;

  @override
  ConsumerState<ShareTripSheet> createState() => _ShareTripSheetState();
}

class _ShareTripSheetState extends ConsumerState<ShareTripSheet> {
  ShareLinkState? _link; // after generate/revoke in this sheet; otherwise from the synced trip
  bool _busy = false;
  bool _viewOnly = false; // Horizon: the Can add expenses / View only switch
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
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.l10n.inviteCopied), duration: const Duration(seconds: 2)));
  }

  /// The invite picture (photo, name, dates, code, QR) through the share sheet.
  Future<void> _shareCard(Trip trip, String code, String joinLink) async {
    final l10n = context.l10n;
    final cover = await ref.read(tripCoverProvider(tripCoverKey(trip)).future).catchError((_) => null);
    Uint8List? photo;
    if (cover != null && cover.isNotEmpty) {
      try {
        photo = await PhotoCache.instance.bytes(cover);
      } catch (_) {
        photo = null;
      }
    }
    final dates = trip.startDate.isEmpty ? '' : formatDateRange(trip.startDate, trip.endDate);
    final png = await renderInviteCardPng(
      tripName: trip.name,
      dates: dates,
      code: code,
      link: joinLink,
      joinLabel: l10n.inviteJoinCode,
      scanLabel: l10n.inviteCardScan,
      coverBytes: photo,
    );
    if (!mounted) return;
    await ref
        .read(shareServiceProvider)
        .sharePng(png, fileName: inviteCardFileName(trip.name), text: l10n.inviteShareText(trip.name, joinLink, code));
  }

  /// Read-only share link: title, body, then create / share / copy / revoke (owner only).
  List<Widget> _viewOnlyBlock(Trip trip, ShareLinkState? link, bool active, bool canManage) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    return [
      Text(
        l10n.viewOnlyTitle,
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: tokens.textPrimary),
      ),
      const SizedBox(height: 4),
      Text(l10n.viewOnlyBody, style: TextStyle(fontSize: 13, color: tokens.textSecondary)),
      const SizedBox(height: 12),
      if (!canManage)
        Text(l10n.viewOnlyOwnerOnly, style: TextStyle(fontSize: 13, color: tokens.textMuted))
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
                onPressed: () =>
                    ref.read(shareServiceProvider).share(l10n.viewOnlyShareText(trip.name, shareLinkFor(link.token))),
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
                  return ShareLinkState(token: link.token, enabled: false, expiresAt: link.expiresAt);
                }),
        ),
      ] else
        AppButton(
          label: l10n.viewOnlyCreate,
          variant: AppButtonVariant.secondary,
          isLoading: _busy,
          isFullWidth: true,
          onPressed: _busy ? null : () => _change(() => ref.read(shareRepositoryProvider).generate(trip.id)),
        ),
    ];
  }

  /// WhatsApp when it is installed, otherwise the system share sheet.
  Future<void> _whatsApp(String text) async {
    final opened = await ref
        .read(externalLauncherProvider)(Uri.parse('whatsapp://send?text=${Uri.encodeComponent(text)}'))
        .catchError((_) => false);
    if (!opened) await ref.read(shareServiceProvider).share(text);
  }

  /// Horizon ("Invite and share" mockup): QR beside a big trip code with Copy, a Can add expenses / View only
  /// switch (View only shows the read-only link), then WhatsApp and Copy link.
  Widget _horizon(
    Trip trip,
    String code,
    String joinLink,
    ShareLinkState? link,
    bool active,
    bool canManage,
    bool linkEnabled,
    bool inviteCardOn,
  ) {
    final l10n = context.l10n;
    final t = context.tokens;
    final text = l10n.inviteShareText(trip.name, joinLink, code);
    Widget seg(String key, String label, bool on) => Expanded(
      child: GestureDetector(
        key: Key(key),
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _viewOnly = key == 'invite-view-only'),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: on ? t.bgSurface : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: on
                ? [BoxShadow(color: t.shadowBase.withValues(alpha: 0.08), blurRadius: 6, offset: const Offset(0, 1))]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontBody,
              fontSize: 14,
              fontWeight: on ? FontWeight.w700 : FontWeight.w500,
              color: on ? t.textPrimary : t.textSecondary,
            ),
          ),
        ),
      ),
    );
    return SingleChildScrollView(
      key: const Key('horizon-invite'),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                key: const Key('join-qr'),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
                child: Semantics(
                  label: l10n.joinTripTitle,
                  child: QrImageView(key: ValueKey(joinLink), data: joinLink, size: 104),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.horizonTripCode.toUpperCase(),
                      style: TextStyle(
                        fontFamily: AppTypography.fontMono,
                        fontSize: 12,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w600,
                        color: t.textSecondary,
                      ),
                    ),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: SelectableText(
                        code,
                        key: const Key('join-code'),
                        style: TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 34,
                          letterSpacing: 3,
                          fontWeight: FontWeight.w800,
                          color: t.textPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    TextButton.icon(
                      key: const Key('invite-copy-code'),
                      style: TextButton.styleFrom(
                        backgroundColor: t.primaryAccentLight,
                        foregroundColor: t.primaryAccent,
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _copy(code),
                      icon: const Icon(Icons.copy_rounded, size: 14),
                      label: Text(
                        l10n.horizonCopy,
                        style: const TextStyle(fontFamily: AppTypography.fontBody, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (linkEnabled) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: t.bgSurfaceHover, borderRadius: BorderRadius.circular(14)),
              child: Row(
                children: [
                  seg('invite-can-add', l10n.horizonCanAddExpenses, !_viewOnly),
                  seg('invite-view-only', l10n.horizonViewOnly, _viewOnly),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          if (_viewOnly && linkEnabled) ...[
            ..._viewOnlyBlock(trip, link, active, canManage),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                key: const Key('share-error'),
                style: TextStyle(color: t.colorDanger, fontSize: 13),
              ),
            ],
          ] else ...[
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: FilledButton.icon(
                      key: const Key('invite-whatsapp'),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        textStyle: const TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      onPressed: () => _whatsApp(text),
                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                      label: const Text('WhatsApp'),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton.icon(
                      key: const Key('invite-copy-link'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: t.textPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        textStyle: const TextStyle(
                          fontFamily: AppTypography.fontBody,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      onPressed: () => _copy(joinLink),
                      icon: const Icon(Icons.link_rounded, size: 18),
                      label: Text(l10n.inviteCopyLink),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextButton(
              key: const Key('invite-share-more'),
              onPressed: () => ref.read(shareServiceProvider).share(text, subject: trip.name),
              child: Text(l10n.inviteShare),
            ),
            if (inviteCardOn)
              TextButton(
                key: const Key('share-invite-card'),
                onPressed: () => _shareCard(trip, code, joinLink),
                child: Text(l10n.inviteCardShare),
              ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;
    final trip = ref.watch(tripProvider(widget.tripId)).value;
    if (trip == null) {
      return const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()));
    }
    final auth = ref.watch(authRepositoryProvider).currentUser;
    final canManage = trip.ownerId == auth?.id;
    final now = ref.read(nowProvider)();
    final code = trip.joinCode;
    final joinLink = code.isEmpty ? '' : buildCanonicalJoinLink(code);
    final inviteCardOn = ref.watch(flagProvider(('enableInviteCard', widget.tripId))).value ?? true;
    final link = _link ?? _fromTrip(trip);
    final active = link?.isActive(now) ?? false;
    // Same Ops Deck flag as the web's ShareTripModal (per-trip overrides apply).
    final linkEnabled =
        ref.watch(flagProvider(('enableTripShareLink', widget.tripId))).value ??
        (defaultFeatureFlags['enableTripShareLink'] ?? false);

    if (tokens.horizon && code.isNotEmpty) {
      return _horizon(trip, code, joinLink, link, active, canManage, linkEnabled, inviteCardOn);
    }

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
                fontSize: 34,
                letterSpacing: 8,
                fontWeight: FontWeight.w800,
                color: tokens.primaryAccent,
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Container(
                key: const Key('join-qr'),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: tokens.borderColor),
                ),
                child: Semantics(
                  label: l10n.joinTripTitle,
                  child: QrImageView(key: ValueKey(joinLink), data: joinLink, size: 180),
                ),
              ),
            ),
            const SizedBox(height: 16),
            AppButton(
              label: l10n.inviteShare,
              isFullWidth: true,
              onPressed: () => ref
                  .read(shareServiceProvider)
                  .share(l10n.inviteShareText(trip.name, joinLink, code), subject: trip.name),
            ),
            if (inviteCardOn) ...[
              const SizedBox(height: 8),
              AppButton(
                key: const Key('share-invite-card'),
                label: l10n.inviteCardShare,
                variant: AppButtonVariant.secondary,
                isFullWidth: true,
                onPressed: () => _shareCard(trip, code, joinLink),
              ),
            ],
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
          if (linkEnabled) ...[const Divider(height: 36), ..._viewOnlyBlock(trip, link, active, canManage)],
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
