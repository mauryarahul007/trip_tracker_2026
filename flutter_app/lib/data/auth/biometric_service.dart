import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';

/// Device biometrics / passcode, behind a seam so lock logic is testable.
abstract class BiometricService {
  Future<bool> isAvailable();

  /// True only when the user passed the prompt.
  Future<bool> authenticate(String reason);
}

class LocalAuthBiometricService implements BiometricService {
  final _auth = LocalAuthentication();

  @override
  Future<bool> isAvailable() async {
    try {
      return await _auth.isDeviceSupported() && await _auth.canCheckBiometrics;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<bool> authenticate(String reason) async {
    try {
      return await _auth.authenticate(localizedReason: reason);
    } catch (_) {
      return false;
    }
  }
}

final biometricServiceProvider = Provider<BiometricService>((ref) => LocalAuthBiometricService());
