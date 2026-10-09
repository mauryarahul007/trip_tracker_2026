import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/domain/repositories/repositories.dart';
import 'package:trip_tracker/features/admin/admin_mode.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import '../../support/pump_app.dart';

class _AdminOn extends AdminModeNotifier {
  @override
  bool build() => true;
}

const root = AuthUser(id: 'root', email: 'root@b.c', displayName: 'Root', provider: 'email');

Future<TestApp> openPortal(WidgetTester tester) =>
    pumpApp(tester, user: root, overrides: [adminModeProvider.overrideWith(_AdminOn.new)]);

Future<void> tab(WidgetTester tester, String label) async {
  await tester.tap(find.descendant(of: find.byKey(const Key('admin-nav')), matching: find.text(label)));
  await settle(tester);
}

Finder key(String k) => find.byKey(Key(k));

/// Taps a widget that may sit in a horizontally scrolling chip row.
Future<void> tapKey(WidgetTester tester, String k) async {
  await tester.ensureVisible(key(k));
  await tester.tap(key(k));
  await settle(tester);
}

void main() {
  group('overview', () {
    testApp('shows platform counts and the urgent bugs', (tester) async {
      await openPortal(tester);
      expect(key('admin-portal'), findsOneWidget);
      expect(find.descendant(of: key('ov-bugs'), matching: find.text('1')), findsOneWidget); // one open bug
      expect(find.descendant(of: key('ov-users'), matching: find.text('2')), findsOneWidget);
      expect(find.descendant(of: key('ov-trips'), matching: find.text('1')), findsOneWidget);
      expect(find.text('Crash on settle'), findsOneWidget); // critical + open -> "needs attention"
    });
  });

  group('bug ledger', () {
    testApp('lists open bugs by default; filters by status and severity', (tester) async {
      await openPortal(tester);
      await tab(tester, 'Bugs');
      expect(key('bug-BUG-1'), findsOneWidget);
      expect(key('bug-BUG-2'), findsNothing); // resolved is hidden by the default Open filter
      await tapKey(tester, 'bug-status-all');
      expect(key('bug-BUG-2'), findsOneWidget);
      await tapKey(tester, 'bug-sev-low');
      expect(key('bug-BUG-1'), findsNothing);
      expect(key('bug-BUG-2'), findsOneWidget);
    });

    testApp('resolving a bug saves status and note', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Bugs');
      await tester.tap(key('bug-BUG-1'));
      await settle(tester);
      await tester.tap(key('bug-set-resolved'));
      await tester.enterText(find.descendant(of: key('bug-note'), matching: find.byType(TextField)), 'Fixed in 3.54');
      await tester.tap(key('bug-save'));
      await settle(tester);
      expect(app.admin.calls, ['bug:BUG-1:resolved:-:Fixed in 3.54']);
      expect(key('bug-BUG-1'), findsNothing); // resolved now, so out of the Open list
    });

    testApp('files a new bug', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Bugs');
      await tester.tap(key('bug-new'));
      await settle(tester);
      await tester.enterText(
        find.descendant(of: key('newbug-title'), matching: find.byType(TextField)),
        'Map is blank',
      );
      await tester.tap(find.text('high').last);
      await tester.tap(key('newbug-submit'));
      await settle(tester);
      expect(app.admin.calls, ['create:Map is blank:high:general']);
      expect(find.text('Map is blank'), findsOneWidget);
    });

    testApp('a failed load shows the error and a retry', (tester) async {
      await pumpApp(
        tester,
        user: root,
        overrides: [adminModeProvider.overrideWith(_AdminOn.new)],
        setup: (a) => a.admin.failBugs = true,
      );
      await tab(tester, 'Bugs');
      expect(find.textContaining('Superadmin portal needs'), findsOneWidget);
      expect(find.widgetWithText(AppButton, 'Retry'), findsOneWidget);
    });
  });

  group('users', () {
    testApp('ban asks first, then bans; superadmins are protected', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Users');
      await tester.tap(key('user-root'));
      await settle(tester);
      expect(key('user-ban'), findsNothing);
      expect(find.textContaining('cannot be banned'), findsOneWidget);
      await tester.tapAt(const Offset(10, 10)); // dismiss the sheet
      await settle(tester);
      await tester.tap(key('user-u1'));
      await settle(tester);
      await tester.tap(key('user-ban'));
      await settle(tester);
      expect(find.text('Ban Asha?'), findsOneWidget);
      await tester.tap(find.widgetWithText(AppButton, 'Ban').last);
      await settle(tester);
      expect(app.admin.calls, ['ban:u1:true']);
      expect(find.text('BANNED'), findsOneWidget);
    });

    testApp('broadcast confirms, then sends', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Users');
      await tester.tap(key('user-broadcast'));
      await settle(tester);
      await tester.enterText(find.descendant(of: key('broadcast-title'), matching: find.byType(TextField)), 'Hello');
      await tester.enterText(
        find.descendant(of: key('broadcast-body'), matching: find.byType(TextField)),
        'New release',
      );
      await tester.tap(key('broadcast-send'));
      await settle(tester);
      await tester.tap(find.widgetWithText(AppButton, 'Send').last);
      await settle(tester);
      expect(app.admin.calls, ['broadcast:Hello']);
    });
  });

  group('trips', () {
    testApp('ground and delete (with confirmation)', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Trips');
      expect(find.text('ACTIVE'), findsOneWidget);
      await tester.tap(key('trip-t1'));
      await settle(tester);
      await tester.tap(key('trip-ground'));
      await settle(tester);
      expect(app.admin.calls, ['ground:t1:true']);
      expect(find.text('GROUNDED'), findsOneWidget);

      await tester.tap(key('trip-t1'));
      await settle(tester);
      await tester.tap(key('trip-delete'));
      await settle(tester);
      expect(find.text('Delete "Goa Weekend"?'), findsOneWidget);
      await tester.tap(find.widgetWithText(AppButton, 'Delete').last);
      await settle(tester);
      expect(app.admin.calls, ['ground:t1:true', 'deleteTrip:t1']);
      expect(key('trip-t1'), findsNothing);
    });
  });

  group('flags', () {
    testApp('the global switch writes an override; the sheet can reset it', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Flags');
      await tester.enterText(find.byType(TextField).first, 'enableCloneLastExpense');
      await settle(tester);
      // Default ON; flip it OFF.
      await tester.tap(key('flag-switch-enableCloneLastExpense'));
      await settle(tester);
      expect(app.admin.calls, ['flag:global::enableCloneLastExpense:false']);
      expect(find.text('OVERRIDDEN'), findsOneWidget);

      await tester.tap(key('flag-enableCloneLastExpense'));
      await settle(tester);
      await tester.tap(key('flag-reset-global'));
      await settle(tester);
      expect(app.admin.calls.last, 'flag:global::enableCloneLastExpense:null');
    });

    testApp('adds and removes a per-trip override', (tester) async {
      final app = await openPortal(tester);
      await tab(tester, 'Flags');
      await tester.enterText(find.byType(TextField).first, 'enableCloneLastExpense');
      await settle(tester);
      await tester.tap(key('flag-enableCloneLastExpense'));
      await settle(tester);
      await tester.tap(key('flag-scope-trip'));
      await settle(tester);
      await tester.tap(find.text('Goa Weekend').last);
      await settle(tester);
      await tester.tap(key('flag-add-override'));
      await settle(tester);
      expect(app.admin.calls, ['flag:trip:t1:enableCloneLastExpense:true']);
      expect(key('flag-override-trip-t1'), findsOneWidget);
      await tester.tap(find.byTooltip('Remove override'));
      await settle(tester);
      expect(app.admin.calls.last, 'flag:trip:t1:enableCloneLastExpense:null');
      expect(key('flag-override-trip-t1'), findsNothing);
    });
  });
}
