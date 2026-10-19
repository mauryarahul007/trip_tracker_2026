/// A receipt photo copied into app storage, waiting to be uploaded by the outbox.
class StagedReceipt {
  const StagedReceipt({required this.localPath, required this.ext, required this.mime});
  final String localPath;
  final String ext;
  final String mime;
}

/// Result of saving an expense. `error` carries the web's wording.
class SaveOutcome {
  const SaveOutcome.ok(String this.expenseId) : error = null;
  const SaveOutcome.failed(String this.error) : expenseId = null;
  final String? expenseId;
  final String? error;
  bool get isOk => error == null;
}

/// Raised by online-only actions (dispute, approve, confirm settlement) when
/// there is no connection or the server refused. Same behaviour as the web.
class ExpenseActionException implements Exception {
  const ExpenseActionException(this.message, {this.offline = false});
  final String message;
  final bool offline;
  @override
  String toString() => 'ExpenseActionException($message)';
}
