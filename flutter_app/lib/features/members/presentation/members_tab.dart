import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/env/app_env.dart';
import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../data/supabase/supabase_gateway.dart';
import '../../../domain/logic/member_roles.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/models/group.dart';
import '../../../domain/models/member.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/ask_text.dart';
import '../../expenses/application/expenses_providers.dart';
import '../../settings/presentation/settings_widgets.dart' show SettingsIcon;
import '../../trip_details/application/trip_nav.dart';
import '../../trips/presentation/widgets/share_trip_sheet.dart';

class MembersTab extends ConsumerWidget {
  const MembersTab({required this.tripId, super.key});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final members = ref.watch(tripMembersProvider(tripId)).value ?? const <Member>[];
    final groups = ref.watch(tripGroupsProvider(tripId)).value ?? const <Group>[];
    final trip = ref.watch(tripProvider(tripId)).value;
    final money = ref.watch(flagProvider(('enableMemberMoneyRow', tripId))).value ?? false;
    final settlement = ref.watch(tripSettlementProvider(tripId));
    final canManage =
        ref.watch(isTripAdminProvider(tripId)) ||
        canManageTrip(trip, ref.watch(myMemberIdProvider(tripId)), ref.watch(isTripAdminProvider(tripId)));
    final active = [
      for (final m in members)
        if (!m.archived) m,
    ];
    final archived = [
      for (final m in members)
        if (m.archived) m,
    ];
    final balances = {for (final b in settlement?.balances ?? const <MemberBalance>[]) b.memberId: b.balance};

