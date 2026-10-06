/// Wire names match the web `SyncQueueItemType` (SYNC.md §1).
class OutboxType {
  static const addExpense = 'addExpense';
  static const updateExpense = 'updateExpense';
  static const deleteExpense = 'deleteExpense';
  static const restoreExpense = 'restoreExpense';
  static const permanentlyDeleteExpense = 'permanentlyDeleteExpense';
  static const emptyRecycleBin = 'emptyRecycleBin';
  static const createTrip = 'createTrip';
  static const updateTripState = 'updateTripState'; // archived / frozen / closed
  static const deleteTrip = 'deleteTrip';
  static const setTripCollabField = 'setTripCollabField'; // checklist / notes / passes / fx_config (participants may write)
  static const addMember = 'addMember';
  static const updateMember = 'updateMember';
  static const toggleArchiveMember = 'toggleArchiveMember';
  static const deleteMember = 'deleteMember';
  static const createGroup = 'createGroup';
  static const updateGroup = 'updateGroup';
  static const deleteGroup = 'deleteGroup';
  static const addCategory = 'addCategory';
  static const deleteCategory = 'deleteCategory';

  static const all = [
    addExpense, updateExpense, deleteExpense, restoreExpense,
    permanentlyDeleteExpense, emptyRecycleBin, createTrip, updateTripState,
    deleteTrip, setTripCollabField, addMember,
    updateMember, toggleArchiveMember, deleteMember, createGroup,
    updateGroup, deleteGroup, addCategory, deleteCategory,
  ];
}

class OutboxStatus {
  static const pending = 'pending';
  static const inFlight = 'in_flight';
  static const failed = 'failed'; // transient error, retried with backoff
  static const poison = 'poison'; // quarantined: needs user attention
}

/// Current payload schema version; stored as `v` inside every payload.
const outboxPayloadVersion = 1;

enum FailureKind { transient, permanent, auth }

/// Thrown by an [OutboxRemote] to classify why a mutation failed.
class RemoteFailure implements Exception {
  final FailureKind kind;
  final String message;
  const RemoteFailure(this.kind, this.message);
  @override
  String toString() => 'RemoteFailure(${kind.name}): $message';
}
