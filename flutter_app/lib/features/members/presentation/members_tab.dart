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
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/ask_text.dart';
import '../../expenses/application/expenses_providers.dart';
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
    final canManage = ref.watch(isTripAdminProvider(tripId)) ||
        canManageTrip(trip, ref.watch(myMemberIdProvider(tripId)), ref.watch(isTripAdminProvider(tripId)));
    final active = [for (final m in members) if (!m.archived) m];
    final archived = [for (final m in members) if (m.archived) m];
    final balances = {for (final b in settlement?.balances ?? const <MemberBalance>[]) b.memberId: b.balance};

    return ListView(
      key: const Key('tab-members'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Row(children: [
          Expanded(child: AppButton(key: const Key('member-add'), label: l10n.memAdd, onPressed: () => _add(context, ref))),
          const SizedBox(width: 8),
          Expanded(
            child: AppButton(
              key: const Key('member-invite'),
              label: l10n.memInvite,
              variant: AppButtonVariant.secondary,
              onPressed: () => AppSheet.show<void>(context: context, title: l10n.inviteSheetTitle, builder: (_) => ShareTripSheet(tripId: tripId)),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        for (final m in active) _row(context, ref, m, balances[m.id], money, canManage, trip?.baseCurrency ?? 'INR'),
        if (archived.isNotEmpty) ...[
          Padding(padding: const EdgeInsets.only(top: 16, bottom: 4), child: Text(l10n.memArchived, style: const TextStyle(fontWeight: FontWeight.w700))),
          for (final m in archived) _row(context, ref, m, balances[m.id], false, canManage, trip?.baseCurrency ?? 'INR'),
        ],
        Padding(padding: const EdgeInsets.only(top: 20, bottom: 8), child: Text(l10n.memGroups, style: const TextStyle(fontWeight: FontWeight.w700))),
        AppButton(key: const Key('member-group-add'), label: l10n.memAddGroup, variant: AppButtonVariant.secondary, onPressed: () => _addGroup(context, ref, active)),
        for (final g in groups)
          ListTile(
            key: Key('group-${g.id}'),
            contentPadding: EdgeInsets.zero,
            title: Text(g.name),
            subtitle: Text('${g.memberIds.length}'),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton(key: Key('group-rename-${g.id}'), icon: const Icon(Icons.edit_outlined), onPressed: () => _renameGroup(context, ref, g)),
              IconButton(key: Key('group-delete-${g.id}'), icon: const Icon(Icons.delete_outline), onPressed: () => ref.read(memberRepositoryProvider).deleteGroup(g.id)),
            ]),
          ),
      ],
    );
  }

  Widget _row(BuildContext context, WidgetRef ref, Member m, double? balance, bool money, bool canManage, String currency) {
    final l10n = context.l10n;
    final role = getMemberRole(ref.watch(tripProvider(tripId)).value, m.id);
    String? moneyText;
    if (money && balance != null && balance.abs() >= 0.005) {
      final amount = formatMoney(context, balance.abs(), currency);
      moneyText = balance > 0 ? l10n.ledOwed(amount) : l10n.ledOwes(amount);
    }
    return ListTile(
      key: Key('member-${m.id}'),
      contentPadding: EdgeInsets.zero,
      title: Text(m.name),
      subtitle: Text(moneyText == null ? _roleLabel(l10n, role) : '${_roleLabel(l10n, role)} · $moneyText'),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        if (canManage)
          PopupMenuButton<String>(
            key: Key('member-role-${m.id}'),
            initialValue: role,
            onSelected: (v) => ref.read(tripRepositoryProvider).setMemberRole(tripId, m.id, v),
            itemBuilder: (_) => [
              PopupMenuItem(value: 'organizer', child: Text(l10n.memRoleOrganizer)),
              PopupMenuItem(value: 'contributor', child: Text(l10n.memRoleContributor)),
              PopupMenuItem(value: 'viewer', child: Text(l10n.memRoleViewer)),
            ],
            child: const Icon(Icons.badge_outlined),
          ),
        IconButton(
          key: Key('member-rename-${m.id}'),
          icon: const Icon(Icons.edit_outlined),
          onPressed: () => _rename(context, ref, m),
        ),
        IconButton(
          key: Key('member-archive-${m.id}'),
          icon: Icon(m.archived ? Icons.unarchive_outlined : Icons.archive_outlined),
          onPressed: () => ref.read(memberRepositoryProvider).setArchived(m.id, !m.archived),
        ),
      ]),
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
    final created = await showDialog<_GroupDraft>(
      context: context,
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
    return AlertDialog(
      title: Text(l10n.memAddGroup),
      content: SizedBox(
        width: 360,
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(key: const Key('group-name'), controller: _name, decoration: InputDecoration(labelText: l10n.memName)),
          for (final m in widget.members)
            CheckboxListTile(
              key: Key('group-pick-${m.id}'),
              value: _picked.contains(m.id),
              title: Text(m.name),
              onChanged: (v) => setState(() => v == true ? _picked.add(m.id) : _picked.remove(m.id)),
            ),
        ]),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.actionCancel)),
        TextButton(
          key: const Key('group-save'),
          onPressed: () => Navigator.pop(context, _GroupDraft(_name.text.trim(), _picked.toList())),
          child: Text(l10n.actionSave),
        ),
      ],
    );
  }
}