    return ListView(
      key: const Key('tab-members'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Row(
          children: [
            Expanded(
              child: AppButton(key: const Key('member-add'), label: l10n.memAdd, onPressed: () => _add(context, ref)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: AppButton(
                key: const Key('member-invite'),
                label: l10n.memInvite,
                variant: AppButtonVariant.secondary,
                onPressed: () => AppSheet.show<void>(
                  context: context,
                  title: l10n.inviteSheetTitle,
                  builder: (_) => ShareTripSheet(tripId: tripId),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        for (final m in active) _row(context, ref, m, balances[m.id], money, canManage, trip?.baseCurrency ?? 'INR'),
        if (archived.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 4),
            child: Text(l10n.memArchived, style: _sectionStyle(context)),
          ),
          for (final m in archived)
            _row(context, ref, m, balances[m.id], false, canManage, trip?.baseCurrency ?? 'INR'),
        ],
        Padding(
          padding: const EdgeInsets.only(top: 20, bottom: 8),
          child: Text(l10n.memGroups, style: _sectionStyle(context)),
        ),
        AppButton(
          key: const Key('member-group-add'),
          label: l10n.memAddGroup,
          variant: AppButtonVariant.secondary,
          onPressed: () => _addGroup(context, ref, active),
        ),
        for (final g in groups)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: BentoTile(
              tone: BentoTone.lilac,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              child: ListTile(
                key: Key('group-${g.id}'),
                contentPadding: EdgeInsets.zero,
                leading: const SettingsIcon(Icons.groups_2_outlined),
                title: Text(g.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${g.memberIds.length}'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'Rename',
                      key: Key('group-rename-${g.id}'),
                      icon: const Icon(Icons.edit_outlined),
                      onPressed: () => _renameGroup(context, ref, g),
                    ),
                    IconButton(
                      tooltip: 'Delete',
                      key: Key('group-delete-${g.id}'),
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => ref.read(memberRepositoryProvider).deleteGroup(g.id),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  static TextStyle _sectionStyle(BuildContext context) => TextStyle(
    fontFamily: AppTypography.fontBody,
    fontSize: 12,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.8,
    color: context.tokens.textMuted,
  );

  Widget _row(
    BuildContext context,
    WidgetRef ref,
    Member m,
    double? balance,
    bool money,
    bool canManage,
    String currency,
  ) {
    final l10n = context.l10n;
    final role = getMemberRole(ref.watch(tripProvider(tripId)).value, m.id);
    String? moneyText;
    if (money && balance != null && balance.abs() >= 0.005) {
      final amount = formatMoney(context, balance.abs(), currency);
      moneyText = balance > 0 ? l10n.ledOwed(amount) : l10n.ledOwes(amount);
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: BentoTile(
        tone: toneFor(m.id),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        child: ListTile(
          key: Key('member-${m.id}'),
          contentPadding: EdgeInsets.zero,
          leading: AppAvatar(name: m.name, avatarUrl: m.avatarUrl, size: 40),
          title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (m.email != null && m.email!.isNotEmpty) ...[
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      m.linkedUserId != null ? Icons.check_circle_outline_rounded : Icons.schedule_rounded,
                      size: 12,
                      color: m.linkedUserId != null ? context.tokens.colorSuccess : context.tokens.textMuted,
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        m.email!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 11,
                          color: context.tokens.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 1),
              ],
              Text(moneyText == null ? _roleLabel(l10n, role) : '${_roleLabel(l10n, role)} · $moneyText'),
            ],
          ),
          onTap: canManage ? () => _actions(context, ref, m, role) : null,
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (money && balance != null && balance.abs() >= 0.005)
                Text(
                  '${balance > 0 ? '+' : '-'}${formatMoney(context, balance.abs(), currency)}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: context.tokens.textPrimary, // sign and wording carry the meaning; ink reads on every tile
                  ),
                ),
              if (canManage)
                IconButton(
                  tooltip: 'Member actions',
                  key: Key('member-actions-${m.id}'),
                  icon: const Icon(Icons.more_horiz_rounded),
                  onPressed: () => _actions(context, ref, m, role),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Board 07 "Member actions": role chips, rename, archive / restore in one sheet.
  Future<void> _actions(BuildContext context, WidgetRef ref, Member m, String role) {
    final l10n = context.l10n;
    return AppSheet.show<void>(
      context: context,
      title: m.name,
      builder: (sheetCtx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Role', style: _sectionStyle(sheetCtx)),
            if (m.email != null && m.email!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    m.linkedUserId != null ? Icons.check_circle_outline_rounded : Icons.schedule_rounded,
                    size: 14,
                    color: m.linkedUserId != null ? sheetCtx.tokens.colorSuccess : sheetCtx.tokens.textMuted,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${m.email!} · ${m.linkedUserId != null ? l10n.memGmailLinked : l10n.memGmailPending}',
                    style: TextStyle(
                      fontFamily: AppTypography.fontBody,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: sheetCtx.tokens.textMuted,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final r in const ['organizer', 'contributor', 'viewer'])
                  ChoiceChip(
                    key: Key('member-role-${m.id}-$r'),
                    showCheckmark: false,
                    shape: const StadiumBorder(),
                    label: Text(_roleLabel(l10n, r)),
                    selected: role == r,
                    onSelected: (_) {
                      Navigator.of(sheetCtx).pop();
                      ref.read(tripRepositoryProvider).setMemberRole(tripId, m.id, r);
                    },
                  ),
              ],
            ),
            const SizedBox(height: 12),
            ListTile(
              key: Key('member-rename-${m.id}'),
              contentPadding: EdgeInsets.zero,
              leading: const SettingsIcon(Icons.edit_outlined),
              title: const Text('Rename'),
              onTap: () {
                Navigator.of(sheetCtx).pop();
                _rename(context, ref, m);
              },
            ),
            ListTile(
              key: Key('member-archive-${m.id}'),
              contentPadding: EdgeInsets.zero,
              leading: SettingsIcon(m.archived ? Icons.unarchive_outlined : Icons.archive_outlined),
              title: Text(m.archived ? 'Restore' : 'Archive'),
              onTap: () {
                Navigator.of(sheetCtx).pop();
                ref.read(memberRepositoryProvider).setArchived(m.id, !m.archived);
              },
            ),
          ],
        ),
      ),
    );
  }

  String _roleLabel(AppLocalizations l10n, String role) => switch (role) {
    'organizer' => l10n.memRoleOrganizer,
    'viewer' => l10n.memRoleViewer,
    _ => l10n.memRoleContributor,
  };

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    final draft = await AppSheet.show<_AddMemberDraft>(
      context: context,
      title: context.l10n.memAdd,
      builder: (_) => const _AddMemberSheet(),
    );
    if (draft == null || draft.name.isEmpty || draft.email.isEmpty) return;
    await ref.read(memberRepositoryProvider).addMember(
      tripId,
      draft.name,
      email: draft.email,
      linkedUserId: draft.linkedUserId,
    );
  }

  Future<void> _rename(BuildContext context, WidgetRef ref, Member m) async {
    final name = await askText(context, context.l10n.memName, initial: m.name);
    if (name == null || name.isEmpty) return;
    await ref.read(memberRepositoryProvider).updateMember(m.id, name: name);
  }

  Future<void> _addGroup(BuildContext context, WidgetRef ref, List<Member> active) async {
    final created = await AppSheet.show<_GroupDraft>(
      context: context,
      title: context.l10n.memAddGroup,
      builder: (ctx) => _GroupDialog(members: active),
    );
    if (created == null || created.name.isEmpty || created.memberIds.length < 2) return;
    await ref.read(memberRepositoryProvider).createGroup(tripId, created.name, created.memberIds);
  }

  Future<void> _renameGroup(BuildContext context, WidgetRef ref, Group g) async {
    final name = await askText(context, context.l10n.memName, initial: g.name);
    if (name == null || name.isEmpty) return;
    await ref.read(memberRepositoryProvider).updateGroup(g.id, name, g.memberIds);
  }
}

class _GroupDraft {
  _GroupDraft(this.name, this.memberIds);
  final String name;
  final List<String> memberIds;
}

class _GroupDialog extends StatefulWidget {
  const _GroupDialog({required this.members});
  final List<Member> members;

  @override
  State<_GroupDialog> createState() => _GroupDialogState();
}

class _GroupDialogState extends State<_GroupDialog> {
  final _name = TextEditingController();
  final _picked = <String>{};

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('group-name'),
            controller: _name,
            decoration: InputDecoration(labelText: l10n.memName),
          ),
          const SizedBox(height: 8),
          for (final m in widget.members)
            CheckboxListTile(
              key: Key('group-pick-${m.id}'),
              contentPadding: EdgeInsets.zero,
              secondary: AppAvatar(name: m.name, size: 32),
              value: _picked.contains(m.id),
              title: Text(m.name),
              onChanged: (v) => setState(() => v == true ? _picked.add(m.id) : _picked.remove(m.id)),
            ),
          const SizedBox(height: 12),
            AppButton(
              key: const Key('group-save'),
              label: l10n.actionSave,
              onPressed: () => Navigator.pop(context, _GroupDraft(_name.text.trim(), _picked.toList())),
            ),
          ],
        ),
      );
    }
  }

class _AddMemberDraft {
  const _AddMemberDraft({
    required this.name,
    required this.email,
    this.linkedUserId,
  });

