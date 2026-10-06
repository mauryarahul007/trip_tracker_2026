/// How long the app may stay in the background before it re-locks.
const appLockTimeout = Duration(seconds: 30);

/// Lock on return from background only if the user enabled the lock and was
/// away at least [timeout] (quick app switches must not re-prompt).
bool shouldLockOnResume({
  required bool enabled,
  required DateTime? backgroundedAt,
  required DateTime now,
  Duration timeout = appLockTimeout,
}) =>
    enabled && backgroundedAt != null && now.difference(backgroundedAt) >= timeout;
