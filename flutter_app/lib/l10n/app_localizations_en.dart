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
  String get statusOfflineSubtitle => 'Changes will be queued and synced when reconnected';

  @override
  String get statusConnected => 'Connected';

  @override
  String get errorGenericTitle => 'Something went wrong';

  @override
  String get errorGenericMessage => 'An unexpected error occurred. Please try again.';

  @override
  String get errorBoundaryTitle => 'Application Error';

  @override
  String get errorBoundarySubtitle => 'We encountered an unexpected problem. You can retry or return home.';

  @override
  String get emptyTripsTitle => 'No trips yet';

  @override
  String get emptyTripsSubtitle => 'Start by creating a trip or joining an existing one with an invite code.';

  @override
  String get authWelcome => 'Welcome to Trip Tracker';

  @override
  String get authSubtitle => 'Plan trips, split expenses, and travel seamlessly together.';

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
  String get smokeTestStatusSuccess => 'Successfully connected and verified row read.';

  @override
  String get smokeTestStatusError => 'Smoke test failed: ';

  @override
  String get authContinueGoogle => 'Continue with Google';

  @override
  String get authContinueApple => 'Continue with Apple';

  @override
  String get authSignInsPaused => 'New sign-ins are temporarily paused. Please check back shortly.';

  @override
  String get authEmail => 'Email';

  @override
  String get authEmailHint => 'you@example.com';

  @override
  String get authPassword => 'Password';

  @override
  String get authForgotPassword => 'Forgot Password?';

  @override
  String get authSignUp => 'Create Account';

  @override
  String get authToggleToSignUp => 'New here? Create an account';

  @override
  String get authToggleToSignIn => 'Already have an account? Sign in';

  @override
  String get authOr => 'or';

  @override
  String get authGuest => 'Continue as guest';

  @override
  String get authDemo => 'Try the demo';

  @override
  String get authErrorInvalid => 'Invalid email or password.';

  @override
  String get authSuperadminLogin => 'Superadmin login';

  @override
  String get authSuperadminHint => 'Admins only. Everyone else continues with Google.';

  @override
  String get authErrorNotSuperadmin => 'This account is not a superadmin. Please continue with Google.';

  @override
  String get authErrorBanned => 'This account has been suspended.';

  @override
  String get authErrorNetwork => 'Can\'t reach the server. Check your connection and try again.';

  @override
  String get authErrorGeneric => 'Sign-in failed. Please try again.';

  @override
  String get authErrorEmailRequired => 'Enter your email and password.';

  @override
  String get authLegal => 'By continuing you agree to our Terms of Service and Privacy Policy.';

  @override
  String get resetRequestSubtitle => 'Enter your account email and we\'ll send you a reset link.';

  @override
  String get resetSendLink => 'Send Reset Link';

  @override
  String get resetCheckEmail => 'Check your email';

  @override
  String resetSentTo(String email) {
    return 'We sent a reset link to $email';
  }

  @override
  String get resetNewPasswordTitle => 'Choose a new password';

  @override
  String get resetNewPassword => 'New password';

  @override
  String get resetSavePassword => 'Save Password';

  @override
  String get resetPasswordTooShort => 'Use at least 8 characters.';

  @override
  String get resetPasswordUpdated => 'Password updated.';

  @override
  String get lockTitle => 'Trip Tracker is Locked';

  @override
  String get lockSubtitle => 'Authenticate with Face ID, Touch ID or your device passcode to continue.';

  @override
  String get lockUnlock => 'Unlock';

  @override
  String get lockFailed => 'Biometric verification failed. Tap to try again.';

  @override
  String get lockReason => 'Unlock Trip Tracker';

  @override
  String get onboardingWelcomeTitle => 'Welcome to Trip Tracker';

  @override
  String get onboardingWelcomeBody => 'Plan trips, track shared expenses, and settle up — all offline-first.';

  @override
  String get onboardingTripTitle => 'Create Your First Trip';

  @override
  String get onboardingTripBody => 'Add a destination, dates, and members. Everyone can log expenses in real time.';

  @override
  String get onboardingExpenseTitle => 'Log & Split Expenses';

  @override
  String get onboardingExpenseBody =>
      'Snap receipts, auto-suggest categories, and split bills equally or by exact amounts.';

  @override
  String get onboardingNext => 'Next';

  @override
  String get onboardingSkip => 'Skip';

  @override
  String get onboardingGetStarted => 'Get started';

  @override
  String get authTripCodeHint => 'Enter 6-digit trip code';

  @override
  String get tripsTitle => 'My Trips';

  @override
  String get tripsSearchHint => 'Search trips';

  @override
  String get tripsSortDate => 'Newest first';

  @override
  String get tripsSortName => 'Name (A–Z)';

  @override
  String get tripsNewTrip => 'New Trip';

  @override
  String get tripsJoinWithCode => 'Join with Code';

  @override
  String tripsArchivedSection(int count) {
    return 'Archived ($count)';
  }

  @override
  String get tripsNoMatches => 'No trips match your search.';

  @override
  String get tripsLoadError => 'Couldn\'t load your trips.';

  @override
  String tripStartsIn(int days) {
    return 'Starts in $days days';
  }

  @override
  String get tripStartsTomorrow => 'Starts tomorrow';

  @override
  String tripDayOf(int day, int total) {
    return 'Day $day of $total';
  }

  @override
  String get tripEnded => 'Ended';

  @override
  String get tripBadgeArchived => 'Archived';

  @override
  String get tripBadgeClosed => 'Closed';

  @override
  String get tripBadgeFrozen => 'Frozen';

  @override
  String tripTravelers(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count travelers', one: '1 traveler');
    return '$_temp0';
  }

  @override
  String tripExpenseCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count expenses',
      one: '1 expense',
      zero: 'No expenses',
    );
    return '$_temp0';
  }

  @override
  String get tripArchive => 'Archive';

  @override
  String get tripUnarchive => 'Unarchive';

  @override
  String get tripArchived => 'Trip archived';

  @override
  String get tripUnarchived => 'Trip restored';

  @override
  String get tripDelete => 'Delete trip';

  @override
  String get tripDeleteTitle => 'Delete this trip?';

  @override
  String tripDeleteBody(String name) {
    return 'This permanently deletes $name for everyone, including all expenses and chat.';
  }

  @override
  String get tripDeleted => 'Trip deleted';

  @override
  String syncPending(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count changes waiting to sync',
      one: '1 change waiting to sync',
    );
    return '$_temp0';
  }

  @override
  String get syncIssue => 'Sync issue: tap to review';

  @override
  String get syncSheetTitle => 'Sync queue';

  @override
  String get syncRetry => 'Retry';

  @override
  String get syncDiscard => 'Discard';

  @override
  String get createTripTitle => 'Create Trip';

  @override
  String get fieldTripName => 'Trip name';

  @override
  String get fieldTripNameHint => 'Goa weekend';

  @override
  String get fieldDestination => 'Destination';

  @override
  String get fieldDates => 'Dates';

  @override
  String get fieldCurrency => 'Currency';

  @override
  String get createTripNameRequired => 'Give your trip a name.';

  @override
  String get createTripDatesRequired => 'Pick the trip dates.';

  @override
  String get createTripCreating => 'Creating…';

  @override
  String get backAgainToExit => 'Press back again to exit';

  @override
  String get tripSettingsComingSoon => 'Trip settings arrive in a later update.';

  @override
  String joinInvitedTitle(String trip) {
    return 'You\'re invited to \"$trip\"';
  }

  @override
  String joinAlreadyOnTrip(String names) {
    return '$names is already on this trip.';
  }

  @override
  String joinAlreadyOnTripPlural(String names) {
    return '$names are already on this trip.';
  }

  @override
  String get joinSignInPrompt => 'Sign in to join this trip.';

  @override
  String get joinGuestsCantJoin => 'Guest mode can\'t join shared trips. Sign in with an account to continue.';

  @override
  String get joinMoreSignIn => 'More sign-in options';

  @override
  String joinPickTitle(String trip) {
    return 'Join \"$trip\"';
  }

  @override
  String get joinPickSubtitle => 'Which traveler are you?';

  @override
  String joinImMember(String name) {
    return 'I\'m $name';
  }

  @override
  String get joinClaimedByOther => 'That member was just claimed by someone else. Pick another.';

  @override
  String joinAlreadyInTitle(String trip) {
    return 'You\'re already in \"$trip\"';
  }

  @override
  String get joinYoureAdmin => 'You\'re the admin of this trip.';

  @override
  String get joinAlreadyClaimed => 'You\'ve already claimed your spot on this trip.';

  @override
  String get joinOpenTrip => 'Open trip';

  @override
  String get joinEveryoneTitle => 'Everyone\'s already joined';

  @override
  String joinEveryoneBody(String trip) {
    return 'All members of \"$trip\" have already claimed their spot. Ask the trip admin if you think this is a mistake.';
  }

  @override
  String get joinInvalidTitle => 'Invite not found';

  @override
  String get joinInvalidBody =>
      'This invite code doesn\'t match any trip. Double-check the link, or ask the trip admin to resend it.';

  @override
  String get joinGoToTrips => 'Go to my trips';

  @override
  String get joinBackToSignIn => 'Back to sign in';

  @override
  String get joinErrorTitle => 'Couldn\'t load this invite';

  @override
  String joinTooManyAttempts(String time) {
    return 'Too many attempts. Try again in $time.';
  }

  @override
  String get joinEnterCodeTitle => 'Join with a trip code';

  @override
  String get joinEnterCodeAction => 'Join';

  @override
  String get joinCodeInvalid => 'Enter the 6-character code from your invite.';

  @override
  String get shareEyebrow => 'Trip Tracker · Trip summary';

  @override
  String get shareTravelers => 'Travelers';

  @override
  String get shareExpenses => 'Expenses';

  @override
  String get shareTotalSpend => 'Total spend';

  @override
  String get shareEndedTitle => 'This link has ended';

  @override
  String get shareEndedBody => 'It was turned off or has expired. Ask the trip organizer for a fresh link.';

  @override
  String get shareLoadError => 'Couldn\'t load this trip summary.';

  @override
  String get inviteSheetTitle => 'Invite travelers';

  @override
  String get inviteJoinCode => 'Join code';

  @override
  String get inviteCopyCode => 'Copy code';

  @override
  String get inviteCopyLink => 'Copy link';

  @override
  String get inviteShare => 'Share invite';

  @override
  String get inviteCodePending => 'Your join code appears after this trip finishes syncing.';

  @override
  String get inviteCopied => 'Copied';

  @override
  String inviteShareText(String trip, String link, String code) {
    return 'Join my trip \"$trip\" on Trip Tracker: $link (code $code)';
  }

  @override
  String get viewOnlyTitle => 'View-only link';

  @override
  String get viewOnlyBody =>
      'Anyone with this link can see a read-only summary. It expires after 30 days and you can turn it off any time.';

  @override
  String get viewOnlyCreate => 'Create view-only link';

  @override
  String get viewOnlyRevoke => 'Turn off link';

  @override
  String viewOnlyActiveUntil(String date) {
    return 'Active until $date';
  }

  @override
  String get viewOnlyOffline => 'Connect to the internet to change the view-only link.';

  @override
  String get viewOnlyOwnerOnly => 'Only the trip owner or an admin can manage this link.';

  @override
  String viewOnlyShareText(String trip, String link) {
    return 'Trip summary for \"$trip\": $link';
  }

  @override
  String get expAdd => 'Add expense';

  @override
  String get expSearchHint => 'Search expenses';

  @override
  String get expFilters => 'Filters';

  @override
  String get expClearFilters => 'Clear filters';

  @override
  String get expNone => 'No expenses yet';

  @override
  String get expNoneBody => 'Add the first expense to start splitting costs.';

  @override
  String get expNoMatches => 'No expenses match these filters.';

  @override
  String get expLoadMore => 'Load more';

  @override
  String get expTotalSpent => 'Total spent';

  @override
  String get expPerPerson => 'Per person';

  @override
  String get expTopCategory => 'Top category';

  @override
  String get expSettlements => 'Settlements';

  @override
  String get expExpandAll => 'Expand all days';

  @override
  String get expCollapseAll => 'Collapse all days';

  @override
  String get expRecycleBin => 'Recycle bin';

  @override
  String get expCompactView => 'Compact rows';

  @override
  String get expAll => 'All';

  @override
  String get expPaidByMe => 'Paid by me';

  @override
  String get expInvolvesMe => 'Involves me';

  @override
  String expDayTotal(String amount) {
    return '$amount';
  }

  @override
  String expDaySemantics(String date, int count, String amount) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count expenses', one: '1 expense');
    return '$date, $_temp0, total $amount';
  }

  @override
  String get filterTraveler => 'Traveler';

  @override
  String get filterCategory => 'Category';

  @override
  String get filterFrom => 'From';

  @override
  String get filterTo => 'To';

  @override
  String get filterMin => 'Min amount';

  @override
  String get filterMax => 'Max amount';

  @override
  String get filterApply => 'Apply';

  @override
  String get filterAny => 'Any';

  @override
  String get filterShow => 'Show';

  @override
  String filterResults(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Show $count expenses',
      one: 'Show 1 expense',
    );
    return '$_temp0';
  }

  @override
  String rowYourShare(String amount) {
    return 'your share $amount';
  }

  @override
  String rowPayers(int count) {
    return '$count payers';
  }

  @override
  String rowPaidBy(String name) {
    return 'Paid by $name';
  }

  @override
  String get rowRemovedMember => 'Removed member';

  @override
  String get rowReceipt => 'Receipt attached';

  @override
  String get rowDisputed => 'Disputed';

  @override
  String get rowPendingApproval => 'Pending approval';

  @override
  String get rowPendingApprovalTip => 'Pending approval — excluded from balances until a second member approves it';

  @override
  String get rowSyncPending => 'Pending sync';

  @override
  String get rowConflict => 'Sync conflict';

  @override
  String get rowEdit => 'Edit';

  @override
  String get rowDelete => 'Delete';

  @override
  String rowSwitchCurrency(String base, String foreign) {
    return 'Switch between $base and $foreign';
  }

  @override
  String get expDeleted => 'Expense deleted';

  @override
  String get expRestored => 'Expense restored';

  @override
  String get detailPaidBy => 'Paid by';

  @override
  String get detailSplit => 'Split between';

  @override
  String get detailDate => 'Date';

  @override
  String get detailCategory => 'Category';

  @override
  String get detailNote => 'Note';

  @override
  String get detailFlag => 'Flag as disputed';

  @override
  String get detailResolve => 'Resolve dispute';

  @override
  String get detailApprove => 'Approve';

  @override
  String get detailConfirm => 'Confirm payment received';

  @override
  String get detailDisputeTitle => 'Flag this expense';

  @override
  String get detailDisputeHint => 'What looks wrong? (optional)';

  @override
  String get detailDisputeSend => 'Flag';

  @override
  String detailDisputedBy(String note) {
    return 'Flagged: $note';
  }

  @override
  String get detailDisputedNoNote => 'Flagged as disputed';

  @override
  String get detailConfirmed => 'Payment confirmed';

  @override
  String get detailOfflineAction => 'You\'re offline. Connect to the internet to do this.';

  @override
  String detailActionFailed(String reason) {
    return 'Couldn\'t complete that: $reason';
  }

  @override
  String get detailShares => 'Who owes what';

  @override
  String get binTitle => 'Recycle bin';

  @override
  String get binBody => 'Deleted expenses stay here for 24 hours.';

  @override
  String get binEmpty => 'The recycle bin is empty';

  @override
  String get binRestore => 'Restore';

  @override
  String get binDeleteForever => 'Delete forever';

  @override
  String get binEmptyAll => 'Empty recycle bin';

  @override
  String binEmptyConfirm(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Permanently delete $count expenses?',
      one: 'Permanently delete 1 expense?',
    );
    return '$_temp0';
  }

  @override
  String binDeleteConfirm(String title) {
    return 'Delete \"$title\" forever? This can\'t be undone.';
  }

  @override
  String get chipOwe => 'You owe · settle up';

  @override
  String get chipOwed => 'You\'re owed · see who';

  @override
  String chipInvites(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count invites pending',
      one: '1 invite pending',
    );
    return '$_temp0';
  }

  @override
  String chipDisputes(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count disputes', one: '1 dispute');
    return '$_temp0';
  }

  @override
  String get chipCloseout => 'Close out trip';

  @override
  String get expFormComingSoon => 'The expense form is the next piece of Phase 7.';

  @override
  String get formTitleAdd => 'Add expense';

  @override
  String get formTitleEdit => 'Edit expense';

  @override
  String get formSave => 'Save';

  @override
  String get formSaving => 'Saving…';

  @override
  String get formAmount => 'Amount';

  @override
  String get formAmountHint => '0.00 or 12*3+4';

  @override
  String formAmountEquals(String value) {
    return '= $value';
  }

  @override
  String get formWhat => 'What was it for?';

  @override
  String get formWhatHint => 'Dinner, taxi…';

  @override
  String get formCategory => 'Category';

  @override
  String formAutoCategory(String name) {
    return 'Auto-picked: $name';
  }

  @override
  String get formDate => 'Date';

  @override
  String get formToday => 'Today';

  @override
  String get formPaidBy => 'Paid by';

  @override
  String get formMultiplePayers => 'Multiple payers';

  @override
  String get formOnePayer => 'One payer';

  @override
  String formAllocated(String paid, String total) {
    return 'Allocated $paid of $total';
  }

  @override
  String get formSplitBetween => 'Split between';

  @override
  String get formEveryone => 'Everyone';

  @override
  String get formOnlyPayer => 'Only payer';

  @override
  String get formExcludePayer => 'Everyone but payer';

  @override
  String get formPayerHalf => 'Payer 50%';

  @override
  String get formModeEqual => 'Equal';

  @override
  String get formModeShares => 'Shares';

  @override
  String get formModeExact => 'Exact';

  @override
  String get formModePercent => 'Percent';

  @override
  String get formModeItemized => 'Itemized';

  @override
  String get formShareHint => 'e.g. 2';

  @override
  String get formPercentHint => '%';

  @override
  String get formExactHint => 'Amount';

  @override
  String formSumStatus(String sum, String target) {
    return '$sum of $target';
  }

  @override
  String get formSharesWeights => 'Relative shares: 2 pays double 1';

  @override
  String get formWhoOwes => 'Who owes what';

  @override
  String get formExplain => 'Explain';

  @override
  String get formExplainTitle => 'How each share is worked out';

  @override
  String get formExplainRounding =>
      'Cents that don\'t divide evenly go to whoever has the largest remainder; ties go to the payer first.';

  @override
  String get formReceipt => 'Receipt';

  @override
  String get formReceiptCamera => 'Take photo';

  @override
  String get formReceiptGallery => 'Choose photo';

  @override
  String get formReceiptRemove => 'Remove photo';

  @override
  String get formReceiptAttached => 'Photo attached';

  @override
  String get formMoreDetails => 'More details';

  @override
  String get formDraftRestored => 'Restored your unsent draft';

  @override
  String get formDiscardDraft => 'Discard draft';

  @override
  String get formSameAsLast => 'Same as last time';

  @override
  String get formQuickFill => 'Quick fill';

  @override
  String get formQuickFillHint => 'Coffee 4.50 Alice yesterday';

  @override
  String get formQuickFillApply => 'Fill';

  @override
  String get formQuickFillFailed => 'Couldn\'t understand that.';

  @override
  String get formDuplicateTitle => 'Possible duplicate';

  @override
  String get formDuplicateDetails => 'Details';

  @override
  String get formDuplicateIgnore => 'Not a duplicate';

  @override
  String get formCurrency => 'Currency';

  @override
  String formConverted(String amount, String rate) {
    return '≈ $amount at $rate';
  }

  @override
  String get formFxSet => 'Set rate';

  @override
  String formFxTitle(String code, String base) {
    return '$code → $base rate';
  }

  @override
  String formFxLabel(String code, String base) {
    return 'Your rate (1 $code = ? $base)';
  }

  @override
  String get formFxDefault => 'Use default rate';

  @override
  String formFxCurrent(String rate) {
    return 'Current rate: $rate';
  }

  @override
  String get formAddItem => 'Add item';

  @override
  String get formItemName => 'Item';

  @override
  String get formItemAmount => 'Amount';

  @override
  String get formItemSharedBy => 'Shared by';

  @override
  String get formTax => 'Tax';

  @override
  String get formTip => 'Tip';

  @override
  String get formDiscount => 'Discount';

  @override
  String formUseTotal(String total) {
    return 'Use $total as the amount';
  }

  @override
  String get formNoMembers => 'This trip has no active travelers to split with.';

  @override
  String get ledBalances => 'Balances';

  @override
  String get ledAllSettled => 'All settled up';

  @override
  String get ledAllSettledHint => 'Nobody owes anything.';

  @override
  String ledOwed(String amount) {
    return 'is owed $amount';
  }

  @override
  String ledOwes(String amount) {
    return 'owes $amount';
  }

  @override
  String get ledEven => 'settled';

  @override
  String get ledWhoPays => 'Who pays whom';

  @override
  String get ledSettle => 'Settle';

  @override
  String get ledSimplify => 'Simplify debts';

  @override
  String get ledSimplifyHint => 'Fewer, larger payments instead of one per expense.';

  @override
  String get ledSettleTitle => 'Confirm settlement';

  @override
  String get ledSettlePartialTitle => 'Confirm partial settlement';

  @override
  String get ledSettleBody => 'Record this payment as settled?';

  @override
  String get ledSettlePartialBody => 'Record part of this payment? The rest stays pending.';

  @override
  String get ledAmount => 'Amount';

  @override
  String get ledDate => 'Date';

  @override
  String get ledNote => 'Note (optional)';

  @override
  String get ledMarkSettled => 'Mark settled';

  @override
  String get ledMarkPartial => 'Mark partial settlement';

  @override
  String ledRemaining(String amount) {
    return 'Remaining $amount';
  }

  @override
  String get ledAmountInvalid => 'Enter an amount greater than 0.';

  @override
  String get ledHistory => 'Settlement history';

  @override
  String get ledNoHistory => 'No payments recorded yet.';

  @override
  String get ledConfirmed => 'Confirmed';

  @override
  String get ledAwaiting => 'Awaiting confirmation';

  @override
  String get ledSettledToast => 'Settlement recorded';

  @override
  String ledTransfer(String from, String to) {
    return '$from pays $to';
  }

  @override
  String get ledYou => 'You';

  @override
  String get ledAcrossTrips => 'Across your trips';

  @override
  String ledAcrossLine(String currency, String amount) {
    return '$currency: $amount';
  }

  @override
  String get detailReceipt => 'Receipt';

  @override
  String get conflictTitle => 'Sync conflict';

  @override
  String get conflictBody => 'This expense changed on another device while you still had a local edit.';

  @override
  String get conflictKeepMine => 'Keep mine';

  @override
  String get conflictKeepTheirs => 'Keep theirs';

  @override
  String get conflictLocal => 'On this phone';

  @override
  String get conflictServer => 'On the server';

  @override
  String get conflictEmpty => 'No conflicts to resolve.';

  @override
  String get upiPay => 'Pay with UPI';

  @override
  String get upiHint => 'Payee UPI id';

  @override
  String get upiInvalid => 'Enter a UPI id like name@bank.';

  @override
  String get upiCopied => 'UPI id copied';

  @override
  String get upiUnavailable => 'No UPI app opened. The id is copied.';

  @override
  String get shareCard => 'Share card';

  @override
  String closeoutTitle(String name) {
    return 'Close out $name';
  }

  @override
  String get closeoutSettled => 'Everyone is settled. Lock the trip so nobody adds more expenses.';

  @override
  String closeoutOutstanding(String amount, int count) {
    return '$amount still outstanding across $count transfers.';
  }

  @override
  String get closeoutReview => 'Review and settle';

  @override
  String get closeoutLock => 'Lock trip';

  @override
  String get closeoutLockAnyway => 'Lock anyway';

  @override
  String get closeoutNotNow => 'Not now';

  @override
  String get closeoutLocked => 'Trip locked';

  @override
  String get closeoutPulse => 'Would you use Trip Tracker for the next trip with this group?';

  @override
  String get closeoutYes => 'Yes';

  @override
  String get closeoutNo => 'Not this group';

  @override
  String get catTitle => 'Categories';

  @override
  String get catAdd => 'Add category';

  @override
  String get catName => 'Name';

  @override
  String get expCategories => 'Categories';

  @override
  String get expTools => 'Export and import';

  @override
  String get expOtherTrips => 'Other trips';

  @override
  String get toolsTitle => 'Export and import';

  @override
  String get toolsExportCsv => 'Export CSV';

  @override
  String get toolsExportJson => 'Export backup';

  @override
  String get toolsImportJson => 'Import backup';

  @override
  String get toolsSplitwise => 'Import Splitwise CSV';

  @override
  String get toolsQuickAdd => 'Quick add';

  @override
  String get quickAddHint => 'e.g. lunch 240';

  @override
  String get quickAddEmpty => 'Type an amount to add.';

  @override
  String get quickAddConfirm => 'Add expense';

  @override
  String get quickAddFallback => 'Expense';

  @override
  String importDone(int count) {
    return 'Imported $count expenses';
  }

  @override
  String get importNone => 'Nothing to import.';

  @override
  String get memAdd => 'Add person';

  @override
  String get memName => 'Name';

  @override
  String get memInvite => 'Invite';

  @override
  String get memArchived => 'Archived';

  @override
  String get memGroups => 'Groups';

  @override
  String get memAddGroup => 'Add group';

  @override
  String get memRoleOrganizer => 'Organizer';

  @override
  String get memRoleContributor => 'Contributor';

  @override
  String get memRoleViewer => 'Viewer';

  @override
  String get notesCheck => 'Checklist';

  @override
  String get notesNotes => 'Notes';

  @override
  String get notesChat => 'Chat';

  @override
  String get notesAddItem => 'Add item';

  @override
  String get notesAddNote => 'Add note';

  @override
  String get notesNoteTitle => 'Title';

  @override
  String get notesEmptyNotes => 'No notes yet.';

  @override
  String get notesPacking => 'Suggest packing';

  @override
  String get notesPasses => 'Passes';

  @override
  String get notesAddPass => 'Add pass';

  @override
  String get notesSortTime => 'Time';

  @override
  String get notesSortLeg => 'Leg';

  @override
  String get notesSortName => 'Name';

  @override
  String get notesPassTitle => 'Title';

  @override
  String get notesPassFlight => 'Flight';

  @override
  String get notesPassTrain => 'Train';

  @override
  String get notesPassHotel => 'Hotel';

  @override
  String get notesPassFrom => 'From';

  @override
  String get notesPassTo => 'To';

  @override
  String notesProgress(int done, int total) {
    return '$done of $total';
  }

  @override
  String get chatHint => 'Message';

  @override
  String get chatEmpty => 'No messages yet.';

  @override
  String get chatPending => 'Pending';

  @override
  String get chatDeleted => 'Message deleted';

  @override
  String get chatEdit => 'Edit message';
}
