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

Finder key(String k) => find.byKey(Key(k));

Future<TestApp> open(WidgetTester tester, String entry) async {
  final app = await pumpApp(tester, user: root, overrides: [adminModeProvider.overrideWith(_AdminOn.new)]);
  await tester.tap(find.descendant(of: key('admin-nav'), matching: find.text('More')));
  await settle(tester);
  await tester.tap(key(entry));
  await settle(tester);
  return app;
}

Future<void> tapKey(WidgetTester tester, String k) async {
  await tester.ensureVisible(key(k));
  await tester.tap(key(k));
  await settle(tester);
}

void main() {
  testApp('flags are grouped into the consumer packs, with a filter per pack', (tester) async {
    await pumpApp(tester, user: root, overrides: [adminModeProvider.overrideWith(_AdminOn.new)]);
    await tester.tap(find.descendant(of: key('admin-nav'), matching: find.text('Flags')));
    await settle(tester);
    expect(key('flag-section-core'), findsOneWidget);
    expect(find.textContaining('Core'), findsWidgets);
    await tapKey(tester, 'flag-pack-pro');
    expect(key('flag-section-core'), findsNothing);
    expect(key('flag-section-pro'), findsOneWidget);
  });

  testApp('More lists every extra section', (tester) async {
    await pumpApp(tester, user: root, overrides: [adminModeProvider.overrideWith(_AdminOn.new)]);
    await tester.tap(find.descendant(of: key('admin-nav'), matching: find.text('More')));
    await settle(tester);
    for (final k in ['more-analytics', 'more-features', 'more-audit', 'more-controls', 'more-tools']) {
      expect(key(k), findsOneWidget, reason: k);
    }
  });

  group('controls', () {
    testApp('maintenance and sign-in gates save immediately', (tester) async {
      final app = await open(tester, 'more-controls');
      await tester.tap(key('ctl-maintenance_mode'));
      await settle(tester);
      await tester.tap(key('ctl-signup_gate'));
      await settle(tester);
      expect(app.admin.calls, ['config:maintenance_mode:true', 'config:signup_gate:true']);
    });

    testApp('a number setting saves; a bad value is rejected', (tester) async {
      final app = await open(tester, 'more-controls');
      final field = find.descendant(of: key('ctl-field-join_max_attempts'), matching: find.byType(TextField));
      expect(tester.widget<TextField>(field).controller!.text, '5'); // current server value
      await tester.enterText(field, '8');
      await tester.tap(key('ctl-field-join_max_attempts-save'));
      await settle(tester);
      expect(app.admin.calls, ['config:join_max_attempts:8']);
      await tester.enterText(field, 'abc');
      await tester.tap(key('ctl-field-join_max_attempts-save'));
      await settle(tester);
      expect(app.admin.calls, hasLength(1));
      expect(find.textContaining('Enter a number'), findsOneWidget);
    });

    testApp('a blank landing line clears the key', (tester) async {
      final app = await open(tester, 'more-controls');
      await tester.ensureVisible(key('ctl-field-landing_headline-save'));
      final field = find.descendant(of: key('ctl-field-landing_headline'), matching: find.byType(TextField));
      await tester.enterText(field, 'Plan together');
      await tester.tap(key('ctl-field-landing_headline-save'));
      await settle(tester);
      await tester.enterText(field, '');
      await tester.tap(key('ctl-field-landing_headline-save'));
      await settle(tester);
      expect(app.admin.calls, ['config:landing_headline:Plan together', 'config:landing_headline:null']);
    });
  });

  group('audit', () {
    testApp('filters by group and purges after confirmation', (tester) async {
      final app = await open(tester, 'more-audit');
      expect(key('audit-1'), findsOneWidget);
      expect(key('audit-2'), findsOneWidget);
      await tapKey(tester, 'audit-filter-security');
      expect(key('audit-1'), findsNothing);
      expect(key('audit-2'), findsOneWidget); // user_suspended
      await tester.tap(key('audit-purge'));
      await settle(tester);
      expect(find.text('Purge old audit entries?'), findsOneWidget);
      await tester.tap(find.widgetWithText(AppButton, 'Purge').last);
      await settle(tester);
      expect(app.admin.calls, ['purgeAudit:90']);
    });
  });

  group('features', () {
    testApp('marks a request shipped with a note', (tester) async {
      final app = await open(tester, 'more-features');
      expect(find.text('1 of 2 shipped'), findsOneWidget);
      await tester.tap(key('feature-FEAT-1'));
      await settle(tester);
      await tester.tap(key('feature-set-shipped'));
      await tester.enterText(find.descendant(of: key('feature-note'), matching: find.byType(TextField)), 'In 3.54');
      await tester.tap(key('feature-save'));
      await settle(tester);
      expect(app.admin.calls, ['feature:FEAT-1:shipped:In 3.54']);
      expect(find.text('2 of 2 shipped'), findsOneWidget);
    });

    testApp('logs a new feature and deletes one after confirmation', (tester) async {
      final app = await open(tester, 'more-features');
      await tester.tap(key('feature-new'));
      await settle(tester);
      await tester.enterText(
        find.descendant(of: key('newfeature-title'), matching: find.byType(TextField)),
        'Trip chat export',
      );
      await tester.tap(find.text('sync').last);
      await tester.tap(key('newfeature-submit'));
      await settle(tester);
      expect(app.admin.calls, ['createFeature:Trip chat export:sync']);
      await tester.tap(key('feature-FEAT-2'));
      await settle(tester);
      await tester.tap(key('feature-delete'));
      await settle(tester);
      await tester.tap(find.widgetWithText(AppButton, 'Delete').last);
      await settle(tester);
      expect(app.admin.calls.last, 'deleteFeature:FEAT-2');
      expect(key('feature-FEAT-2'), findsNothing);
    });
  });

  group('analytics', () {
    Future<void> inTab(WidgetTester tester, String label) async {
      final tab = find.descendant(of: key('analytics-tabs'), matching: find.text(label));
      await tester.ensureVisible(tab); // the tab bar scrolls sideways on a phone
      await tester.tap(tab);
      await settle(tester);
    }

    testApp('Growth tab: loop health, funnel, ghost trips, win-back and the server-side retention figures', (
      tester,
    ) async {
      await open(tester, 'more-analytics');
      expect(key('gr-loop'), findsOneWidget);
      expect(find.text('First expense ≤ 10 min'), findsOneWidget);
      expect(
        find.descendant(of: key('gr-loop'), matching: find.text('33%')),
        findsNWidgets(2),
      ); // first expense and settlement: 2 of 6 trips each
      expect(find.text('Created a trip'), findsOneWidget);
      expect(find.textContaining('Idle · 1 members'), findsNWidgets(2)); // T3 and T5
      expect(find.textContaining('Unpaid'), findsOneWidget); // T4
      await tester.scrollUntilVisible(key('gr-winback'), 300, scrollable: find.byType(Scrollable).last);
      expect(find.text('T5'), findsWidgets); // the win-back row
      await tester.scrollUntilVisible(key('an-repeat'), 400, scrollable: find.byType(Scrollable).last);
      expect(find.textContaining('2 of 8 creators'), findsOneWidget);
    });

    testApp('Overview tab: fleet counts, lifecycle and stale trips', (tester) async {
      await open(tester, 'more-analytics');
      await inTab(tester, 'Overview');
      expect(key('ov-glance'), findsOneWidget);
      expect(find.descendant(of: key('ov-glance'), matching: find.text('5')), findsOneWidget); // transactions
      expect(find.descendant(of: key('an-lifecycle'), matching: find.text('6')), findsOneWidget); // active trips
      expect(find.text('98d'), findsOneWidget); // T1 is the stalest trip
    });

    testApp('Financial tab: currency volume, categories, spenders, split modes', (tester) async {
      await open(tester, 'more-analytics');
      await inTab(tester, 'Financial');
      expect(find.text('INR'), findsOneWidget);
      expect(find.text('USD'), findsOneWidget);
      expect(find.textContaining('Food & Dining'), findsOneWidget);
      expect(find.text('Asha'), findsOneWidget); // top spender
      expect(find.text('Equal'), findsOneWidget);
      expect(key('fin-settlement'), findsOneWidget);
    });

    testApp('Engagement and Health tabs show the server-side figures', (tester) async {
      await open(tester, 'more-analytics');
      await inTab(tester, 'Engagement');
      expect(find.textContaining('40 sent · 30 read (75%)'), findsOneWidget);
      expect(key('en-weekday'), findsOneWidget);
      await inTab(tester, 'Health');
      expect(find.textContaining('20 users opened · 1 stuck · 2 failed'), findsOneWidget);
      expect(find.textContaining('4 expenses are waiting'), findsOneWidget);
    });
  });

  group('tools', () {
    testApp('pings services, purges the bin after confirmation and checks the password', (tester) async {
      final app = await open(tester, 'more-tools');
      expect(find.textContaining('4 expenses'), findsOneWidget);
      await tester.tap(key('tools-ping'));
      await settle(tester);
      expect(key('check-Database'), findsOneWidget);
      await tester.tap(key('tools-purge'));
      await settle(tester);
      await tester.tap(find.widgetWithText(AppButton, 'Purge').last);
      await settle(tester);
      expect(app.admin.calls, ['purgeBin:30']);
      await tester.enterText(key('tools-pw'), 'short');
      await tapKey(tester, 'tools-pw-save');
      expect(find.textContaining('at least 8'), findsOneWidget);
      expect(app.admin.calls, hasLength(1));
      await tester.enterText(key('tools-pw'), 'longenough1');
      await tester.enterText(key('tools-pw2'), 'longenough1');
      await tapKey(tester, 'tools-pw-save');
      expect(app.admin.calls.last, 'password:11');
    });
  });
}
