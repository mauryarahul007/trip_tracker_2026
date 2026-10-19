import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/data/auth/social_auth.dart';
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
    expect(find.text('Continue with Google'), findsWidgets);
    expect(find.text('My Trips'), findsNothing);
  });

  testApp('signing out from a signed-in session returns to login', (tester) async {
    final app = await pumpApp(tester, user: signedIn);
    await app.auth.signOut();
    await tester.pumpAndSettle();
    expect(find.text('My Trips'), findsNothing);
    expect(find.text('Continue with Google'), findsWidgets);
  });

  testApp('first sign-in goes through onboarding, then trips', (tester) async {
    final app = await pumpApp(tester);
    app.social.googleResult = const SocialCredential(idToken: 'g-token');
    await tester.tap(find.widgetWithText(AppButton, 'Continue with Google'));
    await tester.pumpAndSettle();
    expect(app.auth.calls, contains('google'));
    expect(find.text('Skip'), findsOneWidget);
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(find.text('My Trips'), findsOneWidget);
  });
}
