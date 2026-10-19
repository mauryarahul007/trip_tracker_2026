import 'package:flutter_riverpod/flutter_riverpod.dart';

/// True after an explicit Superadmin login (the collapsed form on the login screen).
/// The router then keeps the session on `/admin` instead of the traveller UI.
/// Memory-only on purpose: a cold start returns to the normal app until the form is used again.
class AdminModeNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool on) => state = on;
}

final adminModeProvider = NotifierProvider<AdminModeNotifier, bool>(AdminModeNotifier.new);
