import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/platform/share_service.dart';
import '../../../core/settings/app_settings.dart';
import '../../../data/backup/backup_service.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/changelog.g.dart';
import '../../../domain/logic/currency.dart' show defaultExchangeRates;
import '../../../domain/logic/csv_export.dart' show summarizeBackup;
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_avatar.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/bento_tile.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../auth/application/app_lock.dart';
import '../../expenses/presentation/trip_tools_sheet.dart' show textFilePickerProvider;
import '../../trips/presentation/widgets/home_dock.dart';
import 'settings_widgets.dart';

final backupServiceProvider = Provider<BackupService>(
  (ref) => BackupService(
    ref.watch(tripRepositoryProvider),
    ref.watch(memberRepositoryProvider),
    ref.watch(expenseRepositoryProvider),
  ),
);

/// Global settings (web `SettingsView`): profile, appearance, notifications, security,
/// data, about, help. Each row is flag-aware; trip-level settings live on the trip.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _search = TextEditingController();
  var _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _say(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(m, key: const Key('settings-message'))));
  }

  Future<void> _rename() async {
    final auth = ref.read(authStateProvider);
    final c = TextEditingController(text: auth.user?.displayName ?? '');
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Your name'),
        content: TextField(
          key: const Key('profile-name-field'),
          controller: c,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            key: const Key('profile-name-save'),
            onPressed: () => Navigator.pop(ctx, c.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    // No c.dispose(): the dialog is still animating out and would read a disposed controller.
    if (name == null || name.isEmpty) return;
    try {
      await ref.read(authRepositoryProvider).updateDisplayName(name);
    } catch (_) {
      _say('Could not update your name. Check your connection and try again.');
    }
  }

  Future<void> _pickCurrency() async {
    final codes = defaultExchangeRates.keys.toList()..sort();
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            ListTile(
              key: const Key('currency-trip'),
              title: const Text("Follow each trip's currency"),
              onTap: () => Navigator.pop(ctx, ''),
            ),
            for (final c in codes)
              ListTile(key: Key('currency-$c'), title: Text(c), onTap: () => Navigator.pop(ctx, c)),
          ],
        ),
      ),
    );
    if (picked == null) return;
    await ref.read(defaultCurrencyPrefProvider.notifier).set(picked.isEmpty ? null : picked);
  }

  Future<void> _toggleLock(bool on) async {
    final ok = await ref.read(biometricLockEnabledProvider.notifier).setEnabled(on);
    if (!ok) _say('Biometric lock needs a device with Face ID, fingerprint or a screen lock set up.');
  }

  Future<void> _export() async {
    final json = await ref.read(backupServiceProvider).exportJson(now: ref.read(nowProvider)());
    final day = ref.read(nowProvider)().toIso8601String().substring(0, 10);
    await ref
        .read(shareServiceProvider)
        .shareFile(
          utf8.encode(json),
          fileName: 'triptracker-backup-$day.json',
          mimeType: 'application/json',
          subject: 'Trip Tracker backup',
        );
    _say('Backup ready to save or share.');
  }

  Future<void> _import() async {
    final text = await ref.read(textFilePickerProvider)(extensions: const ['json', 'triptracker']);
    if (text == null) return;
    final s = summarizeBackup(text);
    if (!s.valid) {
      _say(s.error ?? 'That file is not a valid backup.');
      return;
    }
    if (!mounted) return;
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Restore backup?',
      message:
          'This adds ${s.tripCount} trip(s) and ${s.expenseCount} expense(s) as new trips. Importing the same file twice creates duplicates.',
      confirmLabel: 'Restore',
    );
    final user = ref.read(authStateProvider).user;
    if (!ok || user == null) return;
    final r = await ref.read(backupServiceProvider).restore(text, userId: user.id, userName: user.displayName ?? 'Me');
    _say(r.ok ? 'Restored ${r.trips} trip(s) and ${r.expenses} expense(s).' : (r.error ?? 'Restore failed.'));
  }

  Future<void> _signOut() async {
    final ok = await ConfirmDialog.show(
      context: context,
      title: 'Sign out?',
      message: 'Unsynced changes are sent first. Data on this device is cleared.',
      confirmLabel: 'Sign out',
    );
    if (ok) await ref.read(authRepositoryProvider).signOut();
  }

  /// One settings page: a flat list under its own app bar (WhatsApp-style drill-down).
  void _open(String title, List<Widget> Function(WidgetRef r) rows, {Key? key}) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _SettingsPage(key: key, title: title, rows: rows),
      ),
    );
  }

  List<Widget> _appearanceRows(WidgetRef r) {
    final themeMode = r.watch(themeModePrefProvider);
    final amoled = r.watch(amoledPrefProvider);
    final amoledFlag = r.watch(flagProvider(('enableAmoledTheme', null))).value ?? false;
    final haptics = r.watch(hapticsEnabledProvider);
    final currency = r.watch(defaultCurrencyPrefProvider);
    return [
      // Not a ListTile trailing: three segments do not fit beside the title at large text sizes.
      Padding(
        key: const Key('settings-theme'),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Theme', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final o in const [
                  ('light', 'Light', Icons.wb_sunny_outlined),
                  ('dark', 'Dark', Icons.nightlight_outlined),
                  ('system', 'Auto', Icons.tune_rounded),
                ])
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _ThemeOption(
                        key: Key('theme-${o.$1}'),
                        label: o.$2,
                        icon: o.$3,
                        selected: themeMode == o.$1,
                        onTap: () => r.read(themeModePrefProvider.notifier).set(o.$1),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
      if (amoledFlag)
        SettingsSwitchTile(
          key: const Key('settings-amoled'),
          icon: Icons.contrast_rounded,
          iconColor: const Color(0xFF5A6173),
          title: 'Pure black dark mode',
          subtitle: 'Saves battery on OLED screens. Applies when the theme is dark.',
          value: amoled,
          onChanged: (v) => r.read(amoledPrefProvider.notifier).set(v),
        ),
      SettingsSwitchTile(
        key: const Key('settings-haptics'),
        icon: Icons.vibration_rounded,
        iconColor: const Color(0xFF8B3CF7),
        title: 'Haptic feedback',
        value: haptics,
        onChanged: (v) => r.read(hapticsEnabledProvider.notifier).set(v),
      ),
      SettingsTile(
        key: const Key('settings-currency'),
        icon: Icons.payments_outlined,
        iconColor: const Color(0xFF16A34A),
        title: 'Default currency',
        subtitle: currency ?? "Follows each trip's currency",
        onTap: _pickCurrency,
      ),
    ];
  }

  List<Widget> _notificationRows(WidgetRef r) => [
    SettingsTile(
      key: const Key('settings-notifications'),
      icon: Icons.notifications_none_rounded,
      iconColor: const Color(0xFF2F6BFF),
      title: 'Notification preferences',
      subtitle: 'Quiet hours, daily digest, muted trips',
      onTap: () => context.push('/settings/notifications'),
    ),
    SettingsSwitchTile(
      key: const Key('settings-pass-reminders'),
      icon: Icons.flight_takeoff_rounded,
      iconColor: const Color(0xFF8B3CF7),
      title: 'Travel pass reminders',
      subtitle: 'A reminder 24 hours and 3 hours before flights and trains',
      value: r.watch(passRemindersEnabledProvider),
      onChanged: (v) => r.read(passRemindersEnabledProvider.notifier).set(v),
    ),
  ];

  List<Widget> _securityRows(WidgetRef r) => [
    SettingsSwitchTile(
      key: const Key('settings-biometric'),
      icon: Icons.fingerprint_rounded,
      iconColor: const Color(0xFF16A34A),
      title: 'Lock with Face ID / fingerprint',
      subtitle: 'Ask to unlock after the app has been in the background',
      value: r.watch(biometricLockEnabledProvider),
      onChanged: _toggleLock,
    ),
  ];

  List<Widget> _dataRows(WidgetRef r) => [
    SettingsTile(
      key: const Key('settings-export'),
      icon: Icons.download_rounded,
      iconColor: const Color(0xFF0EA5C6),
      title: 'Export backup',
      subtitle: 'All trips on this device as a JSON file',
      onTap: _export,
    ),
    SettingsTile(
      key: const Key('settings-import'),
      icon: Icons.upload_rounded,
      iconColor: const Color(0xFFE8890C),
      title: 'Restore backup',
      subtitle: 'Adds the trips in a backup file as new trips',
      onTap: _import,
    ),
  ];

  List<Widget> _helpRows(WidgetRef r) => [
    SettingsTile(
      key: const Key('settings-report-bug'),
      icon: Icons.bug_report_outlined,
      iconColor: const Color(0xFFE5484D),
      title: 'Report a problem',
      onTap: () => context.push('/settings/report-bug'),
    ),
    if (r.watch(flagProvider(('enableFeatureSuggestions', null))).value ?? false)
      SettingsTile(
        key: const Key('settings-feature-request'),
        icon: Icons.lightbulb_outline_rounded,
        iconColor: const Color(0xFFE8890C),
        title: 'Suggest a feature',
        onTap: () => context.push('/settings/feature-request'),
      ),
    SettingsTile(
      key: const Key('settings-diagnostics'),
      icon: Icons.monitor_heart_outlined,
      iconColor: const Color(0xFF0EA5C6),
      title: 'Diagnostics',
      subtitle: 'Sync status and recent logs',
      onTap: () => context.push('/settings/diagnostics'),
    ),
  ];

  List<Widget> _aboutRows(WidgetRef r) {
    final version = r.watch(appVersionProvider).value;
    return [
      SettingsTile(
        key: const Key('settings-about-version'),
        icon: Icons.info_outline_rounded,
        iconColor: const Color(0xFF5A6173),
        title: 'Version',
        subtitle: version == null ? '' : '${version.version} (${version.build})',
      ),
      if (r.watch(flagProvider(('enableWhatsNewHub', null))).value ?? false)
        SettingsTile(
          key: const Key('settings-whats-new'),
          icon: Icons.auto_awesome_rounded,
          iconColor: const Color(0xFF8B3CF7),
          title: "What's new",
          onTap: () => _showChangelog(context),
        ),
      SettingsTile(
        key: const Key('settings-privacy'),
        icon: Icons.privacy_tip_outlined,
        iconColor: const Color(0xFF2F6BFF),
        title: 'Privacy Policy',
        onTap: () => context.push('/privacy'),
      ),
      SettingsTile(
        key: const Key('settings-terms'),
        icon: Icons.description_outlined,
        iconColor: const Color(0xFF5A6173),
        title: 'Terms of Service',
        onTap: () => context.push('/terms'),
      ),
    ];
  }

  List<Widget> _accountRows(WidgetRef r) => [
    SettingsTile(
      key: const Key('settings-delete'),
      title: 'Delete account',
      subtitle: 'Permanently removes your account and its data',
      icon: Icons.delete_outline_rounded,
      danger: true,
      onTap: () => context.push('/delete-account'),
    ),
  ];

  /// Every settings row from every page that matches [q] (tiles only: they carry a title and subtitle).
  List<Widget> _matches(String q, bool security) {
    final all = [
      ..._appearanceRows(ref),
      ..._notificationRows(ref),
      if (security) ..._securityRows(ref),
      ..._dataRows(ref),
      ..._helpRows(ref),
      ..._aboutRows(ref),
      ..._accountRows(ref),
    ];
    final needle = q.toLowerCase();
    bool hit(String? t) => t != null && t.toLowerCase().contains(needle);
    return [
      for (final w in all)
        if (w is SettingsTile
            ? hit(w.title) || hit(w.subtitle)
            : w is SettingsSwitchTile && (hit(w.title) || hit(w.subtitle)))
          w,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final searchOn = ref.watch(flagProvider(('enableSettingsSearch', null))).value ?? false;
    final biometricFlag = ref.watch(flagProvider(('enableBiometricAuth', null))).value ?? false;
    final version = ref.watch(appVersionProvider).value;
    final isLocal = auth.isLocalOnly;
    final tokens = context.tokens;

    final horizon = ref.watch(horizonNavProvider);
    return wrapHomeBody(
      context,
      ref,
      HomeTab.me,
      AppScaffold(
        backgroundColor: tokens.bgSurface,
        appBar: AppBar(
          title: Text(horizon ? 'Me' : 'Settings'),
          // Under the Horizon dock this is a top-level tab, so there is nothing to go back to.
          automaticallyImplyLeading: false,
          leading: horizon
              ? null
              : IconButton(
                  tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                  icon: const Icon(AppIcons.back, size: 20),
                  onPressed: () => context.pop(),
                ),
        ),
        bottomNavigationBar: buildHomeDock(context, ref, HomeTab.me),
        body: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
              padding: const EdgeInsets.only(bottom: 32),
              children: [
                InkWell(
                  key: const Key('settings-profile'),
                  onTap: _rename,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                    child: Row(
                      children: [
                        AppAvatar(name: auth.user?.displayName ?? 'Traveler', size: 64),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                auth.user?.displayName ?? 'Traveler',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                auth.userEmail ?? (isLocal ? 'Saved on this device only' : ''),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: tokens.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.edit_outlined, color: tokens.textMuted),
                      ],
                    ),
                  ),
                ),
                if (searchOn)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: TextField(
                      key: const Key('settings-search'),
                      controller: _search,
                      onChanged: (v) => setState(() => _query = v.trim()),
                      decoration: InputDecoration(
                        hintText: 'Search settings',
                        prefixIcon: const Icon(Icons.search_rounded),
                        suffixIcon: _query.isEmpty
                            ? null
                            : IconButton(
                                tooltip: 'Clear',
                                icon: const Icon(Icons.close_rounded),
                                onPressed: () => setState(() {
                                  _search.clear();
                                  _query = '';
                                }),
                              ),
                        filled: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(99),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                Divider(height: 1, color: tokens.borderColor),
                if (searchOn && _query.isNotEmpty) ...[
                  ..._matches(_query, biometricFlag),
                  if (_matches(_query, biometricFlag).isEmpty)
                    Padding(
                      key: const Key('settings-search-empty'),
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        'No settings match "$_query"',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: tokens.textSecondary),
                      ),
                    ),
                ] else ...[
                  SettingsTile(
                    key: const Key('settings-open-account'),
                    icon: Icons.key_rounded,
                    iconColor: const Color(0xFF16A34A),
                    title: 'Account',
                    subtitle: 'Delete account',
                    onTap: () => _open('Account', _accountRows),
                  ),
                  SettingsTile(
                    key: const Key('settings-open-notifications'),
                    icon: Icons.notifications_none_rounded,
                    iconColor: const Color(0xFF2F6BFF),
                    title: 'Notifications',
                    subtitle: 'Quiet hours, digest, pass reminders',
                    onTap: () => _open('Notifications', _notificationRows),
                  ),
                  SettingsTile(
                    key: const Key('settings-open-appearance'),
                    icon: Icons.palette_outlined,
                    iconColor: const Color(0xFF8B3CF7),
                    title: 'Appearance',
                    subtitle: 'Theme, haptics, default currency',
                    onTap: () => _open('Appearance', _appearanceRows),
                  ),
                  SettingsTile(
                    key: const Key('settings-open-data'),
                    icon: Icons.cloud_download_outlined,
                    iconColor: const Color(0xFF0EA5C6),
                    title: 'Data and backup',
                    subtitle: 'Export or restore your trips',
                    onTap: () => _open('Data and backup', _dataRows),
                  ),
                  if (biometricFlag)
                    SettingsTile(
                      key: const Key('settings-open-security'),
                      icon: Icons.lock_outline_rounded,
                      iconColor: const Color(0xFF16A34A),
                      title: 'Privacy and security',
                      subtitle: 'App lock',
                      onTap: () => _open('Privacy and security', _securityRows),
                    ),
                  SettingsTile(
                    key: const Key('settings-open-help'),
                    icon: Icons.help_outline_rounded,
                    iconColor: const Color(0xFFE8890C),
                    title: 'Help',
                    subtitle: 'Report a problem, diagnostics',
                    onTap: () => _open('Help', _helpRows),
                  ),
                  SettingsTile(
                    key: const Key('settings-open-about'),
                    icon: Icons.info_outline_rounded,
                    iconColor: const Color(0xFF5A6173),
                    title: 'About',
                    subtitle: "What's new, privacy, terms",
                    onTap: () => _open('About', _aboutRows),
                  ),
                ],
                Divider(height: 24, color: tokens.borderColor),
                SettingsTile(
                  key: const Key('settings-signout'),
                  icon: Icons.logout_rounded,
                  title: 'Sign out',
                  danger: true,
                  onTap: _signOut,
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: Text(
                    key: const Key('settings-version'),
                    version == null ? '' : 'Trip Tracker ${version.version} (${version.build})',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: tokens.textMuted),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A drilled-in settings page. [rows] runs inside a [Consumer] so switches repaint as they change.
class _SettingsPage extends StatelessWidget {
  const _SettingsPage({required this.title, required this.rows, super.key});

  final String title;
  final List<Widget> Function(WidgetRef r) rows;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      backgroundColor: context.tokens.bgSurface,
      appBar: AppBar(title: Text(title)),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: Consumer(
            builder: (context, r, _) => ListView(padding: const EdgeInsets.only(bottom: 32), children: rows(r)),
          ),
        ),
      ),
    );
  }
}

class _ThemeOption extends StatelessWidget {
  const _ThemeOption({required this.label, required this.icon, required this.selected, required this.onTap, super.key});

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final color = selected ? t.primaryAccent : t.textSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? t.primaryAccent.withValues(alpha: 0.1) : t.bgSurfaceHover,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: selected ? t.primaryAccent : Colors.transparent, width: 2),
        ),
        child: Column(
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(fontWeight: FontWeight.w600, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

void _showChangelog(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      builder: (_, controller) => ListView(
        key: const Key('changelog-list'),
        controller: controller,
        padding: const EdgeInsets.all(20),
        children: [
          BentoTile(
            tone: BentoTone.lilac,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BentoTile.eyebrow(ctx, BentoTone.lilac, "What's new"),
                const SizedBox(height: 6),
                Text(
                  changelogEntries.isEmpty ? '' : 'Version ${changelogEntries.first.version}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          for (final e in changelogEntries) ...[
            Text('${e.version}  ·  ${e.date}', style: const TextStyle(fontWeight: FontWeight.w800)),
            for (final c in e.changes) Padding(padding: const EdgeInsets.only(top: 4), child: Text('• $c')),
            const SizedBox(height: 16),
          ],
        ],
      ),
    ),
  );
}
