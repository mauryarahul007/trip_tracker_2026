import 'dart:async';

import 'package:flutter/widgets.dart';

import '../../../data/repositories/notification_repository.dart';
import '../../../shared/widgets/undo_snackbar.dart';

/// Swipe-to-delete for an Activity row with an Undo window (flag `enableExtendedUndo`).
///
/// The row is hidden straight away through [hide]; the real delete (local and server) only runs once the Undo
/// snackbar has closed without Undo being pressed, so there is nothing to restore on the server. [show] puts the
/// row back. With [undoOn] false it deletes immediately, as before.
void deleteNotificationWithUndo(
  BuildContext context, {
  required NotificationRepository repo,
  required String id,
  required bool undoOn,
  required VoidCallback hide,
  required VoidCallback show,
  String message = 'Update removed',
}) {
  if (!undoOn) {
    unawaited(repo.delete(id));
    return;
  }
  hide();
  var undone = false;
  final controller = UndoSnackbar.show(
    context: context,
    message: message,
    onUndo: () {
      undone = true;
      show();
    },
  );
  unawaited(
    controller.closed.then((_) {
      if (!undone) unawaited(repo.delete(id));
    }),
  );
}
