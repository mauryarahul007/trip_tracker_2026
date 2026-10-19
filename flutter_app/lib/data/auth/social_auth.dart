import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../core/env/app_env.dart';

class SocialCredential {
  const SocialCredential({required this.idToken, this.nonce, this.fullName});
  final String idToken;

  /// Raw nonce whose SHA-256 was sent to the provider (Apple).
  final String? nonce;
  final String? fullName;
}

/// Native Google / Apple sign-in. Both return null when the user cancels
/// (not an error) and throw for real failures.
abstract class SocialAuth {
  bool get appleAvailable;
  Future<SocialCredential?> google();
  Future<SocialCredential?> apple();
}

class NativeSocialAuth implements SocialAuth {
  NativeSocialAuth(this._env);
  final AppEnv _env;
  bool _googleReady = false;

  /// Guideline 4.8: Apple sign-in is offered on iOS alongside Google.
  @override
  bool get appleAvailable => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

  @override
  Future<SocialCredential?> google() async {
    if (!_googleReady) {
      await GoogleSignIn.instance.initialize(
        serverClientId: _env.googleServerClientId.isEmpty ? null : _env.googleServerClientId,
        clientId: _env.googleIosClientId.isEmpty ? null : _env.googleIosClientId,
      );
      _googleReady = true;
    }
    try {
      final account = await GoogleSignIn.instance.authenticate();
      final token = account.authentication.idToken;
      return token == null ? null : SocialCredential(idToken: token);
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return null;
      rethrow;
    }
  }

  @override
  Future<SocialCredential?> apple() async {
    final raw = _randomNonce();
    try {
      final c = await SignInWithApple.getAppleIDCredential(
        scopes: [AppleIDAuthorizationScopes.email, AppleIDAuthorizationScopes.fullName],
        nonce: sha256.convert(utf8.encode(raw)).toString(),
      );
      final token = c.identityToken;
      if (token == null) return null;
      final name = [c.givenName, c.familyName].whereType<String>().join(' ').trim();
      return SocialCredential(idToken: token, nonce: raw, fullName: name.isEmpty ? null : name);
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return null;
      rethrow;
    }
  }

  static String _randomNonce([int length = 32]) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
    final r = Random.secure();
    return List.generate(length, (_) => chars[r.nextInt(chars.length)]).join();
  }
}

final socialAuthProvider = Provider<SocialAuth>((ref) => NativeSocialAuth(AppEnv.current));
