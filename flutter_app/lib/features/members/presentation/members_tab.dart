import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/money.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/member_roles.dart';
import '../../../domain/logic/settlement.dart';
import '../../../domain/models/group.dart';
import '../../../domain/models/member.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_surface.dart';
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
            child: AppCard(
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
    fontFamily: AppTypography.fontMono,
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.0,
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
      child: AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        child: ListTile(
          key: Key('member-${m.id}'),
          contentPadding: EdgeInsets.zero,
          leading: AppAvatar(name: m.name, size: 40),
          title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(moneyText == null ? _roleLabel(l10n, role) : '${_roleLabel(l10n, role)} · $moneyText'),
          onTap: canManage ? () => _actions(context, ref, m, role) : null,
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (money && balance != null && balance.abs() >= 0.005)
                Text(
                  '${balance > 0 ? '+' : '-'}${formatMoney(context, balance.abs(), currency)}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: balance > 0 ? context.tokens.successColor : context.tokens.dangerColor,
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
    final name = await askText(context, context.l10n.memName);
    if (name == null || name.isEmpty) return;
    await ref.read(memberRepositoryProvider).addMember(tripId, name);
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
