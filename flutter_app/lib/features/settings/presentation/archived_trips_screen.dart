import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/auth_state.dart';
import '../../../data/providers.dart';
import '../../../domain/models/trip.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../trips/application/trips_providers.dart';
import 'settings_widgets.dart';

/// Trips hidden from the main list. Restore brings one back; only its owner can delete it for good.
class ArchivedTripsScreen extends ConsumerWidget {
  const ArchivedTripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final archived = [
      for (final t in ref.watch(tripsProvider).value ?? const <Trip>[])
        if (t.archived) t,
    ];
    final me = ref.watch(authStateProvider).userId;
    final repo = ref.watch(tripRepositoryProvider);
    return AppScaffold(
      backgroundColor: context.tokens.bgSurface,
      appBar: AppBar(title: const Text('Archived Trips')),
      body: archived.isEmpty
          ? const EmptyState(
              icon: Icons.archive_outlined,
              title: 'No archived trips',
              subtitle: 'Archive a trip from its settings to tuck it away here.',
            )
          : ListView(
              padding: const EdgeInsets.only(bottom: 32),
              children: [
                SettingsSection(
                  title: '${archived.length} archived',
                  children: [
                    for (final t in archived)
                      SettingsTile(
                        key: Key('archived-${t.id}'),
                        icon: Icons.archive_outlined,
                        title: t.name,
                        subtitle: t.destination ?? '${t.startDate} to ${t.endDate}',
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              key: Key('archived-restore-${t.id}'),
                              tooltip: 'Restore',
                              icon: const Icon(AppIcons.undo),
                              onPressed: () => repo.setTripState(t.id, archived: false),
                            ),
                            if (t.ownerId == me)
                              IconButton(
                                key: Key('archived-delete-${t.id}'),
                                tooltip: 'Delete forever',
                                icon: Icon(Icons.delete_outline_rounded, color: context.tokens.dangerColor),
                                onPressed: () async {
                                  final ok = await ConfirmDialog.show(
                                    context: context,
                                    title: 'Delete "${t.name}"?',
                                    message:
                                        'This removes the trip and all its expenses for everyone. It cannot be undone.',
                                    confirmLabel: 'Delete',
                                  );
                                  if (ok) await repo.deleteTrip(t.id);
                                },
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
    );
  }
}
