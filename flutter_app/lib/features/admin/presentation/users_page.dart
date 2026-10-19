import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// The user directory: ban / unban, delete, and broadcast an in-app notification to everyone.
class UsersPage extends ConsumerStatefulWidget {
  const UsersPage({super.key});

  @override
  ConsumerState<UsersPage> createState() => _UsersPageState();
}

class _UsersPageState extends ConsumerState<UsersPage> {
  String _query = '';

  Future<void> _refresh() async {
    ref.invalidate(adminUsersProvider);
    await ref.read(adminUsersProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final users = ref.watch(adminUsersProvider);
    final t = context.tokens;
    return AdminAsync<List<AdminUser>>(
      value: users,
      onRefresh: _refresh,
      builder: (context, all) {
        final q = _query.trim().toLowerCase();
        final shown = [
          for (final u in all)
            if (q.isEmpty || u.email.toLowerCase().contains(q) || (u.displayName ?? '').toLowerCase().contains(q)) u,
        ];
        return ListView(
          key: const Key('user-list'),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            AdminSearchField(hint: 'Search ${all.length} users', onChanged: (v) => setState(() => _query = v)),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: AppButton(
                key: const Key('user-broadcast'),
                label: 'Broadcast notification',
                icon: Icons.campaign_rounded,
                variant: AppButtonVariant.secondary,
                onPressed: () => AppSheet.show<void>(
                  context: context,
                  title: 'Broadcast to everyone',
                  builder: (_) => const _BroadcastSheet(),
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (shown.isEmpty)
              const EmptyState(
                icon: Icons.person_search_rounded,
                title: 'No users',
                subtitle: 'Nothing matches that search.',
              )
            else
              for (final u in shown)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: BentoTile(
                    key: Key('user-${u.id}'),
                    padding: const EdgeInsets.all(12),
                    onTap: () => _open(context, u),
                    child: Row(
                      children: [
                        AppAvatar(name: u.label, size: 40),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                u.label,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontWeight: FontWeight.w700, color: t.textPrimary),
                              ),
                              Text(
                                u.email,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 12.5, color: t.textSecondary),
                              ),
                              Text(
                                'Joined ${adminDate(u.createdAt)}${u.signupSource == null ? '' : ' · ${u.signupSource}'}',
                                style: TextStyle(fontSize: 11.5, color: t.textMuted),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (u.isSuperadmin) AdminPill('SUPERADMIN', color: t.primaryAccent),
                            if (u.banned) ...[const SizedBox(height: 4), AdminPill('BANNED', color: t.colorDanger)],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
          ],
        );
      },
    );
  }

  Future<void> _open(BuildContext context, AdminUser u) async {
    final changed = await AppSheet.show<bool>(
      context: context,
      title: u.label,
      builder: (_) => UserActionsSheet(user: u),
    );
    if (changed == true) ref.invalidate(adminUsersProvider);
  }
}

class UserActionsSheet extends ConsumerStatefulWidget {
  const UserActionsSheet({required this.user, super.key});

  final AdminUser user;

  @override
  ConsumerState<UserActionsSheet> createState() => _UserActionsSheetState();
}

class _UserActionsSheetState extends ConsumerState<UserActionsSheet> {
  bool _busy = false;
  String? _error;

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final u = widget.user;
    final t = context.tokens;
    final repo = ref.read(adminRepositoryProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(u.email, style: TextStyle(color: t.textSecondary)),
          const SizedBox(height: 4),
          Text('ID ${u.id}', style: TextStyle(fontSize: 11, color: t.textMuted)),
          const SizedBox(height: 16),
          if (u.isSuperadmin)
            Text('Superadmin accounts cannot be banned or deleted here.', style: TextStyle(color: t.textSecondary))
          else ...[
            AppButton(
              key: const Key('user-ban'),
              label: u.banned ? 'Unban user' : 'Ban user',
              icon: u.banned ? Icons.lock_open_rounded : Icons.block_rounded,
              variant: AppButtonVariant.secondary,
              isLoading: _busy,
              onPressed: _busy
                  ? null
                  : () async {
                      if (!u.banned) {
                        final ok = await ConfirmDialog.show(
                          context: context,
                          title: 'Ban ${u.label}?',
                          message: 'They are signed out of every device and cannot sign in until unbanned.',
                          confirmLabel: 'Ban',
                          isDestructive: true,
                        );
                        if (!ok) return;
                      }
                      await _run(() => repo.setUserBanned(u.id, !u.banned));
                    },
            ),
            const SizedBox(height: 10),
            AppButton(
              key: const Key('user-delete'),
              label: 'Delete account',
              icon: Icons.delete_forever_rounded,
              variant: AppButtonVariant.secondary,
              onPressed: _busy
                  ? null
                  : () async {
                      final ok = await ConfirmDialog.show(
                        context: context,
                        title: 'Delete ${u.label}?',
                        message: 'This permanently removes the account and cannot be undone.',
                        confirmLabel: 'Delete',
                        isDestructive: true,
                      );
                      if (ok) await _run(() => repo.deleteUser(u.id));
                    },
            ),
          ],
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                _error!,
                key: const Key('user-error'),
                style: TextStyle(color: t.colorDanger),
              ),
            ),
        ],
      ),
    );
  }
}

class _BroadcastSheet extends ConsumerStatefulWidget {
  const _BroadcastSheet();

  @override
  ConsumerState<_BroadcastSheet> createState() => _BroadcastSheetState();
}

class _BroadcastSheetState extends ConsumerState<_BroadcastSheet> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
      setState(() => _error = 'Add a title and a message.');
      return;
    }
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Send to every user?',
      message: 'This notification goes to everyone and cannot be recalled.',
      confirmLabel: 'Send',
    );
    if (!ok) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final n = await ref.read(adminRepositoryProvider).broadcast(_title.text.trim(), _body.text.trim());
      if (!mounted) return;
      Navigator.of(context).pop();
      adminToast(context, 'Sent to $n users');
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppTextField(key: const Key('broadcast-title'), controller: _title, label: 'Title'),
        const SizedBox(height: 10),
        AppTextField(key: const Key('broadcast-body'), controller: _body, label: 'Message', maxLines: 3),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _error!,
              key: const Key('broadcast-error'),
              style: TextStyle(color: context.tokens.colorDanger),
            ),
          ),
        const SizedBox(height: 14),
        AppButton(key: const Key('broadcast-send'), label: 'Send', isLoading: _busy, onPressed: _busy ? null : _send),
      ],
    ),
  );
}
