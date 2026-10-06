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
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../auth/application/app_lock.dart';
import '../../expenses/presentation/trip_tools_sheet.dart' show textFilePickerProvider;
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

    return AppScaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          icon: const Icon(AppIcons.back, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          if (_message != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Text(_message!, key: const Key('settings-message')),
            ),
          SettingsSection(
            title: 'Profile',
            children: [
              SettingsTile(
                key: const Key('settings-profile'),
                title: auth.user?.displayName ?? 'Traveler',
                subtitle: auth.userEmail ?? (isLocal ? 'Saved on this device only' : null),
                onTap: _rename,
              ),
            ],
          ),
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
                    SizedBox(
                      width: double.infinity,
                      child: SegmentedButton<String>(
                        showSelectedIcon: false,
                        segments: const [
                          ButtonSegment(value: 'system', label: Text('Auto')),
                          ButtonSegment(value: 'light', label: Text('Light')),
                          ButtonSegment(value: 'dark', label: Text('Dark')),
                        ],
                        selected: {themeMode},
                        onSelectionChanged: (v) => ref.read(themeModePrefProvider.notifier).set(v.first),
                      ),
                    ),
                  ],
                ),
              ),
              if (amoledFlag)
                SettingsSwitchTile(
                  key: const Key('settings-amoled'),
                  title: 'Pure black dark mode',
                  subtitle: 'Saves battery on OLED screens. Applies when the theme is dark.',
                  value: amoled,
                  onChanged: (v) => ref.read(amoledPrefProvider.notifier).set(v),
                ),
              SettingsSwitchTile(
                key: const Key('settings-haptics'),
                title: 'Haptic feedback',
                value: haptics,
                onChanged: (v) => ref.read(hapticsEnabledProvider.notifier).set(v),
              ),
              SettingsTile(
                key: const Key('settings-currency'),
                title: 'Default currency',
                subtitle: currency ?? "Follows each trip's currency",
                onTap: _pickCurrency,
              ),
            ],
          ),
          SettingsSection(
            title: 'Notifications',
            children: [
              SettingsTile(
                key: const Key('settings-notifications'),
                title: 'Notification preferences',
                subtitle: 'Quiet hours, daily digest, muted trips',
                onTap: () => context.push('/settings/notifications'),
              ),
              SettingsSwitchTile(
                key: const Key('settings-pass-reminders'),
                title: 'Travel pass reminders',
                subtitle: 'A reminder 24 hours and 3 hours before flights and trains',
                value: reminders,
                onChanged: (v) => ref.read(passRemindersEnabledProvider.notifier).set(v),
              ),
            ],
          ),
          if (biometricFlag)
            SettingsSection(
              title: 'Security',
              children: [
                SettingsSwitchTile(
                  key: const Key('settings-biometric'),
                  title: 'Lock with Face ID / fingerprint',
                  subtitle: 'Ask to unlock after the app has been in the background',
                  value: lockOn,
                  onChanged: _toggleLock,
                ),
              ],
            ),
          SettingsSection(
            title: 'Data',
            children: [
              SettingsTile(
                key: const Key('settings-export'),
                title: 'Export backup',
                subtitle: 'All trips on this device as a JSON file',
                onTap: _export,
              ),
              SettingsTile(
                key: const Key('settings-import'),
                title: 'Restore backup',
                subtitle: 'Adds the trips in a backup file as new trips',
                onTap: _import,
              ),
            ],
          ),
          SettingsSection(
            title: 'Help',
            children: [
              SettingsTile(
                key: const Key('settings-report-bug'),
                title: 'Report a problem',
                onTap: () => context.push('/settings/report-bug'),
              ),
              if (suggestions)
                SettingsTile(
                  key: const Key('settings-feature-request'),
                  title: 'Suggest a feature',
                  onTap: () => context.push('/settings/feature-request'),
                ),
              SettingsTile(
                key: const Key('settings-diagnostics'),
                title: 'Diagnostics',
                subtitle: 'Sync status and recent logs',
                onTap: () => context.push('/settings/diagnostics'),
              ),
            ],
          ),
          SettingsSection(
            title: 'About',
            children: [
              SettingsTile(
                key: const Key('settings-version'),
                title: 'Version',
                subtitle: version == null ? '' : '${version.version} (${version.build})',
              ),
              if (whatsNew)
                SettingsTile(
                  key: const Key('settings-whats-new'),
                  title: "What's new",
                  onTap: () => _showChangelog(context),
                ),
              SettingsTile(
                key: const Key('settings-privacy'),
                title: 'Privacy Policy',
                onTap: () => context.push('/privacy'),
              ),
              SettingsTile(
                key: const Key('settings-terms'),
                title: 'Terms of Service',
                onTap: () => context.push('/terms'),
              ),
            ],
          ),
          SettingsSection(
            title: 'Account',
            children: [
              SettingsTile(key: const Key('settings-signout'), title: 'Sign out', onTap: _signOut),
              SettingsTile(
                key: const Key('settings-delete'),
                title: 'Delete account',
                danger: true,
                onTap: () => context.push('/delete-account'),
              ),
            ],
          ),
        ],
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
