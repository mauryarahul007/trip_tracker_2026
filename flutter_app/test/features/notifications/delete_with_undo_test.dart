import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/local/app_database.dart';
import 'package:trip_tracker/data/repositories/notification_repository.dart';
import 'package:trip_tracker/features/notifications/application/delete_with_undo.dart';
import 'package:trip_tracker/shared/theme/app_theme.dart';

void main() {
  late AppDatabase db;
  late NotificationRepository repo;

  setUp(() {
    db = AppDatabase.memory();
    repo = NotificationRepository(db, null);
  });
  tearDown(() async => db.close());

  Future<int> rowCount(WidgetTester tester) async =>
      (await tester.runAsync(() => db.select(db.notificationsTable).get()))!.length;

  Future<void> pumpHarness(WidgetTester tester, {required bool undoOn, required List<String> log}) async {
    await tester.runAsync(
      () => db
          .into(db.notificationsTable)
          .insert(
            NotificationsTableCompanion.insert(
              id: 'n1',
              userId: 'u1',
              title: 'Expense Added',
              body: 'Taxi',
              createdAt: '2026-11-02T10:00:00Z',
            ),
          ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => deleteNotificationWithUndo(
                context,
                repo: repo,
                id: 'n1',
                undoOn: undoOn,
                hide: () => log.add('hide'),
                show: () => log.add('show'),
              ),
              child: const Text('swipe'),
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('hides the row, offers Undo, and deletes once the window closes', (tester) async {
    final log = <String>[];
    await pumpHarness(tester, undoOn: true, log: log);
    await tester.tap(find.text('swipe'));
    await tester.pump();
    expect(log, ['hide']);
    expect(find.text('UNDO'), findsOneWidget);
    expect(await rowCount(tester), 1); // still stored while the Undo window is open

    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(seconds: 6));
    await tester.pumpAndSettle();
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
    expect(await rowCount(tester), 0);
    expect(log, ['hide']);
  });

  testWidgets('Undo puts the row back and keeps it stored', (tester) async {
    final log = <String>[];
    await pumpHarness(tester, undoOn: true, log: log);
    await tester.tap(find.text('swipe'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500)); // let the snackbar finish sliding in
    await tester.tap(find.text('UNDO'));
    await tester.pump(const Duration(seconds: 7));
    await tester.pumpAndSettle();
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 300)));
    expect(log, ['hide', 'show']);
    expect(await rowCount(tester), 1);
  });

  testWidgets('with undo off it deletes straight away and shows no snackbar', (tester) async {
    final log = <String>[];
    await pumpHarness(tester, undoOn: false, log: log);
    await tester.tap(find.text('swipe'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('UNDO'), findsNothing);
    expect(log, isEmpty);
    expect(await rowCount(tester), 0);
  });
}
