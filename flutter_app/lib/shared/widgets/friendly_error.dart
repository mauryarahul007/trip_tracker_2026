import 'package:supabase_flutter/supabase_flutter.dart' show AuthException;

import '../../l10n/app_localizations.dart';

/// Title and line for a failed load, by cause: offline, signed out, or a server/app fault. Flag
/// `enableClearErrorStates` off keeps the one generic message. The raw error never reaches the screen.
({String title, String message}) friendlyError(
  AppLocalizations l10n,
  Object? error, {
  required bool online,
  bool clear = true,
}) {
  if (!clear) return (title: l10n.errorGenericTitle, message: l10n.errorGenericMessage);
  if (!online) return (title: l10n.errorOfflineTitle, message: l10n.errorOfflineMessage);
  if (error is AuthException) return (title: l10n.errorSignedOutTitle, message: l10n.errorSignedOutMessage);
  return (title: l10n.errorServerTitle, message: l10n.errorServerMessage);
}
