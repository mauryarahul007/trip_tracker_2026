import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en')];

  /// The title of the application
  ///
  /// In en, this message translates to:
  /// **'Trip Tracker'**
  String get appTitle;

  /// No description provided for @navTrips.
  ///
  /// In en, this message translates to:
  /// **'Trips'**
  String get navTrips;

  /// No description provided for @navChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get navChat;

  /// No description provided for @navExpenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get navExpenses;

  /// No description provided for @navSummary.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get navSummary;

  /// No description provided for @ledHeroYouOwed.
  ///
  /// In en, this message translates to:
  /// **'You are owed'**
  String get ledHeroYouOwed;

  /// No description provided for @ledHeroYouOwe.
  ///
  /// In en, this message translates to:
  /// **'You owe'**
  String get ledHeroYouOwe;

  /// No description provided for @ledHeroGroupOwed.
  ///
  /// In en, this message translates to:
  /// **'{name} is owed'**
  String ledHeroGroupOwed(String name);

  /// No description provided for @ledHeroGroupOwes.
  ///
  /// In en, this message translates to:
  /// **'{name} owes'**
  String ledHeroGroupOwes(String name);

  /// No description provided for @ledHeroSquare.
  ///
  /// In en, this message translates to:
  /// **'All square'**
  String get ledHeroSquare;

  /// No description provided for @ledYourMoney.
  ///
  /// In en, this message translates to:
  /// **'Your money'**
  String get ledYourMoney;

  /// No description provided for @ledToReceive.
  ///
  /// In en, this message translates to:
  /// **'To receive'**
  String get ledToReceive;

  /// No description provided for @ledToPay.
  ///
  /// In en, this message translates to:
  /// **'To pay'**
  String get ledToPay;

  /// No description provided for @ledProgress.
  ///
  /// In en, this message translates to:
  /// **'Settlement progress'**
  String get ledProgress;

  /// No description provided for @ledProgressLine.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total} settled'**
  String ledProgressLine(String done, String total);

  /// No description provided for @ledProgressLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 payment left} other{{count} payments left}} to square up'**
  String ledProgressLeft(int count);

  /// No description provided for @ledProgressDone.
  ///
  /// In en, this message translates to:
  /// **'Everyone is square'**
  String get ledProgressDone;

  /// No description provided for @ledSpendReport.
  ///
  /// In en, this message translates to:
  /// **'Spend report'**
  String get ledSpendReport;

  /// No description provided for @ledByCategory.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get ledByCategory;

  /// No description provided for @ledByPerson.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get ledByPerson;

  /// No description provided for @ledAllExpenses.
  ///
  /// In en, this message translates to:
  /// **'All expenses'**
  String get ledAllExpenses;

  /// No description provided for @ledShareOfTotal.
  ///
  /// In en, this message translates to:
  /// **'{percent}% of total'**
  String ledShareOfTotal(int percent);

  /// No description provided for @ledInsightTop.
  ///
  /// In en, this message translates to:
  /// **'Biggest spend: {name} at {percent}%'**
  String ledInsightTop(String name, int percent);

  /// No description provided for @ledPassTitle.
  ///
  /// In en, this message translates to:
  /// **'Settlement pass'**
  String get ledPassTitle;

  /// No description provided for @ledHeroTravellers.
  ///
  /// In en, this message translates to:
  /// **'Travellers'**
  String get ledHeroTravellers;

  /// No description provided for @ledSpendByCategory.
  ///
  /// In en, this message translates to:
  /// **'Spend by category'**
  String get ledSpendByCategory;

  /// No description provided for @ledWhoPaid.
  ///
  /// In en, this message translates to:
  /// **'Who paid'**
  String get ledWhoPaid;

  /// No description provided for @mapNoRoute.
  ///
  /// In en, this message translates to:
  /// **'No route yet'**
  String get mapNoRoute;

  /// No description provided for @mapNoRouteHint.
  ///
  /// In en, this message translates to:
  /// **'Add the places you will visit to see the trip on a map.'**
  String get mapNoRouteHint;

  /// No description provided for @mapAddStops.
  ///
  /// In en, this message translates to:
  /// **'Add stops'**
  String get mapAddStops;

  /// No description provided for @mapOpenRoute.
  ///
  /// In en, this message translates to:
  /// **'Open route'**
  String get mapOpenRoute;

  /// No description provided for @ledStampSettled.
  ///
  /// In en, this message translates to:
  /// **'Settled'**
  String get ledStampSettled;

  /// No description provided for @ledStampNotSettled.
  ///
  /// In en, this message translates to:
  /// **'Not settled'**
  String get ledStampNotSettled;

  /// No description provided for @ledHeroTrip.
  ///
  /// In en, this message translates to:
  /// **'Trip'**
  String get ledHeroTrip;

  /// No description provided for @ledHeroOpen.
  ///
  /// In en, this message translates to:
  /// **'Open payments'**
  String get ledHeroOpen;

  /// No description provided for @ledFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get ledFrom;

  /// No description provided for @ledTo.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get ledTo;

  /// No description provided for @ledModeFewest.
  ///
  /// In en, this message translates to:
  /// **'Fewest payments'**
  String get ledModeFewest;

  /// No description provided for @ledModePerPerson.
  ///
  /// In en, this message translates to:
  /// **'Per person'**
  String get ledModePerPerson;

  /// No description provided for @ledCountsSame.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 payment} other{{count} payments}} either way for this trip'**
  String ledCountsSame(int count);

  /// No description provided for @ledCountsSaves.
  ///
  /// In en, this message translates to:
  /// **'{simple, plural, =1{1 payment} other{{simple} payments}} instead of {direct}'**
  String ledCountsSaves(int simple, int direct);

  /// No description provided for @ledOthers.
  ///
  /// In en, this message translates to:
  /// **'Everyone else'**
  String get ledOthers;

  /// No description provided for @ledAllSettledYou.
  ///
  /// In en, this message translates to:
  /// **'You are all settled up'**
  String get ledAllSettledYou;

  /// No description provided for @ledNumbers.
  ///
  /// In en, this message translates to:
  /// **'Trip numbers'**
  String get ledNumbers;

  /// No description provided for @ledOpenInsights.
  ///
  /// In en, this message translates to:
  /// **'Open spend insights'**
  String get ledOpenInsights;

  /// No description provided for @navBalances.
  ///
  /// In en, this message translates to:
  /// **'Balances'**
  String get navBalances;

  /// No description provided for @navMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get navMembers;

  /// No description provided for @navNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get navNotes;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @actionCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get actionCancel;

  /// No description provided for @actionConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get actionConfirm;

  /// No description provided for @actionSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get actionSave;

  /// No description provided for @actionDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get actionDelete;

  /// No description provided for @actionUndo.
  ///
  /// In en, this message translates to:
  /// **'Undo'**
  String get actionUndo;

  /// No description provided for @actionRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get actionRetry;

  /// No description provided for @actionBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get actionBack;

  /// No description provided for @actionSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get actionSignIn;

  /// No description provided for @actionSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get actionSignOut;

  /// No description provided for @actionClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get actionClose;

  /// No description provided for @actionCreateTrip.
  ///
  /// In en, this message translates to:
  /// **'Create Trip'**
  String get actionCreateTrip;

  /// No description provided for @statusOffline.
  ///
  /// In en, this message translates to:
  /// **'You are offline'**
  String get statusOffline;

  /// No description provided for @statusOfflineSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Changes will be queued and synced when reconnected'**
  String get statusOfflineSubtitle;

  /// No description provided for @statusConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get statusConnected;

  /// No description provided for @errorGenericTitle.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorGenericTitle;

  /// No description provided for @errorGenericMessage.
  ///
  /// In en, this message translates to:
  /// **'An unexpected error occurred. Please try again.'**
  String get errorGenericMessage;

  /// No description provided for @errorBoundaryTitle.
  ///
  /// In en, this message translates to:
  /// **'Application Error'**
  String get errorBoundaryTitle;

  /// No description provided for @errorBoundarySubtitle.
  ///
  /// In en, this message translates to:
  /// **'We encountered an unexpected problem. You can retry or return home.'**
  String get errorBoundarySubtitle;

  /// No description provided for @emptyTripsTitle.
  ///
  /// In en, this message translates to:
  /// **'No trips yet'**
  String get emptyTripsTitle;

  /// No description provided for @emptyTripsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Start by creating a trip or joining an existing one with an invite code.'**
  String get emptyTripsSubtitle;

  /// No description provided for @authWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Trip Tracker'**
  String get authWelcome;

  /// No description provided for @authSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Plan trips, split expenses, and travel seamlessly together.'**
  String get authSubtitle;

  /// No description provided for @authTileSplit.
  ///
  /// In en, this message translates to:
  /// **'Split every cost'**
  String get authTileSplit;

  /// No description provided for @authTileFlights.
  ///
  /// In en, this message translates to:
  /// **'Boarding passes'**
  String get authTileFlights;

  /// No description provided for @authTileSettle.
  ///
  /// In en, this message translates to:
  /// **'Settle up fast'**
  String get authTileSettle;

  /// No description provided for @authTileOffline.
  ///
  /// In en, this message translates to:
  /// **'Works offline'**
  String get authTileOffline;

  /// No description provided for @authTileCrew.
  ///
  /// In en, this message translates to:
  /// **'Plan with your crew'**
  String get authTileCrew;

  /// No description provided for @authResetPassword.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get authResetPassword;

  /// No description provided for @authTerms.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get authTerms;

  /// No description provided for @authPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get authPrivacy;

  /// No description provided for @authDeleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get authDeleteAccount;

  /// No description provided for @joinTripTitle.
  ///
  /// In en, this message translates to:
  /// **'Join Trip'**
  String get joinTripTitle;

  /// No description provided for @shareTripTitle.
  ///
  /// In en, this message translates to:
  /// **'Share Trip'**
  String get shareTripTitle;

  /// No description provided for @liveLocationTitle.
  ///
  /// In en, this message translates to:
  /// **'Live Location'**
  String get liveLocationTitle;

  /// No description provided for @smokeTestTitle.
  ///
  /// In en, this message translates to:
  /// **'Staging Smoke Test'**
  String get smokeTestTitle;

  /// No description provided for @smokeTestStatusConnecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting to Supabase staging...'**
  String get smokeTestStatusConnecting;

  /// No description provided for @smokeTestStatusSuccess.
  ///
  /// In en, this message translates to:
  /// **'Successfully connected and verified row read.'**
  String get smokeTestStatusSuccess;

  /// No description provided for @smokeTestStatusError.
  ///
  /// In en, this message translates to:
  /// **'Smoke test failed: '**
  String get smokeTestStatusError;

  /// No description provided for @authContinueGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get authContinueGoogle;

  /// No description provided for @authContinueApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get authContinueApple;

  /// No description provided for @authSignInsPaused.
  ///
  /// In en, this message translates to:
  /// **'New sign-ins are temporarily paused. Please check back shortly.'**
  String get authSignInsPaused;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmail;

  /// No description provided for @authEmailHint.
  ///
  /// In en, this message translates to:
  /// **'you@example.com'**
  String get authEmailHint;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot Password?'**
  String get authForgotPassword;

  /// No description provided for @authSignUp.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get authSignUp;

  /// No description provided for @authToggleToSignUp.
  ///
  /// In en, this message translates to:
  /// **'New here? Create an account'**
  String get authToggleToSignUp;

  /// No description provided for @authToggleToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get authToggleToSignIn;

  /// No description provided for @authOr.
  ///
  /// In en, this message translates to:
  /// **'or'**
  String get authOr;

  /// No description provided for @authGuest.
  ///
  /// In en, this message translates to:
  /// **'Continue as guest'**
  String get authGuest;

  /// No description provided for @authDemo.
  ///
  /// In en, this message translates to:
  /// **'Try the demo'**
  String get authDemo;

  /// No description provided for @authErrorInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid email or password.'**
  String get authErrorInvalid;

  /// No description provided for @authSuperadminLogin.
  ///
  /// In en, this message translates to:
  /// **'Superadmin login'**
  String get authSuperadminLogin;

  /// No description provided for @adminTitle.
  ///
  /// In en, this message translates to:
  /// **'Superadmin'**
  String get adminTitle;

  /// No description provided for @adminSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Superadmin tools (flags, users, trips, analytics, audit, traveller preview) run in the web portal. You will be signed in automatically.'**
  String get adminSubtitle;

  /// No description provided for @adminOpenOpsDeck.
  ///
  /// In en, this message translates to:
  /// **'Open Ops Deck'**
  String get adminOpenOpsDeck;

  /// No description provided for @adminSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get adminSignOut;

  /// No description provided for @authSuperadminHint.
  ///
  /// In en, this message translates to:
  /// **'Admins only. Everyone else continues with Google.'**
  String get authSuperadminHint;

  /// No description provided for @authErrorNotSuperadmin.
  ///
  /// In en, this message translates to:
  /// **'This account is not a superadmin. Please continue with Google.'**
  String get authErrorNotSuperadmin;

  /// No description provided for @authErrorBanned.
  ///
  /// In en, this message translates to:
  /// **'This account has been suspended.'**
  String get authErrorBanned;

  /// No description provided for @authErrorNetwork.
  ///
  /// In en, this message translates to:
  /// **'Can\'t reach the server. Check your connection and try again.'**
  String get authErrorNetwork;

  /// No description provided for @authErrorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Sign-in failed. Please try again.'**
  String get authErrorGeneric;

  /// No description provided for @authErrorEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and password.'**
  String get authErrorEmailRequired;

  /// No description provided for @authLegal.
  ///
  /// In en, this message translates to:
  /// **'By continuing you agree to our Terms of Service and Privacy Policy.'**
  String get authLegal;

  /// No description provided for @resetRequestSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your account email and we\'ll send you a reset link.'**
  String get resetRequestSubtitle;

  /// No description provided for @resetSendLink.
  ///
  /// In en, this message translates to:
  /// **'Send Reset Link'**
  String get resetSendLink;

  /// No description provided for @resetCheckEmail.
  ///
  /// In en, this message translates to:
  /// **'Check your email'**
  String get resetCheckEmail;

  /// No description provided for @resetSentTo.
  ///
  /// In en, this message translates to:
  /// **'We sent a reset link to {email}'**
  String resetSentTo(String email);

  /// No description provided for @resetNewPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a new password'**
  String get resetNewPasswordTitle;

  /// No description provided for @resetNewPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get resetNewPassword;

  /// No description provided for @resetSavePassword.
  ///
  /// In en, this message translates to:
  /// **'Save Password'**
  String get resetSavePassword;

  /// No description provided for @resetPasswordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Use at least 8 characters.'**
  String get resetPasswordTooShort;

  /// No description provided for @resetPasswordUpdated.
  ///
  /// In en, this message translates to:
  /// **'Password updated.'**
  String get resetPasswordUpdated;

  /// No description provided for @lockTitle.
  ///
  /// In en, this message translates to:
  /// **'Trip Tracker is Locked'**
  String get lockTitle;

  /// No description provided for @lockSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Authenticate with Face ID, Touch ID or your device passcode to continue.'**
  String get lockSubtitle;

  /// No description provided for @lockUnlock.
  ///
  /// In en, this message translates to:
  /// **'Unlock'**
  String get lockUnlock;

  /// No description provided for @lockFailed.
  ///
  /// In en, this message translates to:
  /// **'Biometric verification failed. Tap to try again.'**
  String get lockFailed;

  /// No description provided for @lockReason.
  ///
  /// In en, this message translates to:
  /// **'Unlock Trip Tracker'**
  String get lockReason;

  /// No description provided for @onboardingWelcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome to Trip Tracker'**
  String get onboardingWelcomeTitle;

  /// No description provided for @onboardingWelcomeBody.
  ///
  /// In en, this message translates to:
  /// **'Plan trips, track shared expenses, and settle up — all offline-first.'**
  String get onboardingWelcomeBody;

  /// No description provided for @onboardingTripTitle.
  ///
  /// In en, this message translates to:
  /// **'Create Your First Trip'**
  String get onboardingTripTitle;

  /// No description provided for @onboardingTripBody.
  ///
  /// In en, this message translates to:
  /// **'Add a destination, dates, and members. Everyone can log expenses in real time.'**
  String get onboardingTripBody;

  /// No description provided for @onboardingExpenseTitle.
  ///
  /// In en, this message translates to:
  /// **'Log & Split Expenses'**
  String get onboardingExpenseTitle;

  /// No description provided for @onboardingExpenseBody.
  ///
  /// In en, this message translates to:
  /// **'Snap receipts, auto-suggest categories, and split bills equally or by exact amounts.'**
  String get onboardingExpenseBody;

  /// No description provided for @onboardingNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get onboardingNext;

  /// No description provided for @onboardingSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get onboardingSkip;

  /// No description provided for @onboardingGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get started'**
  String get onboardingGetStarted;

  /// No description provided for @authTripCodeHint.
  ///
  /// In en, this message translates to:
  /// **'Enter 6-digit trip code'**
  String get authTripCodeHint;

  /// No description provided for @tripsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Trips'**
  String get tripsTitle;

  /// No description provided for @tripsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search trips'**
  String get tripsSearchHint;

  /// No description provided for @tripsSortDate.
  ///
  /// In en, this message translates to:
  /// **'Newest first'**
  String get tripsSortDate;

  /// No description provided for @tripsSortName.
  ///
  /// In en, this message translates to:
  /// **'Name (A–Z)'**
  String get tripsSortName;

  /// No description provided for @tripsNewTrip.
  ///
  /// In en, this message translates to:
  /// **'New Trip'**
  String get tripsNewTrip;

  /// No description provided for @tripsJoinWithCode.
  ///
  /// In en, this message translates to:
  /// **'Join with Code'**
  String get tripsJoinWithCode;

  /// No description provided for @tripsArchivedSection.
  ///
  /// In en, this message translates to:
  /// **'Archived ({count})'**
  String tripsArchivedSection(int count);

  /// No description provided for @tripsNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No trips match your search.'**
  String get tripsNoMatches;

  /// No description provided for @tripsLoadError.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your trips.'**
  String get tripsLoadError;

  /// No description provided for @tripStartsIn.
  ///
  /// In en, this message translates to:
  /// **'Starts in {days} days'**
  String tripStartsIn(int days);

  /// No description provided for @tripStartsTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Starts tomorrow'**
  String get tripStartsTomorrow;

  /// No description provided for @tripDayOf.
  ///
  /// In en, this message translates to:
  /// **'Day {day} of {total}'**
  String tripDayOf(int day, int total);

  /// No description provided for @tripEnded.
  ///
  /// In en, this message translates to:
  /// **'Ended'**
  String get tripEnded;

  /// No description provided for @tripBadgeArchived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get tripBadgeArchived;

  /// No description provided for @tripBadgeClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get tripBadgeClosed;

  /// No description provided for @tripBadgeFrozen.
  ///
  /// In en, this message translates to:
  /// **'Frozen'**
  String get tripBadgeFrozen;

  /// No description provided for @tripTravelers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 traveler} other{{count} travelers}}'**
  String tripTravelers(int count);

  /// No description provided for @tripExpenseCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No expenses} =1{1 expense} other{{count} expenses}}'**
  String tripExpenseCount(int count);

  /// No description provided for @tripArchive.
  ///
  /// In en, this message translates to:
  /// **'Archive'**
  String get tripArchive;

  /// No description provided for @tripUnarchive.
  ///
  /// In en, this message translates to:
  /// **'Unarchive'**
  String get tripUnarchive;

  /// No description provided for @tripArchived.
  ///
  /// In en, this message translates to:
  /// **'Trip archived'**
  String get tripArchived;

  /// No description provided for @tripUnarchived.
  ///
  /// In en, this message translates to:
  /// **'Trip restored'**
  String get tripUnarchived;

  /// No description provided for @tripDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete trip'**
  String get tripDelete;

  /// No description provided for @tripDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this trip?'**
  String get tripDeleteTitle;

  /// No description provided for @tripDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes {name} for everyone, including all expenses and chat.'**
  String tripDeleteBody(String name);

  /// No description provided for @tripDeleted.
  ///
  /// In en, this message translates to:
  /// **'Trip deleted'**
  String get tripDeleted;

  /// No description provided for @syncPending.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 change waiting to sync} other{{count} changes waiting to sync}}'**
  String syncPending(int count);

  /// No description provided for @syncIssue.
  ///
  /// In en, this message translates to:
  /// **'Sync issue: tap to review'**
  String get syncIssue;

  /// No description provided for @syncSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'Sync queue'**
  String get syncSheetTitle;

  /// No description provided for @syncRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get syncRetry;

  /// No description provided for @syncDiscard.
  ///
  /// In en, this message translates to:
  /// **'Discard'**
  String get syncDiscard;

  /// No description provided for @createTripTitle.
  ///
  /// In en, this message translates to:
  /// **'Create Trip'**
  String get createTripTitle;

  /// No description provided for @fieldTripName.
  ///
  /// In en, this message translates to:
  /// **'Trip name'**
  String get fieldTripName;

  /// No description provided for @fieldTripNameHint.
  ///
  /// In en, this message translates to:
  /// **'Goa weekend'**
  String get fieldTripNameHint;

  /// No description provided for @fieldDestination.
  ///
  /// In en, this message translates to:
  /// **'Destination'**
  String get fieldDestination;

  /// No description provided for @fieldDates.
  ///
  /// In en, this message translates to:
  /// **'Dates'**
  String get fieldDates;

  /// No description provided for @fieldCurrency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get fieldCurrency;

  /// No description provided for @createTripNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Give your trip a name.'**
  String get createTripNameRequired;

  /// No description provided for @createTripDatesRequired.
  ///
  /// In en, this message translates to:
  /// **'Pick the trip dates.'**
  String get createTripDatesRequired;

  /// No description provided for @createTripCreating.
  ///
  /// In en, this message translates to:
  /// **'Creating…'**
  String get createTripCreating;

  /// No description provided for @backAgainToExit.
  ///
  /// In en, this message translates to:
  /// **'Press back again to exit'**
  String get backAgainToExit;

  /// No description provided for @tripSettingsComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Trip settings arrive in a later update.'**
  String get tripSettingsComingSoon;

  /// No description provided for @joinInvitedTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re invited to \"{trip}\"'**
  String joinInvitedTitle(String trip);

  /// No description provided for @joinAlreadyOnTrip.
  ///
  /// In en, this message translates to:
  /// **'{names} is already on this trip.'**
  String joinAlreadyOnTrip(String names);

  /// No description provided for @joinAlreadyOnTripPlural.
  ///
  /// In en, this message translates to:
  /// **'{names} are already on this trip.'**
  String joinAlreadyOnTripPlural(String names);

  /// No description provided for @joinSignInPrompt.
  ///
  /// In en, this message translates to:
  /// **'Sign in to join this trip.'**
  String get joinSignInPrompt;

  /// No description provided for @joinGuestsCantJoin.
  ///
  /// In en, this message translates to:
  /// **'Guest mode can\'t join shared trips. Sign in with an account to continue.'**
  String get joinGuestsCantJoin;

  /// No description provided for @joinMoreSignIn.
  ///
  /// In en, this message translates to:
  /// **'More sign-in options'**
  String get joinMoreSignIn;

  /// No description provided for @joinPickTitle.
  ///
  /// In en, this message translates to:
  /// **'Join \"{trip}\"'**
  String joinPickTitle(String trip);

  /// No description provided for @joinPickSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Which traveler are you?'**
  String get joinPickSubtitle;

  /// No description provided for @joinImMember.
  ///
  /// In en, this message translates to:
  /// **'I\'m {name}'**
  String joinImMember(String name);

  /// No description provided for @joinClaimedByOther.
  ///
  /// In en, this message translates to:
  /// **'That member was just claimed by someone else. Pick another.'**
  String get joinClaimedByOther;

  /// No description provided for @joinAlreadyInTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re already in \"{trip}\"'**
  String joinAlreadyInTitle(String trip);

  /// No description provided for @joinYoureAdmin.
  ///
  /// In en, this message translates to:
  /// **'You\'re the admin of this trip.'**
  String get joinYoureAdmin;

  /// No description provided for @joinAlreadyClaimed.
  ///
  /// In en, this message translates to:
  /// **'You\'ve already claimed your spot on this trip.'**
  String get joinAlreadyClaimed;

  /// No description provided for @joinOpenTrip.
  ///
  /// In en, this message translates to:
  /// **'Open trip'**
  String get joinOpenTrip;

  /// No description provided for @joinEveryoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Everyone\'s already joined'**
  String get joinEveryoneTitle;

  /// No description provided for @joinEveryoneBody.
  ///
  /// In en, this message translates to:
  /// **'All members of \"{trip}\" have already claimed their spot. Ask the trip admin if you think this is a mistake.'**
  String joinEveryoneBody(String trip);

  /// No description provided for @joinInvalidTitle.
  ///
  /// In en, this message translates to:
  /// **'Invite not found'**
  String get joinInvalidTitle;

  /// No description provided for @joinInvalidBody.
  ///
  /// In en, this message translates to:
  /// **'This invite code doesn\'t match any trip. Double-check the link, or ask the trip admin to resend it.'**
  String get joinInvalidBody;

  /// No description provided for @joinGoToTrips.
  ///
  /// In en, this message translates to:
  /// **'Go to my trips'**
  String get joinGoToTrips;

  /// No description provided for @joinBackToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to sign in'**
  String get joinBackToSignIn;

  /// No description provided for @joinErrorTitle.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load this invite'**
  String get joinErrorTitle;

  /// No description provided for @joinTooManyAttempts.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Try again in {time}.'**
  String joinTooManyAttempts(String time);

  /// No description provided for @joinEnterCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Join with a trip code'**
  String get joinEnterCodeTitle;

  /// No description provided for @joinEnterCodeAction.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get joinEnterCodeAction;

  /// No description provided for @joinCodeInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-character code from your invite.'**
  String get joinCodeInvalid;

  /// No description provided for @shareEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Trip Tracker · Trip summary'**
  String get shareEyebrow;

  /// No description provided for @shareTravelers.
  ///
  /// In en, this message translates to:
  /// **'Travelers'**
  String get shareTravelers;

  /// No description provided for @shareExpenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get shareExpenses;

  /// No description provided for @shareTotalSpend.
  ///
  /// In en, this message translates to:
  /// **'Total spend'**
  String get shareTotalSpend;

  /// No description provided for @shareEndedTitle.
  ///
  /// In en, this message translates to:
  /// **'This link has ended'**
  String get shareEndedTitle;

  /// No description provided for @shareEndedBody.
  ///
  /// In en, this message translates to:
  /// **'It was turned off or has expired. Ask the trip organizer for a fresh link.'**
  String get shareEndedBody;

  /// No description provided for @shareLoadError.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load this trip summary.'**
  String get shareLoadError;

  /// No description provided for @inviteSheetTitle.
  ///
  /// In en, this message translates to:
  /// **'Invite travelers'**
  String get inviteSheetTitle;

  /// No description provided for @inviteJoinCode.
  ///
  /// In en, this message translates to:
  /// **'Join code'**
  String get inviteJoinCode;

  /// No description provided for @inviteCopyCode.
  ///
  /// In en, this message translates to:
  /// **'Copy code'**
  String get inviteCopyCode;

  /// No description provided for @inviteCopyLink.
  ///
  /// In en, this message translates to:
  /// **'Copy link'**
  String get inviteCopyLink;

  /// No description provided for @inviteShare.
  ///
  /// In en, this message translates to:
  /// **'Share invite'**
  String get inviteShare;

  /// No description provided for @inviteCodePending.
  ///
  /// In en, this message translates to:
  /// **'Your join code appears after this trip finishes syncing.'**
  String get inviteCodePending;

  /// No description provided for @inviteCopied.
  ///
  /// In en, this message translates to:
  /// **'Copied'**
  String get inviteCopied;

  /// No description provided for @inviteShareText.
  ///
  /// In en, this message translates to:
  /// **'Join my trip \"{trip}\" on Trip Tracker: {link} (code {code})'**
  String inviteShareText(String trip, String link, String code);

  /// No description provided for @viewOnlyTitle.
  ///
  /// In en, this message translates to:
  /// **'View-only link'**
  String get viewOnlyTitle;

  /// No description provided for @viewOnlyBody.
  ///
  /// In en, this message translates to:
  /// **'Anyone with this link can see a read-only summary. It expires after 30 days and you can turn it off any time.'**
  String get viewOnlyBody;

  /// No description provided for @viewOnlyCreate.
  ///
  /// In en, this message translates to:
  /// **'Create view-only link'**
  String get viewOnlyCreate;

  /// No description provided for @viewOnlyRevoke.
  ///
  /// In en, this message translates to:
  /// **'Turn off link'**
  String get viewOnlyRevoke;

  /// No description provided for @viewOnlyActiveUntil.
  ///
  /// In en, this message translates to:
  /// **'Active until {date}'**
  String viewOnlyActiveUntil(String date);

  /// No description provided for @viewOnlyOffline.
  ///
  /// In en, this message translates to:
  /// **'Connect to the internet to change the view-only link.'**
  String get viewOnlyOffline;

  /// No description provided for @viewOnlyOwnerOnly.
  ///
  /// In en, this message translates to:
  /// **'Only the trip owner or an admin can manage this link.'**
  String get viewOnlyOwnerOnly;

  /// No description provided for @viewOnlyShareText.
  ///
  /// In en, this message translates to:
  /// **'Trip summary for \"{trip}\": {link}'**
  String viewOnlyShareText(String trip, String link);

  /// No description provided for @expAdd.
  ///
  /// In en, this message translates to:
  /// **'Add expense'**
  String get expAdd;

  /// No description provided for @expSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search expenses'**
  String get expSearchHint;

  /// No description provided for @expFilters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get expFilters;

  /// No description provided for @expClearFilters.
  ///
  /// In en, this message translates to:
  /// **'Clear filters'**
  String get expClearFilters;

  /// No description provided for @expNone.
  ///
  /// In en, this message translates to:
  /// **'No expenses yet'**
  String get expNone;

  /// No description provided for @expNoneBody.
  ///
  /// In en, this message translates to:
  /// **'Add the first expense to start splitting costs.'**
  String get expNoneBody;

  /// No description provided for @expNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No expenses match these filters.'**
  String get expNoMatches;

  /// No description provided for @expLoadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more'**
  String get expLoadMore;

  /// No description provided for @expTotalSpent.
  ///
  /// In en, this message translates to:
  /// **'Total spent'**
  String get expTotalSpent;

  /// No description provided for @expPerPerson.
  ///
  /// In en, this message translates to:
  /// **'Per person'**
  String get expPerPerson;

  /// No description provided for @expTopCategory.
  ///
  /// In en, this message translates to:
  /// **'Top category'**
  String get expTopCategory;

  /// No description provided for @expSettlements.
  ///
  /// In en, this message translates to:
  /// **'Settlements'**
  String get expSettlements;

  /// No description provided for @expExpandAll.
  ///
  /// In en, this message translates to:
  /// **'Expand all days'**
  String get expExpandAll;

  /// No description provided for @expCollapseAll.
  ///
  /// In en, this message translates to:
  /// **'Collapse all days'**
  String get expCollapseAll;

  /// No description provided for @expRecycleBin.
  ///
  /// In en, this message translates to:
  /// **'Recycle bin'**
  String get expRecycleBin;

  /// No description provided for @expCompactView.
  ///
  /// In en, this message translates to:
  /// **'Compact rows'**
  String get expCompactView;

  /// No description provided for @expAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get expAll;

  /// No description provided for @expPaidByMe.
  ///
  /// In en, this message translates to:
  /// **'Paid by me'**
  String get expPaidByMe;

  /// No description provided for @expInvolvesMe.
  ///
  /// In en, this message translates to:
  /// **'Involves me'**
  String get expInvolvesMe;

  /// No description provided for @expDayTotal.
  ///
  /// In en, this message translates to:
  /// **'{amount}'**
  String expDayTotal(String amount);

  /// No description provided for @expDaySemantics.
  ///
  /// In en, this message translates to:
  /// **'{date}, {count, plural, =1{1 expense} other{{count} expenses}}, total {amount}'**
  String expDaySemantics(String date, int count, String amount);

  /// No description provided for @filterTraveler.
  ///
  /// In en, this message translates to:
  /// **'Traveler'**
  String get filterTraveler;

  /// No description provided for @filterCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get filterCategory;

  /// No description provided for @filterFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get filterFrom;

  /// No description provided for @filterTo.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get filterTo;

  /// No description provided for @filterMin.
  ///
  /// In en, this message translates to:
  /// **'Min amount'**
  String get filterMin;

  /// No description provided for @filterMax.
  ///
  /// In en, this message translates to:
  /// **'Max amount'**
  String get filterMax;

  /// No description provided for @filterApply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get filterApply;

  /// No description provided for @filterAny.
  ///
  /// In en, this message translates to:
  /// **'Any'**
  String get filterAny;

  /// No description provided for @filterShow.
  ///
  /// In en, this message translates to:
  /// **'Show'**
  String get filterShow;

  /// No description provided for @filterResults.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Show 1 expense} other{Show {count} expenses}}'**
  String filterResults(int count);

  /// No description provided for @rowYourShare.
  ///
  /// In en, this message translates to:
  /// **'your share {amount}'**
  String rowYourShare(String amount);

  /// No description provided for @rowPayers.
  ///
  /// In en, this message translates to:
  /// **'{count} payers'**
  String rowPayers(int count);

  /// No description provided for @rowPaidBy.
  ///
  /// In en, this message translates to:
  /// **'Paid by {name}'**
  String rowPaidBy(String name);

  /// No description provided for @rowRemovedMember.
  ///
  /// In en, this message translates to:
  /// **'Removed member'**
  String get rowRemovedMember;

  /// No description provided for @rowReceipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt attached'**
  String get rowReceipt;

  /// No description provided for @rowDisputed.
  ///
  /// In en, this message translates to:
  /// **'Disputed'**
  String get rowDisputed;

  /// No description provided for @rowPendingApproval.
  ///
  /// In en, this message translates to:
  /// **'Pending approval'**
  String get rowPendingApproval;

  /// No description provided for @rowPendingApprovalTip.
  ///
  /// In en, this message translates to:
  /// **'Pending approval — excluded from balances until a second member approves it'**
  String get rowPendingApprovalTip;

  /// No description provided for @rowSyncPending.
  ///
  /// In en, this message translates to:
  /// **'Pending sync'**
  String get rowSyncPending;

  /// No description provided for @rowConflict.
  ///
  /// In en, this message translates to:
  /// **'Sync conflict'**
  String get rowConflict;

  /// No description provided for @rowEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get rowEdit;

  /// No description provided for @rowDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get rowDelete;

  /// No description provided for @rowSwitchCurrency.
  ///
  /// In en, this message translates to:
  /// **'Switch between {base} and {foreign}'**
  String rowSwitchCurrency(String base, String foreign);

  /// No description provided for @expDeleted.
  ///
  /// In en, this message translates to:
  /// **'Expense deleted'**
  String get expDeleted;

  /// No description provided for @expRestored.
  ///
  /// In en, this message translates to:
  /// **'Expense restored'**
  String get expRestored;

  /// No description provided for @detailPaidBy.
  ///
  /// In en, this message translates to:
  /// **'Paid by'**
  String get detailPaidBy;

  /// No description provided for @detailSplit.
  ///
  /// In en, this message translates to:
  /// **'Split between'**
  String get detailSplit;

  /// No description provided for @detailDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get detailDate;

  /// No description provided for @detailCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get detailCategory;

  /// No description provided for @detailNote.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get detailNote;

  /// No description provided for @detailFlag.
  ///
  /// In en, this message translates to:
  /// **'Flag as disputed'**
  String get detailFlag;

  /// No description provided for @detailResolve.
  ///
  /// In en, this message translates to:
  /// **'Resolve dispute'**
  String get detailResolve;

  /// No description provided for @detailApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get detailApprove;

  /// No description provided for @detailConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm payment received'**
  String get detailConfirm;

  /// No description provided for @detailDisputeTitle.
  ///
  /// In en, this message translates to:
  /// **'Flag this expense'**
  String get detailDisputeTitle;

  /// No description provided for @detailDisputeHint.
  ///
  /// In en, this message translates to:
  /// **'What looks wrong? (optional)'**
  String get detailDisputeHint;

  /// No description provided for @detailDisputeSend.
  ///
  /// In en, this message translates to:
  /// **'Flag'**
  String get detailDisputeSend;

  /// No description provided for @detailDisputedBy.
  ///
  /// In en, this message translates to:
  /// **'Flagged: {note}'**
  String detailDisputedBy(String note);

  /// No description provided for @detailDisputedNoNote.
  ///
  /// In en, this message translates to:
  /// **'Flagged as disputed'**
  String get detailDisputedNoNote;

  /// No description provided for @detailConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Payment confirmed'**
  String get detailConfirmed;

  /// No description provided for @detailOfflineAction.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline. Connect to the internet to do this.'**
  String get detailOfflineAction;

  /// No description provided for @detailActionFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t complete that: {reason}'**
  String detailActionFailed(String reason);

  /// No description provided for @detailShares.
  ///
  /// In en, this message translates to:
  /// **'Who owes what'**
  String get detailShares;

  /// No description provided for @binTitle.
  ///
  /// In en, this message translates to:
  /// **'Recycle bin'**
  String get binTitle;

  /// No description provided for @binBody.
  ///
  /// In en, this message translates to:
  /// **'Deleted expenses stay here for 24 hours.'**
  String get binBody;

  /// No description provided for @binEmpty.
  ///
  /// In en, this message translates to:
  /// **'The recycle bin is empty'**
  String get binEmpty;

  /// No description provided for @binRestore.
  ///
  /// In en, this message translates to:
  /// **'Restore'**
  String get binRestore;

  /// No description provided for @binDeleteForever.
  ///
  /// In en, this message translates to:
  /// **'Delete forever'**
  String get binDeleteForever;

  /// No description provided for @binEmptyAll.
  ///
  /// In en, this message translates to:
  /// **'Empty recycle bin'**
  String get binEmptyAll;

  /// No description provided for @binEmptyConfirm.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Permanently delete 1 expense?} other{Permanently delete {count} expenses?}}'**
  String binEmptyConfirm(int count);

  /// No description provided for @binDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete \"{title}\" forever? This can\'t be undone.'**
  String binDeleteConfirm(String title);

  /// No description provided for @chipOwe.
  ///
  /// In en, this message translates to:
  /// **'You owe · settle up'**
  String get chipOwe;

  /// No description provided for @chipOwed.
  ///
  /// In en, this message translates to:
  /// **'You\'re owed · see who'**
  String get chipOwed;

  /// No description provided for @chipInvites.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 invite pending} other{{count} invites pending}}'**
  String chipInvites(int count);

  /// No description provided for @chipDisputes.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 dispute} other{{count} disputes}}'**
  String chipDisputes(int count);

  /// No description provided for @chipCloseout.
  ///
  /// In en, this message translates to:
  /// **'Close out trip'**
  String get chipCloseout;

  /// No description provided for @expFormComingSoon.
  ///
  /// In en, this message translates to:
  /// **'The expense form is the next piece of Phase 7.'**
  String get expFormComingSoon;

  /// No description provided for @formTitleAdd.
  ///
  /// In en, this message translates to:
  /// **'Add expense'**
  String get formTitleAdd;

  /// No description provided for @formTitleEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit expense'**
  String get formTitleEdit;

  /// No description provided for @formSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get formSave;

  /// No description provided for @formSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get formSaving;

  /// No description provided for @formAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get formAmount;

  /// No description provided for @formAmountHint.
  ///
  /// In en, this message translates to:
  /// **'0.00 or 12*3+4'**
  String get formAmountHint;

  /// No description provided for @formAmountEquals.
  ///
  /// In en, this message translates to:
  /// **'= {value}'**
  String formAmountEquals(String value);

  /// No description provided for @formWhat.
  ///
  /// In en, this message translates to:
  /// **'What was it for?'**
  String get formWhat;

  /// No description provided for @formWhatHint.
  ///
  /// In en, this message translates to:
  /// **'Dinner, taxi…'**
  String get formWhatHint;

  /// No description provided for @formCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get formCategory;

  /// No description provided for @formAutoCategory.
  ///
  /// In en, this message translates to:
  /// **'Auto-picked: {name}'**
  String formAutoCategory(String name);

  /// No description provided for @formDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get formDate;

  /// No description provided for @formToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get formToday;

  /// No description provided for @formPaidBy.
  ///
  /// In en, this message translates to:
  /// **'Paid by'**
  String get formPaidBy;

  /// No description provided for @formMultiplePayers.
  ///
  /// In en, this message translates to:
  /// **'Multiple payers'**
  String get formMultiplePayers;

  /// No description provided for @formOnePayer.
  ///
  /// In en, this message translates to:
  /// **'One payer'**
  String get formOnePayer;

  /// No description provided for @formAllocated.
  ///
  /// In en, this message translates to:
  /// **'Allocated {paid} of {total}'**
  String formAllocated(String paid, String total);

  /// No description provided for @formSplitBetween.
  ///
  /// In en, this message translates to:
  /// **'Split between'**
  String get formSplitBetween;

  /// No description provided for @formEveryone.
  ///
  /// In en, this message translates to:
  /// **'Everyone'**
  String get formEveryone;

  /// No description provided for @formOnlyPayer.
  ///
  /// In en, this message translates to:
  /// **'Only payer'**
  String get formOnlyPayer;

  /// No description provided for @formExcludePayer.
  ///
  /// In en, this message translates to:
  /// **'Everyone but payer'**
  String get formExcludePayer;

  /// No description provided for @formPayerHalf.
  ///
  /// In en, this message translates to:
  /// **'Payer 50%'**
  String get formPayerHalf;

  /// No description provided for @formModeEqual.
  ///
  /// In en, this message translates to:
  /// **'Equal'**
  String get formModeEqual;

  /// No description provided for @formModeShares.
  ///
  /// In en, this message translates to:
  /// **'Shares'**
  String get formModeShares;

  /// No description provided for @formModeExact.
  ///
  /// In en, this message translates to:
  /// **'Exact'**
  String get formModeExact;

  /// No description provided for @formModePercent.
  ///
  /// In en, this message translates to:
  /// **'Percent'**
  String get formModePercent;

  /// No description provided for @formModeItemized.
  ///
  /// In en, this message translates to:
  /// **'Itemized'**
  String get formModeItemized;

  /// No description provided for @formShareHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. 2'**
  String get formShareHint;

  /// No description provided for @formPercentHint.
  ///
  /// In en, this message translates to:
  /// **'%'**
  String get formPercentHint;

  /// No description provided for @formExactHint.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get formExactHint;

  /// No description provided for @formSumStatus.
  ///
  /// In en, this message translates to:
  /// **'{sum} of {target}'**
  String formSumStatus(String sum, String target);

  /// No description provided for @formSharesWeights.
  ///
  /// In en, this message translates to:
  /// **'Relative shares: 2 pays double 1'**
  String get formSharesWeights;

  /// No description provided for @formWhoOwes.
  ///
  /// In en, this message translates to:
  /// **'Who owes what'**
  String get formWhoOwes;

  /// No description provided for @formExplain.
  ///
  /// In en, this message translates to:
  /// **'Explain'**
  String get formExplain;

  /// No description provided for @formExplainTitle.
  ///
  /// In en, this message translates to:
  /// **'How each share is worked out'**
  String get formExplainTitle;

  /// No description provided for @formExplainRounding.
  ///
  /// In en, this message translates to:
  /// **'Cents that don\'t divide evenly go to whoever has the largest remainder; ties go to the payer first.'**
  String get formExplainRounding;

  /// No description provided for @formReceipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get formReceipt;

  /// No description provided for @formReceiptCamera.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get formReceiptCamera;

  /// No description provided for @formReceiptGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose photo'**
  String get formReceiptGallery;

  /// No description provided for @formReceiptRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove photo'**
  String get formReceiptRemove;

  /// No description provided for @formReceiptAttached.
  ///
  /// In en, this message translates to:
  /// **'Photo attached'**
  String get formReceiptAttached;

  /// No description provided for @formMoreDetails.
  ///
  /// In en, this message translates to:
  /// **'More details'**
  String get formMoreDetails;

  /// No description provided for @formDraftRestored.
  ///
  /// In en, this message translates to:
  /// **'Restored your unsent draft'**
  String get formDraftRestored;

  /// No description provided for @formDiscardDraft.
  ///
  /// In en, this message translates to:
  /// **'Discard draft'**
  String get formDiscardDraft;

  /// No description provided for @formSameAsLast.
  ///
  /// In en, this message translates to:
  /// **'Same as last time'**
  String get formSameAsLast;

  /// No description provided for @formQuickFill.
  ///
  /// In en, this message translates to:
  /// **'Quick fill'**
  String get formQuickFill;

  /// No description provided for @formQuickFillHint.
  ///
  /// In en, this message translates to:
  /// **'Coffee 4.50 Alice yesterday'**
  String get formQuickFillHint;

  /// No description provided for @formQuickFillApply.
  ///
  /// In en, this message translates to:
  /// **'Fill'**
  String get formQuickFillApply;

  /// No description provided for @formQuickFillFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t understand that.'**
  String get formQuickFillFailed;

  /// No description provided for @formDuplicateTitle.
  ///
  /// In en, this message translates to:
  /// **'Possible duplicate'**
  String get formDuplicateTitle;

  /// No description provided for @formDuplicateDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get formDuplicateDetails;

  /// No description provided for @formDuplicateIgnore.
  ///
  /// In en, this message translates to:
  /// **'Not a duplicate'**
  String get formDuplicateIgnore;

  /// No description provided for @formCurrency.
  ///
  /// In en, this message translates to:
  /// **'Currency'**
  String get formCurrency;

  /// No description provided for @formConverted.
  ///
  /// In en, this message translates to:
  /// **'≈ {amount} at {rate}'**
  String formConverted(String amount, String rate);

  /// No description provided for @formFxSet.
  ///
  /// In en, this message translates to:
  /// **'Set rate'**
  String get formFxSet;

  /// No description provided for @formFxTitle.
  ///
  /// In en, this message translates to:
  /// **'{code} → {base} rate'**
  String formFxTitle(String code, String base);

  /// No description provided for @formFxLabel.
  ///
  /// In en, this message translates to:
  /// **'Your rate (1 {code} = ? {base})'**
  String formFxLabel(String code, String base);

  /// No description provided for @formFxDefault.
  ///
  /// In en, this message translates to:
  /// **'Use default rate'**
  String get formFxDefault;

  /// No description provided for @formFxCurrent.
  ///
  /// In en, this message translates to:
  /// **'Current rate: {rate}'**
  String formFxCurrent(String rate);

  /// No description provided for @formAddItem.
  ///
  /// In en, this message translates to:
  /// **'Add item'**
  String get formAddItem;

  /// No description provided for @formItemName.
  ///
  /// In en, this message translates to:
  /// **'Item'**
  String get formItemName;

  /// No description provided for @formItemAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get formItemAmount;

  /// No description provided for @formItemSharedBy.
  ///
  /// In en, this message translates to:
  /// **'Shared by'**
  String get formItemSharedBy;

  /// No description provided for @formTax.
  ///
  /// In en, this message translates to:
  /// **'Tax'**
  String get formTax;

  /// No description provided for @formTip.
  ///
  /// In en, this message translates to:
  /// **'Tip'**
  String get formTip;

  /// No description provided for @formDiscount.
  ///
  /// In en, this message translates to:
  /// **'Discount'**
  String get formDiscount;

  /// No description provided for @formUseTotal.
  ///
  /// In en, this message translates to:
  /// **'Use {total} as the amount'**
  String formUseTotal(String total);

  /// No description provided for @formNoMembers.
  ///
  /// In en, this message translates to:
  /// **'This trip has no active travelers to split with.'**
  String get formNoMembers;

  /// No description provided for @ledBalances.
  ///
  /// In en, this message translates to:
  /// **'Balances'**
  String get ledBalances;

  /// No description provided for @ledAllSettled.
  ///
  /// In en, this message translates to:
  /// **'All settled up'**
  String get ledAllSettled;

  /// No description provided for @ledAllSettledHint.
  ///
  /// In en, this message translates to:
  /// **'Nobody owes anything.'**
  String get ledAllSettledHint;

  /// No description provided for @ledOwed.
  ///
  /// In en, this message translates to:
  /// **'is owed {amount}'**
  String ledOwed(String amount);

  /// No description provided for @ledOwes.
  ///
  /// In en, this message translates to:
  /// **'owes {amount}'**
  String ledOwes(String amount);

  /// No description provided for @ledEven.
  ///
  /// In en, this message translates to:
  /// **'settled'**
  String get ledEven;

  /// No description provided for @ledWhoPays.
  ///
  /// In en, this message translates to:
  /// **'Who pays whom'**
  String get ledWhoPays;

  /// No description provided for @ledSettle.
  ///
  /// In en, this message translates to:
  /// **'Settle'**
  String get ledSettle;

  /// No description provided for @ledSimplify.
  ///
  /// In en, this message translates to:
  /// **'Simplify debts'**
  String get ledSimplify;

  /// No description provided for @ledSimplifyHint.
  ///
  /// In en, this message translates to:
  /// **'Fewer, larger payments instead of one per expense.'**
  String get ledSimplifyHint;

  /// No description provided for @ledSettleTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm settlement'**
  String get ledSettleTitle;

  /// No description provided for @ledSettlePartialTitle.
  ///
  /// In en, this message translates to:
  /// **'Confirm partial settlement'**
  String get ledSettlePartialTitle;

  /// No description provided for @ledSettleBody.
  ///
  /// In en, this message translates to:
  /// **'Record this payment as settled?'**
  String get ledSettleBody;

  /// No description provided for @ledSettlePartialBody.
  ///
  /// In en, this message translates to:
  /// **'Record part of this payment? The rest stays pending.'**
  String get ledSettlePartialBody;

  /// No description provided for @ledAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get ledAmount;

  /// No description provided for @ledDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get ledDate;

  /// No description provided for @ledNote.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get ledNote;

  /// No description provided for @ledMarkSettled.
  ///
  /// In en, this message translates to:
  /// **'Mark settled'**
  String get ledMarkSettled;

  /// No description provided for @ledMarkPartial.
  ///
  /// In en, this message translates to:
  /// **'Mark partial settlement'**
  String get ledMarkPartial;

  /// No description provided for @ledRemaining.
  ///
  /// In en, this message translates to:
  /// **'Remaining {amount}'**
  String ledRemaining(String amount);

  /// No description provided for @ledAmountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount greater than 0.'**
  String get ledAmountInvalid;

  /// No description provided for @ledHistory.
  ///
  /// In en, this message translates to:
  /// **'Settlement history'**
  String get ledHistory;

  /// No description provided for @ledNoHistory.
  ///
  /// In en, this message translates to:
  /// **'No payments recorded yet.'**
  String get ledNoHistory;

  /// No description provided for @ledConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get ledConfirmed;

  /// No description provided for @ledAwaiting.
  ///
  /// In en, this message translates to:
  /// **'Awaiting confirmation'**
  String get ledAwaiting;

  /// No description provided for @ledSettledToast.
  ///
  /// In en, this message translates to:
  /// **'Settlement recorded'**
  String get ledSettledToast;

  /// No description provided for @ledTransfer.
  ///
  /// In en, this message translates to:
  /// **'{from} pays {to}'**
  String ledTransfer(String from, String to);

  /// No description provided for @ledYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get ledYou;

  /// No description provided for @ledAcrossTrips.
  ///
  /// In en, this message translates to:
  /// **'Across your trips'**
  String get ledAcrossTrips;

  /// No description provided for @ledAcrossLine.
  ///
  /// In en, this message translates to:
  /// **'{currency}: {amount}'**
  String ledAcrossLine(String currency, String amount);

  /// No description provided for @detailReceipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get detailReceipt;

  /// No description provided for @conflictTitle.
  ///
  /// In en, this message translates to:
  /// **'Sync conflict'**
  String get conflictTitle;

  /// No description provided for @conflictBody.
  ///
  /// In en, this message translates to:
  /// **'This expense changed on another device while you still had a local edit.'**
  String get conflictBody;

  /// No description provided for @conflictKeepMine.
  ///
  /// In en, this message translates to:
  /// **'Keep mine'**
  String get conflictKeepMine;

  /// No description provided for @conflictKeepTheirs.
  ///
  /// In en, this message translates to:
  /// **'Keep theirs'**
  String get conflictKeepTheirs;

  /// No description provided for @conflictLocal.
  ///
  /// In en, this message translates to:
  /// **'On this phone'**
  String get conflictLocal;

  /// No description provided for @conflictServer.
  ///
  /// In en, this message translates to:
  /// **'On the server'**
  String get conflictServer;

  /// No description provided for @conflictEmpty.
  ///
  /// In en, this message translates to:
  /// **'No conflicts to resolve.'**
  String get conflictEmpty;

  /// No description provided for @upiPay.
  ///
  /// In en, this message translates to:
  /// **'Pay with UPI'**
  String get upiPay;

  /// No description provided for @upiHint.
  ///
  /// In en, this message translates to:
  /// **'Payee UPI id'**
  String get upiHint;

  /// No description provided for @upiInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a UPI id like name@bank.'**
  String get upiInvalid;

  /// No description provided for @upiCopied.
  ///
  /// In en, this message translates to:
  /// **'UPI id copied'**
  String get upiCopied;

  /// No description provided for @upiUnavailable.
  ///
  /// In en, this message translates to:
  /// **'No UPI app opened. The id is copied.'**
  String get upiUnavailable;

  /// No description provided for @shareCard.
  ///
  /// In en, this message translates to:
  /// **'Share card'**
  String get shareCard;

  /// No description provided for @closeoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Close out {name}'**
  String closeoutTitle(String name);

  /// No description provided for @closeoutSettled.
  ///
  /// In en, this message translates to:
  /// **'Everyone is settled. Lock the trip so nobody adds more expenses.'**
  String get closeoutSettled;

  /// No description provided for @closeoutOutstanding.
  ///
  /// In en, this message translates to:
  /// **'{amount} still outstanding across {count} transfers.'**
  String closeoutOutstanding(String amount, int count);

  /// No description provided for @closeoutReview.
  ///
  /// In en, this message translates to:
  /// **'Review and settle'**
  String get closeoutReview;

  /// No description provided for @closeoutLock.
  ///
  /// In en, this message translates to:
  /// **'Lock trip'**
  String get closeoutLock;

  /// No description provided for @closeoutLockAnyway.
  ///
  /// In en, this message translates to:
  /// **'Lock anyway'**
  String get closeoutLockAnyway;

  /// No description provided for @closeoutNotNow.
  ///
  /// In en, this message translates to:
  /// **'Not now'**
  String get closeoutNotNow;

  /// No description provided for @closeoutLocked.
  ///
  /// In en, this message translates to:
  /// **'Trip locked'**
  String get closeoutLocked;

  /// No description provided for @closeoutPulse.
  ///
  /// In en, this message translates to:
  /// **'Would you use Trip Tracker for the next trip with this group?'**
  String get closeoutPulse;

  /// No description provided for @closeoutYes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get closeoutYes;

  /// No description provided for @closeoutNo.
  ///
  /// In en, this message translates to:
  /// **'Not this group'**
  String get closeoutNo;

  /// No description provided for @catTitle.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get catTitle;

  /// No description provided for @catAdd.
  ///
  /// In en, this message translates to:
  /// **'Add category'**
  String get catAdd;

  /// No description provided for @catName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get catName;

  /// No description provided for @expCategories.
  ///
  /// In en, this message translates to:
  /// **'Categories'**
  String get expCategories;

  /// No description provided for @expTools.
  ///
  /// In en, this message translates to:
  /// **'Export and import'**
  String get expTools;

  /// No description provided for @expOtherTrips.
  ///
  /// In en, this message translates to:
  /// **'Other trips'**
  String get expOtherTrips;

  /// No description provided for @toolsTitle.
  ///
  /// In en, this message translates to:
  /// **'Export and import'**
  String get toolsTitle;

  /// No description provided for @toolsExportCsv.
  ///
  /// In en, this message translates to:
  /// **'Export CSV'**
  String get toolsExportCsv;

  /// No description provided for @toolsExportJson.
  ///
  /// In en, this message translates to:
  /// **'Export backup'**
  String get toolsExportJson;

  /// No description provided for @toolsImportJson.
  ///
  /// In en, this message translates to:
  /// **'Import backup'**
  String get toolsImportJson;

  /// No description provided for @toolsSplitwise.
  ///
  /// In en, this message translates to:
  /// **'Import Splitwise CSV'**
  String get toolsSplitwise;

  /// No description provided for @toolsQuickAdd.
  ///
  /// In en, this message translates to:
  /// **'Quick add'**
  String get toolsQuickAdd;

  /// No description provided for @quickAddHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. lunch 240'**
  String get quickAddHint;

  /// No description provided for @quickAddEmpty.
  ///
  /// In en, this message translates to:
  /// **'Type an amount to add.'**
  String get quickAddEmpty;

  /// No description provided for @quickAddConfirm.
  ///
  /// In en, this message translates to:
  /// **'Add expense'**
  String get quickAddConfirm;

  /// No description provided for @quickAddFallback.
  ///
  /// In en, this message translates to:
  /// **'Expense'**
  String get quickAddFallback;

  /// No description provided for @importDone.
  ///
  /// In en, this message translates to:
  /// **'Imported {count} expenses'**
  String importDone(int count);

  /// No description provided for @importNone.
  ///
  /// In en, this message translates to:
  /// **'Nothing to import.'**
  String get importNone;

  /// No description provided for @memAdd.
  ///
  /// In en, this message translates to:
  /// **'Add person'**
  String get memAdd;

  /// No description provided for @memName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get memName;

  /// No description provided for @memInvite.
  ///
  /// In en, this message translates to:
  /// **'Invite'**
  String get memInvite;

  /// No description provided for @memArchived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get memArchived;

  /// No description provided for @memGroups.
  ///
  /// In en, this message translates to:
  /// **'Groups'**
  String get memGroups;

  /// No description provided for @memAddGroup.
  ///
  /// In en, this message translates to:
  /// **'Add group'**
  String get memAddGroup;

  /// No description provided for @memRoleOrganizer.
  ///
  /// In en, this message translates to:
  /// **'Organizer'**
  String get memRoleOrganizer;

  /// No description provided for @memRoleContributor.
  ///
  /// In en, this message translates to:
  /// **'Contributor'**
  String get memRoleContributor;

  /// No description provided for @memRoleViewer.
  ///
  /// In en, this message translates to:
  /// **'Viewer'**
  String get memRoleViewer;

  /// No description provided for @memGmail.
  ///
  /// In en, this message translates to:
  /// **'Gmail ID'**
  String get memGmail;

  /// No description provided for @memGmailHint.
  ///
  /// In en, this message translates to:
  /// **'friend@gmail.com'**
  String get memGmailHint;

  /// No description provided for @memGmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Gmail ID is required'**
  String get memGmailRequired;

  /// No description provided for @memGmailRestricted.
  ///
  /// In en, this message translates to:
  /// **'Only @gmail.com addresses are supported right now'**
  String get memGmailRestricted;

  /// No description provided for @memGmailLinked.
  ///
  /// In en, this message translates to:
  /// **'Linked with Google'**
  String get memGmailLinked;

  /// No description provided for @memGmailPending.
  ///
  /// In en, this message translates to:
  /// **'Pending sign-in'**
  String get memGmailPending;

  /// No description provided for @notesCheck.
  ///
  /// In en, this message translates to:
  /// **'Checklist'**
  String get notesCheck;

  /// No description provided for @notesNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notesNotes;

  /// No description provided for @notesChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get notesChat;

  /// No description provided for @notesAddItem.
  ///
  /// In en, this message translates to:
  /// **'Add item'**
  String get notesAddItem;

  /// No description provided for @notesAddNote.
  ///
  /// In en, this message translates to:
  /// **'Add note'**
  String get notesAddNote;

  /// No description provided for @notesNoteTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get notesNoteTitle;

  /// No description provided for @notesEmptyNotes.
  ///
  /// In en, this message translates to:
  /// **'No notes yet.'**
  String get notesEmptyNotes;

  /// No description provided for @notesPacking.
  ///
  /// In en, this message translates to:
  /// **'Suggest packing'**
  String get notesPacking;

  /// No description provided for @notesPasses.
  ///
  /// In en, this message translates to:
  /// **'Passes'**
  String get notesPasses;

  /// No description provided for @notesAddPass.
  ///
  /// In en, this message translates to:
  /// **'Add pass'**
  String get notesAddPass;

  /// No description provided for @ledGroupBalances.
  ///
  /// In en, this message translates to:
  /// **'Group balances'**
  String get ledGroupBalances;

  /// No description provided for @ledBetweenGroups.
  ///
  /// In en, this message translates to:
  /// **'Between groups'**
  String get ledBetweenGroups;

  /// No description provided for @ledEveryone.
  ///
  /// In en, this message translates to:
  /// **'Everyone\'s balance'**
  String get ledEveryone;

  /// No description provided for @notesItemEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit item'**
  String get notesItemEdit;

  /// No description provided for @notesItemHint.
  ///
  /// In en, this message translates to:
  /// **'What needs doing?'**
  String get notesItemHint;

  /// No description provided for @notesItemCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get notesItemCategory;

  /// No description provided for @notesItemAssign.
  ///
  /// In en, this message translates to:
  /// **'Assign to'**
  String get notesItemAssign;

  /// No description provided for @notesItemAnyone.
  ///
  /// In en, this message translates to:
  /// **'Anyone'**
  String get notesItemAnyone;

  /// No description provided for @notesItemSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get notesItemSave;

  /// No description provided for @notesItemDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get notesItemDelete;

  /// No description provided for @notesItemDeleted.
  ///
  /// In en, this message translates to:
  /// **'Item deleted'**
  String get notesItemDeleted;

  /// No description provided for @notesItemMore.
  ///
  /// In en, this message translates to:
  /// **'More actions'**
  String get notesItemMore;

  /// No description provided for @notesItemMoveUp.
  ///
  /// In en, this message translates to:
  /// **'Move up'**
  String get notesItemMoveUp;

  /// No description provided for @notesItemMoveDown.
  ///
  /// In en, this message translates to:
  /// **'Move down'**
  String get notesItemMoveDown;

  /// No description provided for @notesEmptyChecklist.
  ///
  /// In en, this message translates to:
  /// **'Nothing on the list yet. Add the first item above.'**
  String get notesEmptyChecklist;

  /// No description provided for @notesNoItemsInCategory.
  ///
  /// In en, this message translates to:
  /// **'No items in this category.'**
  String get notesNoItemsInCategory;

  /// No description provided for @notesSortTime.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get notesSortTime;

  /// No description provided for @notesSortLeg.
  ///
  /// In en, this message translates to:
  /// **'Leg'**
  String get notesSortLeg;

  /// No description provided for @notesSortName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get notesSortName;

  /// No description provided for @notesPassTitle.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get notesPassTitle;

  /// No description provided for @notesPassFlight.
  ///
  /// In en, this message translates to:
  /// **'Flight'**
  String get notesPassFlight;

  /// No description provided for @notesPassTrain.
  ///
  /// In en, this message translates to:
  /// **'Train'**
  String get notesPassTrain;

  /// No description provided for @notesPassHotel.
  ///
  /// In en, this message translates to:
  /// **'Hotel'**
  String get notesPassHotel;

  /// No description provided for @notesPassFrom.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get notesPassFrom;

  /// No description provided for @notesPassTo.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get notesPassTo;

  /// No description provided for @notesProgress.
  ///
  /// In en, this message translates to:
  /// **'{done} of {total}'**
  String notesProgress(int done, int total);

  /// No description provided for @chatHint.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get chatHint;

  /// No description provided for @chatEmpty.
  ///
  /// In en, this message translates to:
  /// **'No messages yet.'**
  String get chatEmpty;

  /// No description provided for @chatPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get chatPending;

  /// No description provided for @chatDeleted.
  ///
  /// In en, this message translates to:
  /// **'Message deleted'**
  String get chatDeleted;

  /// No description provided for @chatEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit message'**
  String get chatEdit;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