  final String name;
  final String email;
  final String? linkedUserId;
}

class _AddMemberSheet extends ConsumerStatefulWidget {
  const _AddMemberSheet();

  @override
  ConsumerState<_AddMemberSheet> createState() => _AddMemberSheetState();
}

class _AddMemberSheetState extends ConsumerState<_AddMemberSheet> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  String? _error;
  bool _emailManuallyEdited = false;
  bool _searching = false;
  Map<String, dynamic>? _resolvedProfile;
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _onNameChanged(String val) {
    if (!_emailManuallyEdited) {
      final sanitized = val.trim().toLowerCase().replaceAll(RegExp(r'\s+'), '');
      if (sanitized.isNotEmpty) {
        final candidate = '$sanitized@gmail.com';
        _emailController.text = candidate;
        _checkEmail(candidate);
      } else {
        _emailController.clear();
        setState(() {
          _resolvedProfile = null;
          _error = null;
        });
      }
    }
  }

  void _onEmailChanged(String val) {
    _emailManuallyEdited = true;
    _checkEmail(val);
  }

  void _checkEmail(String email) {
    _debounce?.cancel();
    final trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@gmail.com') || trimmed.length <= 10) {
      setState(() {
        _resolvedProfile = null;
        if (_error != null) _error = null;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 300), () async {
      if (!mounted) return;
      if (!AppEnv.current.hasBackend) return;
      setState(() => _searching = true);
      try {
        final client = ref.read<SupabaseGateway>(supabaseGatewayProvider).client;
        final res = await client
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('email', trimmed)
            .maybeSingle();
        if (mounted) {
          setState(() {
            _searching = false;
            _resolvedProfile = res == null ? null : Map<String, dynamic>.from(res as Map);
          });
        }
      } catch (_) {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  void _submit() {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim().toLowerCase();
    final l10n = context.l10n;

    if (name.isEmpty) {
      setState(() => _error = l10n.memName);
      return;
    }
    if (email.isEmpty) {
      setState(() => _error = l10n.memGmailRequired);
      return;
    }
    final gmailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@gmail\.com$', caseSensitive: false);
    if (!gmailRegex.hasMatch(email)) {
      setState(() => _error = l10n.memGmailRestricted);
      return;
    }

    Navigator.of(context).pop(
      _AddMemberDraft(
        name: name,
        email: email,
        linkedUserId: _resolvedProfile?['id'] as String?,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = context.tokens;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            key: const Key('ask-field'),
            controller: _nameController,
            autofocus: true,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: l10n.memName,
              prefixIcon: const Icon(Icons.person_outline),
            ),
            onChanged: _onNameChanged,
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('member-email-field'),
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: l10n.memGmail,
              hintText: l10n.memGmailHint,
              prefixIcon: const Icon(Icons.mail_outline),
              suffixIcon: _searching
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : (_resolvedProfile != null
                      ? Icon(Icons.check_circle_rounded, color: tokens.colorSuccess)
                      : null),
            ),
            onChanged: _onEmailChanged,
          ),
          if (_resolvedProfile != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: tokens.colorSuccess.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(tokens.radiusSm),
                border: Border.all(color: tokens.colorSuccess.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  AppAvatar(
                    name: (_resolvedProfile!['display_name'] as String?) ?? _nameController.text,
                    avatarUrl: _resolvedProfile!['avatar_url'] as String?,
                    size: 24,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${_resolvedProfile!['display_name'] ?? 'Google user'} · ${l10n.memGmailLinked}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: tokens.colorSuccess,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else if (_emailController.text.trim().toLowerCase().endsWith('@gmail.com') &&
              RegExp(r'^[a-zA-Z0-9._%+-]+@gmail\.com$').hasMatch(_emailController.text.trim())) ...[
            const SizedBox(height: 6),
            Text(
              '${l10n.memGmailPending} · will automatically connect when they sign in',
              style: TextStyle(
                fontSize: 11,
                color: tokens.textMuted,
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(
              _error!,
              style: TextStyle(
                color: tokens.colorDanger,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 16),
          AppButton(
            key: const Key('ask-ok'),
            label: l10n.actionSave,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}

