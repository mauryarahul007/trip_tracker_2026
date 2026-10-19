import 'package:flutter/widgets.dart';

import 'app_localizations.dart';

extension L10nContext on BuildContext {
  /// Non-null strings; MaterialApp always installs the delegates.
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}
