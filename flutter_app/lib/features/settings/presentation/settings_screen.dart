import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
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
import '../../../shared/widgets/app_surface.dart';
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
  String? _message;

  void _say(String m) => setState(() => _message = m);

  // Desktop two-pane: the left list jumps to a section of the right-hand scroll view.
  final _sectionKeys = <String, GlobalKey>{};

  Widget _anchor(String title, Widget child) =>
      KeyedSubtree(key: _sectionKeys.putIfAbsent(title, GlobalKey.new), child: child);

  Widget _twoPane(BuildContext context, Widget list, List<String> titles) {
    if (MediaQuery.sizeOf(context).width < 1024) return list;
    final t = context.tokens;
    return Row(
      children: [
        Container(
          key: const Key('settings-nav'),
          width: 240,
          decoration: BoxDecoration(
            border: Border(right: BorderSide(color: t.borderColor)),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final title in titles)
                  ListTile(
                    key: Key('settings-nav-$title'),
                    dense: true,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    onTap: () {
                      final ctx = _sectionKeys[title]?.currentContext;
                      if (ctx != null) {
                        Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 250), alignment: 0);
                      }
                    },
                  ),
              ],
            ),
          ),
        ),
        Expanded(child: list),
      ],
    );
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

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final themeMode = ref.watch(themeModePrefProvider);
    final amoled = ref.watch(amoledPrefProvider);
    final amoledFlag = ref.watch(flagProvider(('enableAmoledTheme', null))).value ?? false;
    final biometricFlag = ref.watch(flagProvider(('enableBiometricAuth', null))).value ?? false;
    final lockOn = ref.watch(biometricLockEnabledProvider);
    final haptics = ref.watch(hapticsEnabledProvider);
    final reminders = ref.watch(passRemindersEnabledProvider);
    final currency = ref.watch(defaultCurrencyPrefProvider);
    final version = ref.watch(appVersionProvider).value;
    final suggestions = ref.watch(flagProvider(('enableFeatureSuggestions', null))).value ?? false;
    final whatsNew = ref.watch(flagProvider(('enableWhatsNewHub', null))).value ?? false;
    final isLocal = auth.isLocalOnly;

    final horizon = ref.watch(horizonNavProvider);
    return wrapHomeBody(
      context,
      ref,
      HomeTab.me,
      AppScaffold(
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
        body: _twoPane(
          context,
          ListView(
            scrollCacheExtent: const ScrollCacheExtent.pixels(4000),
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Text(_message!, key: const Key('settings-message')),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: AppCard(
                  onTap: _rename,
                  child: Row(
                    key: const Key('settings-profile'),
                    children: [
                      AppAvatar(name: auth.user?.displayName ?? 'Traveler', size: 56),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.user?.displayName ?? 'Traveler',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              auth.userEmail ?? (isLocal ? 'Saved on this device only' : ''),
                              style: TextStyle(color: context.tokens.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.edit_outlined, color: context.tokens.textMuted),
                    ],
                  ),
                ),
              ),
              _anchor(
                'Appearance',
                SettingsSection(
                  title: 'Appearance',
                  children: [
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
                                      onTap: () => ref.read(themeModePrefProvider.notifier).set(o.$1),
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
                        onChanged: (v) => ref.read(amoledPrefProvider.notifier).set(v),
                      ),
                    SettingsSwitchTile(
                      key: const Key('settings-haptics'),
                      icon: Icons.vibration_rounded,
                      iconColor: const Color(0xFF8B3CF7),
                      title: 'Haptic feedback',
                      value: haptics,
                      onChanged: (v) => ref.read(hapticsEnabledProvider.notifier).set(v),
                    ),
                    SettingsTile(
                      key: const Key('settings-currency'),
                      icon: Icons.payments_outlined,
                      iconColor: const Color(0xFF16A34A),
                      title: 'Default currency',
                      subtitle: currency ?? "Follows each trip's currency",
                      onTap: _pickCurrency,
                    ),
                  ],
                ),
              ),
              _anchor(
                'Notifications',
                SettingsSection(
                  title: 'Notifications',
                  children: [
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
                      value: reminders,
                      onChanged: (v) => ref.read(passRemindersEnabledProvider.notifier).set(v),
                    ),
                  ],
                ),
              ),
              if (biometricFlag)
                _anchor(
                  'Security',
                  SettingsSection(
                    title: 'Security',
                    children: [
                      SettingsSwitchTile(
                        key: const Key('settings-biometric'),
                        icon: Icons.fingerprint_rounded,
                        iconColor: const Color(0xFF16A34A),
                        title: 'Lock with Face ID / fingerprint',
                        subtitle: 'Ask to unlock after the app has been in the background',
                        value: lockOn,
                        onChanged: _toggleLock,
                      ),
                    ],
                  ),
                ),
              _anchor(
                'Data',
                SettingsSection(
                  title: 'Data',
                  children: [
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
                  ],
                ),
              ),
              _anchor(
                'Help',
                SettingsSection(
                  title: 'Help',
                  children: [
                    SettingsTile(
                      key: const Key('settings-report-bug'),
                      icon: Icons.bug_report_outlined,
                      iconColor: const Color(0xFFE5484D),
                      title: 'Report a problem',
                      onTap: () => context.push('/settings/report-bug'),
                    ),
                    if (suggestions)
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
                  ],
                ),
              ),
              _anchor(
                'About',
                SettingsSection(
                  title: 'About',
                  children: [
                    SettingsTile(
                      key: const Key('settings-version'),
                      icon: Icons.info_outline_rounded,
                      iconColor: const Color(0xFF5A6173),
                      title: 'Version',
                      subtitle: version == null ? '' : '${version.version} (${version.build})',
                    ),
                    if (whatsNew)
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
                  ],
                ),
              ),
              _anchor(
                'Account',
                SettingsSection(
                  title: 'Account',
                  children: [
                    SettingsTile(
                      key: const Key('settings-signout'),
                      icon: Icons.logout_rounded,
                      title: 'Sign out',
                      onTap: _signOut,
                    ),
                    SettingsTile(
                      key: const Key('settings-delete'),
                      title: 'Delete account',
                      icon: Icons.delete_outline_rounded,
                      danger: true,
                      onTap: () => context.push('/delete-account'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          ['Appearance', 'Notifications', if (biometricFlag) 'Security', 'Data', 'Help', 'About', 'Account'],
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
          HeroSurface(
            kind: SurfaceKind.dusk,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Eyebrow("What's new", color: Colors.white70),
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
