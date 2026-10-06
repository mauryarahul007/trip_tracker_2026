import 'outbox_store.dart';

/// Executes one outbox item against the backend. Must be idempotent (replays
/// after timeouts are expected) and throw [RemoteFailure] to classify errors.
abstract class OutboxRemote {
  Future<void> execute(OutboxItem item);
}
