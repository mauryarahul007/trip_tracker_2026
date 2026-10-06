import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/auth/social_auth.dart';
import '../../../data/providers.dart';

/// Native Google/Apple sign-in then token exchange. A cancelled prompt is not
/// an error. Throws `AuthException` (from the repository) on failure.
Future<void> signInWithGoogle(WidgetRef ref) async {
  final cred = await ref.read(socialAuthProvider).google();
  if (cred == null) return;
  await ref.read(authRepositoryProvider).signInWithGoogleIdToken(cred.idToken, nonce: cred.nonce);
}

Future<void> signInWithApple(WidgetRef ref) async {
  final cred = await ref.read(socialAuthProvider).apple();
  if (cred == null) return;
  await ref.read(authRepositoryProvider).signInWithAppleIdToken(cred.idToken, nonce: cred.nonce, fullName: cred.fullName);
}
