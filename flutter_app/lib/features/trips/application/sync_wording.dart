import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';
import 'trips_providers.dart' show SyncStatus;

/// How the sync state reads to a traveler. One wording for the trip header line, the header sync button and the
/// Trips list chip, so the same moment never says "Failed", "Waiting" and "Syncing" in three places.
enum SyncTone { calm, busy, problem }

typedef SyncWording = ({String text, IconData icon, SyncTone tone});

SyncWording syncWording(AppLocalizations l10n, {required bool online, required SyncStatus status}) {
  if (status.issues > 0) {
    return (text: l10n.syncLineIssue(status.issues), icon: Icons.sync_problem_rounded, tone: SyncTone.problem);
  }
  if (!online) {
    return status.pending > 0
        ? (text: l10n.syncLineOfflineWaiting(status.pending), icon: Icons.cloud_off_rounded, tone: SyncTone.busy)
        : (text: l10n.syncLineOffline, icon: Icons.cloud_off_rounded, tone: SyncTone.calm);
  }
  if (status.pending > 0) {
    return (text: l10n.syncLineSyncing(status.pending), icon: Icons.sync_rounded, tone: SyncTone.busy);
  }
  return (text: l10n.syncLineSaved, icon: Icons.check_circle_outline_rounded, tone: SyncTone.calm);
}
