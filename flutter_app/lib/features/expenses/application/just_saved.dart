import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The expense the add form just created, so the Spend list can flash its row once (flag
/// `enableSaveConfirmation`). Cleared by the row when the flash ends.
class JustSavedNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String id) => state = id;

  void clear(String id) {
    if (state == id) state = null;
  }
}

final justSavedExpenseProvider = NotifierProvider<JustSavedNotifier, String?>(JustSavedNotifier.new);
