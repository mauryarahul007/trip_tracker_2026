// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Trip Tracker';

  @override
  String get navTrips => 'Trips';

  @override
  String get navChat => 'Chat';

  @override
  String get navExpenses => 'Expenses';

  @override
  String get navBalances => 'Balances';

  @override
  String get navMembers => 'Members';

  @override
  String get navNotes => 'Notes';

  @override
  String get navSettings => 'Settings';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get actionConfirm => 'Confirm';

  @override
  String get actionSave => 'Save';

  @override
  String get actionDelete => 'Delete';

  @override
  String get actionUndo => 'Undo';

  @override
  String get actionRetry => 'Retry';

  @override
  String get actionBack => 'Back';

  @override
  String get actionSignIn => 'Sign In';

  @override
  String get actionSignOut => 'Sign Out';

  @override
  String get actionClose => 'Close';

  @override
  String get actionCreateTrip => 'Create Trip';

  @override
  String get statusOffline => 'You are offline';

  @override
  String get statusOfflineSubtitle =>
      'Changes will be queued and synced when reconnected';

  @override
  String get statusConnected => 'Connected';

  @override
  String get errorGenericTitle => 'Something went wrong';

  @override
  String get errorGenericMessage =>
      'An unexpected error occurred. Please try again.';

  @override
  String get errorBoundaryTitle => 'Application Error';

  @override
  String get errorBoundarySubtitle =>
      'We encountered an unexpected problem. You can retry or return home.';

  @override
  String get emptyTripsTitle => 'No trips yet';

  @override
  String get emptyTripsSubtitle =>
      'Start by creating a trip or joining an existing one with an invite code.';

  @override
  String get authWelcome => 'Welcome to Trip Tracker';

  @override
  String get authSubtitle =>
      'Plan trips, split expenses, and travel seamlessly together.';

  @override
  String get authResetPassword => 'Reset Password';

  @override
  String get authTerms => 'Terms of Service';

  @override
  String get authPrivacy => 'Privacy Policy';

  @override
  String get authDeleteAccount => 'Delete Account';

  @override
  String get joinTripTitle => 'Join Trip';

  @override
  String get shareTripTitle => 'Share Trip';

  @override
  String get liveLocationTitle => 'Live Location';

  @override
  String get smokeTestTitle => 'Staging Smoke Test';

  @override
  String get smokeTestStatusConnecting => 'Connecting to Supabase staging...';

  @override
  String get smokeTestStatusSuccess =>
      'Successfully connected and verified row read.';

  @override
  String get smokeTestStatusError => 'Smoke test failed: ';
}
