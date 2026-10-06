import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/widgets/app_button.dart';

import 'support/pump_app.dart';

void main() {
  const signedIn = asha;

  testApp('signed in: lands on the trips list', (tester) async {
    await pumpApp(tester, user: signedIn);
    expect(find.text('My Trips'), findsOneWidget);
  });

  testApp('signed out: redirected to login', (tester) async {
    await pumpApp(tester);
    expect(find.text('Sign In'), findsWidgets);
    expect(find.text('My Trips'), findsNothing);
  });

  testApp('signing out from a signed-in session returns to login', (tester) async {
    final app = await pumpApp(tester, user: signedIn);
    await app.auth.signOut();
    await tester.pumpAndSettle();
    expect(find.text('My Trips'), findsNothing);
    expect(find.text('Sign In'), findsWidgets);
  });

  testApp('first sign-in goes through onboarding, then trips', (tester) async {
    final app = await pumpApp(tester);
    await tester.enterText(field(0), 'a@b.c');
    await tester.enterText(field(1), 'pw');
    await tester.tap(find.widgetWithText(AppButton, 'Sign In').first);
    await tester.pumpAndSettle();
    expect(app.auth.calls, contains('email:a@b.c'));
    expect(find.text('Skip'), findsOneWidget);
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(find.text('My Trips'), findsOneWidget);
  });
}
