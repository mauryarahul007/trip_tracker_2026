import '../../../domain/repositories/repositories.dart';
import '../../../l10n/app_localizations.dart';

String authErrorMessage(AuthFailure f, AppLocalizations l10n) => switch (f) {
      AuthFailure.signInsPaused => l10n.authSignInsPaused,
      AuthFailure.banned => l10n.authErrorBanned,
      AuthFailure.invalidCredentials => l10n.authErrorInvalid,
      AuthFailure.network => l10n.authErrorNetwork,
      AuthFailure.unknown => l10n.authErrorGeneric,
    };
