import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/platform/external_launcher.dart';
import '../../data/providers.dart';
import '../../l10n/l10n_ext.dart';
import '../../shared/theme/app_tokens.dart';
import '../../shared/theme/app_typography.dart';
import 'admin_mode.dart';
import 'ops_deck_link.dart';
import 'presentation/bug_ledger_page.dart';
import 'presentation/flags_page.dart';
import 'presentation/more_page.dart';
import 'presentation/overview_page.dart';
import 'presentation/trips_page.dart';
import 'presentation/users_page.dart';

/// The web Ops Deck still has Analytics, Audit and Tools; the app hands the session over to it for those.
/// This is the EC2 deployment (deploy-ec2.yml), built with the real Supabase project. The GitHub Pages copy is a
/// dummy build and can never sign anyone in. Override per build with `--dart-define=WEB_APP_URL=...`.
const _webAppUrl = String.fromEnvironment('WEB_APP_URL', defaultValue: 'https://trip-tracker.blackmaroon.in/');

/// The native Superadmin portal a superadmin lands on after the admin sign-in: Overview, Bug Ledger,
/// Users, Trips and Flags. Every call is made as the signed-in superadmin; the server (RLS) enforces access.
class AdminHomeScreen extends ConsumerStatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  ConsumerState<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends ConsumerState<AdminHomeScreen> {
  int _tab = 0;

  static const _titles = ['Overview', 'Bug Ledger', 'Users', 'Trips', 'Flags', 'More'];

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = context.tokens;
    final email = ref.watch(authRepositoryProvider).currentUser?.email;
    final pages = <Widget>[
      OverviewPage(onGo: (i) => setState(() => _tab = i)),
      const BugLedgerPage(),
      const UsersPage(),
      const TripsPage(),
      const FlagsPage(),
      const MorePage(),
    ];
    return Scaffold(
      key: const Key('admin-portal'),
      backgroundColor: t.bgApp,
      appBar: AppBar(
        backgroundColor: t.bgApp,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${l10n.adminTitle} · ${_titles[_tab]}',
              style: TextStyle(
                fontFamily: AppTypography.fontTitle,
                fontWeight: FontWeight.w800,
                fontSize: 20,
                color: t.textPrimary,
              ),
            ),
            if (email != null) Text(email, style: TextStyle(fontSize: 11.5, color: t.textSecondary)),
          ],
        ),
        actions: [
          IconButton(
            key: const Key('admin-open-ops-deck'),
            tooltip: l10n.adminOpenOpsDeck,
            icon: const Icon(Icons.open_in_new_rounded),
            onPressed: () async {
              // Hand the session to the web portal so the superadmin is not asked to sign in twice.
              final tokens = await ref.read(authRepositoryProvider).sessionTokens();
              await ref.read(externalLauncherProvider)(opsDeckUri(Uri.parse(_webAppUrl), tokens));
            },
          ),
          IconButton(
            key: const Key('admin-sign-out'),
            tooltip: l10n.adminSignOut,
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              ref.read(adminModeProvider.notifier).set(false);
              await ref.read(authRepositoryProvider).signOut();
            },
          ),
        ],
      ),
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: NavigationBar(
        key: const Key('admin-nav'),
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded),
            label: 'Overview',
          ),
          NavigationDestination(
            icon: Icon(Icons.bug_report_outlined),
            selectedIcon: Icon(Icons.bug_report_rounded),
            label: 'Bugs',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            selectedIcon: Icon(Icons.people_alt_rounded),
            label: 'Users',
          ),
          NavigationDestination(
            icon: Icon(Icons.luggage_outlined),
            selectedIcon: Icon(Icons.luggage_rounded),
            label: 'Trips',
          ),
          NavigationDestination(
            icon: Icon(Icons.flag_outlined),
            selectedIcon: Icon(Icons.flag_rounded),
            label: 'Flags',
          ),
          NavigationDestination(icon: Icon(Icons.apps_outlined), selectedIcon: Icon(Icons.apps_rounded), label: 'More'),
        ],
      ),
    );
  }
}
