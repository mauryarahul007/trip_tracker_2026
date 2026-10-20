import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/auth_state.dart';
import '../../../core/clock.dart';
import '../../../core/platform/haptics.dart' show HapticsLevel;
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
import '../../../domain/logic/currency.dart' show getCurrencySymbol, formatAmount;
import '../../../domain/logic/latest_trip.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../expenses/application/expenses_providers.dart' show myMemberIdProvider, tripSettlementProvider;
import '../../expenses/presentation/closeout_sheet.dart';
import '../../expenses/presentation/trip_tools_sheet.dart' show TripToolsSheet, textFilePickerProvider;
import '../../notifications/application/notification_providers.dart' show unreadNotificationCountProvider;
import '../../travel/presentation/live_location_share_modal.dart';
import '../../trips/application/trips_providers.dart' show tripsProvider;
import '../../trips/presentation/widgets/share_trip_sheet.dart';
import '../application/settings_data.dart';
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
      showDragHandle: true, // same grab handle as every AppSheet
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
    if (!ok) {
      _say(
        on
            ? 'Biometric lock needs a device with Face ID, fingerprint or a screen lock set up.'
            : 'App lock stays on until this phone confirms it is you.',
      );
    }
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

  Future<void> _seedDemo() async {
    final user = ref.read(authStateProvider).user;
    if (user == null) return;
    final r = await ref
        .read(backupServiceProvider)
        .restore(buildDemoBackupJson(ref.read(nowProvider)()), userId: user.id, userName: user.displayName ?? 'Me');
    _say(r.ok ? 'Added the demo trip "Goa Weekend (Demo)".' : (r.error ?? 'Could not add the demo trip.'));
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

  /// Theme and haptics sit on the main page as segmented rows (web `Appearance` section).
  List<Widget> _appearanceRows(WidgetRef r) {
    final themeMode = r.watch(themeModePrefProvider);
    return [
      SettingsSegmentedTile<String>(
        key: const Key('settings-theme'),
        icon: Icons.wb_sunny_outlined,
        title: 'Appearance',
        subtitle: switch (themeMode) {
          'light' => 'Light',
          'dark' => 'Dark',
          _ => 'Follows your phone',
        },
        value: themeMode,
        options: const [
          ('light', 'Light', Icons.wb_sunny_outlined),
          ('dark', 'Dark', Icons.nightlight_outlined),
          ('system', 'Auto', Icons.smartphone_rounded),
        ],
        onChanged: (v) => r.read(themeModePrefProvider.notifier).set(v),
      ),
      if (r.watch(flagProvider(('enableHapticsSetting', null))).value ?? true)
        SettingsSegmentedTile<HapticsLevel>(
          key: const Key('settings-haptics'),
          icon: Icons.vibration_rounded,
          iconColor: const Color(0xFF8B3CF7),
          title: 'Haptics',
          subtitle: switch (r.watch(hapticsLevelPrefProvider)) {
            HapticsLevel.all => 'Every tap',
            HapticsLevel.important => 'Key actions only',
            HapticsLevel.off => 'Off',
          },
          value: r.watch(hapticsLevelPrefProvider),
          options: const [
            (HapticsLevel.all, 'All', null),
            (HapticsLevel.important, 'Important', null),
            (HapticsLevel.off, 'Off', null),
          ],
          onChanged: (v) => r.read(hapticsLevelPrefProvider.notifier).set(v),
        ),
    ];
  }

  /// The rest of the display and feedback options, one tap away from Appearance.
  List<Widget> _displayRows(WidgetRef r) {
    final amoled = r.watch(amoledPrefProvider);
    final amoledFlag = r.watch(flagProvider(('enableAmoledTheme', null))).value ?? false;
    final currency = r.watch(defaultCurrencyPrefProvider);
    return [
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
      if (r.watch(flagProvider(('enableHighContrast', null))).value ?? true)
        SettingsSwitchTile(
          key: const Key('settings-high-contrast'),
          icon: Icons.format_color_text_rounded,
          iconColor: const Color(0xFF5A6173),
          title: 'High contrast',
          subtitle: 'Darker text and stronger borders, easier to read in sunlight',
          value: r.watch(highContrastPrefProvider),
          onChanged: (v) => r.read(highContrastPrefProvider.notifier).set(v),
        ),
      if (r.watch(flagProvider(('enableReduceMotion', null))).value ?? true)
        SettingsSwitchTile(
          key: const Key('settings-reduce-motion'),
          icon: Icons.animation_rounded,
          iconColor: const Color(0xFF5A6173),
          title: 'Reduce motion',
          subtitle: 'Numbers, bars and sections jump to their final state instead of animating',
          value: r.watch(reduceMotionPrefProvider),
          onChanged: (v) => r.read(reduceMotionPrefProvider.notifier).set(v),
        ),
      if (r.watch(flagProvider(('enableSummaryCollapse', null))).value ?? true)
        SettingsSwitchTile(
          key: const Key('settings-summary-collapse'),
          icon: Icons.unfold_less_rounded,
          iconColor: const Color(0xFF16A34A),
          title: 'Collapse Trip numbers',
          subtitle: 'Open the Summary with the numbers and charts folded away; tap to expand',
          value: r.watch(summaryCollapsePrefProvider),
          onChanged: (v) => r.read(summaryCollapsePrefProvider.notifier).set(v),
        ),
      if (r.watch(flagProvider(('enableFeedbackPack', null))).value ?? true)
        SettingsSwitchTile(
          key: const Key('settings-sound'),
          icon: Icons.volume_up_rounded,
          iconColor: const Color(0xFF0EA5C6),
          title: 'Sound feedback',
          subtitle: 'A soft click when you settle, save or undo',
          value: r.watch(soundFeedbackPrefProvider),
          onChanged: (v) => r.read(soundFeedbackPrefProvider.notifier).set(v),
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
      key: const Key('settings-inbox'),
      icon: Icons.notifications_none_rounded,
      iconColor: const Color(0xFF2F6BFF),
      title: 'Notifications',
      subtitle: switch (r.watch(unreadNotificationCountProvider)) {
        0 => 'All caught up',
        final n => '$n unread',
      },
      onTap: () => context.push('/notifications'),
    ),
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
    if (r.watch(flagProvider(('enableDemoSeeding', null))).value ?? false)
      SettingsTile(
        key: const Key('settings-seed-demo'),
        icon: Icons.auto_awesome_rounded,
        iconColor: const Color(0xFF8B3CF7),
        title: 'Seed Demo Trip',
        subtitle: 'Try the app with a sample trip, expenses and splits',
        onTap: _seedDemo,
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
      title: 'Delete Account',
      subtitle: 'Permanently delete your account and owned trips',
      icon: Icons.delete_outline_rounded,
      danger: true,
      onTap: () => context.push('/delete-account'),
    ),
  ];

  List<Widget> _dataSaverRows(WidgetRef r) => [
    if (r.watch(flagProvider(('enableDataSaverMode', null))).value ?? false)
      SettingsSwitchTile(
        key: const Key('settings-data-saver'),
        icon: Icons.data_saver_on_rounded,
        iconColor: const Color(0xFF0EA5C6),
        title: 'Data saver',
        subtitle: r.watch(dataSaverPrefProvider) ? 'Map stays collapsed' : 'Map opens as usual',
        value: r.watch(dataSaverPrefProvider),
        onChanged: (v) => r.read(dataSaverPrefProvider.notifier).set(v),
      ),
  ];

  /// "This Trip" rows for the trip the user is most likely in (happening now, else next, else latest).
  List<Widget> _tripRows(WidgetRef r, String tripId) {
    final trip = r.watch(tripsProvider).value?.where((t) => t.id == tripId).firstOrNull;
    if (trip == null) return const [];
    final result = r.watch(tripSettlementProvider(tripId));
    final outstanding = result?.transfers.fold<double>(0, (s, t) => s + t.amount) ?? 0;
    final symbol = getCurrencySymbol(trip.baseCurrency);
    final geotagFlag = r.watch(flagProvider(('enableGeotagging', null))).value ?? true;
    return [
      SettingsTile(
        key: const Key('settings-trip-share'),
        icon: Icons.person_add_alt_1_outlined,
        title: 'Invite & Share Trip',
        subtitle: trip.name,
        onTap: () => AppSheet.show<void>(
          context: context,
          title: 'Invite travelers',
          builder: (_) => ShareTripSheet(tripId: tripId),
        ),
      ),
      SettingsTile(
        key: const Key('settings-trip-tools'),
        icon: Icons.build_outlined,
        iconColor: const Color(0xFF0EA5C6),
        title: 'Trip Tools',
        subtitle: 'Splits, exports and quick actions',
        onTap: () => AppSheet.show<void>(
          context: context,
          builder: (_) => TripToolsSheet(tripId: tripId),
        ),
      ),
      SettingsTile(
        key: const Key('settings-trip-settings'),
        icon: Icons.tune_rounded,
        iconColor: const Color(0xFF5A6173),
        title: 'Trip settings',
        subtitle: 'Money rules, categories, freeze and archive',
        onTap: () => context.push('/trip/$tripId/settings'),
      ),
      if (geotagFlag)
        SettingsSwitchTile(
          key: const Key('settings-geotag'),
          icon: Icons.place_outlined,
          iconColor: const Color(0xFFE8890C),
          title: 'Geotag expenses',
          subtitle: 'Save a place with each expense',
          value: r.watch(geotagExpensesPrefProvider),
          onChanged: (v) => r.read(geotagExpensesPrefProvider.notifier).set(v),
        ),
      SettingsTile(
        key: const Key('settings-live-location'),
        icon: Icons.my_location_rounded,
        iconColor: const Color(0xFFE5484D),
        title: 'Live location',
        subtitle: 'Share your position for 12 hours',
        onTap: () => LiveLocationShareModal.show(
          context,
          tripId: tripId,
          memberId: r.read(myMemberIdProvider(tripId)) ?? '',
          userId: r.read(authStateProvider).userId ?? '',
        ),
      ),
      if (!trip.closed)
        SettingsTile(
          key: const Key('settings-close-trip'),
          icon: Icons.verified_user_outlined,
          iconColor: const Color(0xFF16A34A),
          title: 'Close Trip',
          subtitle: result == null
              ? 'Settle up and lock the trip'
              : outstanding <= 0
              ? 'Everything is settled'
              : '${formatAmount(outstanding, symbol)} still unsettled',
          onTap: () => AppSheet.show<void>(
            context: context,
            builder: (_) => CloseoutSheet(tripId: tripId),
          ),
        ),
    ];
  }

  List<Widget> _dataSectionRows(WidgetRef r) {
    final hub = r.watch(flagProvider(('enableSettingsDataHub', null))).value ?? true;
    final archived = (r.watch(tripsProvider).value ?? const <Trip>[]).where((t) => t.archived).length;
    final size = r.watch(storageUsageProvider).value;
    return [
      ..._dataSaverRows(r),
      if (hub)
        SettingsTile(
          key: const Key('settings-storage'),
          icon: Icons.pie_chart_outline_rounded,
          iconColor: const Color(0xFF2F6BFF),
          title: 'Storage and Data',
          subtitle: 'Space used on this phone and cache',
          trailing: size == null ? null : SettingsBadge(formatBytes(size.totalBytes)),
          onTap: () => context.push('/settings/storage'),
        ),
      if (hub)
        SettingsTile(
          key: const Key('settings-archived'),
          icon: Icons.archive_outlined,
          iconColor: const Color(0xFF8B3CF7),
          title: 'Archived Trips',
          subtitle: archived == 0 ? 'No archived trips' : '$archived archived',
          onTap: () => context.push('/settings/archived'),
        ),
      SettingsTile(
        key: const Key('settings-backups'),
        icon: Icons.download_rounded,
        iconColor: const Color(0xFF0EA5C6),
        title: 'Backups',
        subtitle: 'Export or restore all your trips as a JSON file',
        onTap: () => _open('Backups', _dataRows),
      ),
    ];
  }

  /// Every settings row from every page that matches [q] (tiles only: they carry a title and subtitle).
  List<Widget> _matches(String q, bool security) {
    final all = [
      ..._appearanceRows(ref),
      ..._displayRows(ref),
      ..._dataSaverRows(ref),
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
            : w is SettingsSwitchTile
            ? hit(w.title) || hit(w.subtitle)
            : w is SettingsSegmentedTile && (hit(w.title) || hit(w.subtitle)))
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
    final tripId = latestTripId(ref.watch(tripsProvider).value ?? const [], ref.watch(nowProvider)());
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
                  if (tripId != null) SettingsSection(title: 'This Trip', children: _tripRows(ref, tripId)),
                  SettingsSection(
                    title: 'Appearance',
                    children: [
                      ..._appearanceRows(ref),
                      SettingsTile(
                        key: const Key('settings-open-display'),
                        icon: Icons.palette_outlined,
                        iconColor: const Color(0xFF8B3CF7),
                        title: 'More display options',
                        subtitle: 'Contrast, motion, sound, default currency',
                        onTap: () => _open('Display and sound', _displayRows),
                      ),
                    ],
                  ),
                  SettingsSection(title: 'Notifications', children: _notificationRows(ref)),
                  if (biometricFlag) SettingsSection(title: 'Privacy and security', children: _securityRows(ref)),
                  SettingsSection(title: 'Data', children: _dataSectionRows(ref)),
                  SettingsSection(
                    title: 'Help & About',
                    children: [
                      ..._helpRows(ref),
                      SettingsTile(
                        key: const Key('settings-open-about'),
                        icon: Icons.info_outline_rounded,
                        iconColor: const Color(0xFF5A6173),
                        title: 'About & Legal',
                        subtitle: version == null
                            ? "What's new, privacy, terms"
                            : 'Version ${version.version} (${version.build})',
                        onTap: () => _open('About & Legal', _aboutRows),
                      ),
                    ],
                  ),
                ],
                SettingsSection(
                  title: 'Account',
                  children: [
                    SettingsTile(
                      key: const Key('settings-signout'),
                      icon: Icons.logout_rounded,
                      title: 'Sign Out',
                      subtitle: 'Sign out on this device',
                      danger: true,
                      onTap: _signOut,
                    ),
                    ..._accountRows(ref),
                  ],
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

void _showChangelog(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true, // same grab handle as every AppSheet
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
