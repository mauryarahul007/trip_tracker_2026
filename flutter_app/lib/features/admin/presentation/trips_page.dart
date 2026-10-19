import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/models/admin.dart';
import '../../../shared/theme/app_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_sheet.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/receipt_card.dart';
import '../application/admin_providers.dart';
import 'admin_widgets.dart';

/// Every trip on the platform. "Ground" freezes a trip (nobody can add or edit expenses); archive hides it.
class TripsPage extends ConsumerStatefulWidget {
  const TripsPage({super.key});

  @override
  ConsumerState<TripsPage> createState() => _TripsPageState();
}

class _TripsPageState extends ConsumerState<TripsPage> {
  String _query = '';
  String _status = 'all';

  Future<void> _refresh() async {
    ref.invalidate(adminTripsProvider);
    await ref.read(adminTripsProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final trips = ref.watch(adminTripsProvider);
    final t = context.tokens;
    return AdminAsync<List<AdminTrip>>(
      value: trips,
      onRefresh: _refresh,
      builder: (context, all) {
        final q = _query.trim().toLowerCase();
        final shown = [
          for (final x in all)
            if ((_status == 'all' || x.status == _status) &&
                (q.isEmpty || x.name.toLowerCase().contains(q) || (x.destination ?? '').toLowerCase().contains(q)))
              x,
        ];
        return ListView(
          key: const Key('trip-list'),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            AdminSearchField(hint: 'Search ${all.length} trips', onChanged: (v) => setState(() => _query = v)),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final s in const ['all', 'active', 'grounded', 'closed', 'archived'])
                    AdminFilterChip(
                      key: Key('trip-status-$s'),
                      label: s[0].toUpperCase() + s.substring(1),
                      selected: _status == s,
                      onTap: () => setState(() => _status = s),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (shown.isEmpty)
              const EmptyState(
                icon: Icons.luggage_rounded,
                title: 'No trips',
                subtitle: 'Nothing matches these filters.',
              )
            else
              for (final x in shown)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    key: Key('trip-${x.id}'),
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => _open(context, x),
                    child: ReceiptCard(
                      body: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            x.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: t.textPrimary),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            [
                              if ((x.destination ?? '').isNotEmpty) x.destination!,
                              if (x.startDate.isNotEmpty) '${x.startDate} → ${x.endDate}',
                            ].join(' · '),
                            style: TextStyle(fontSize: 12.5, color: t.textSecondary),
                          ),
                        ],
                      ),
                      footer: Row(
                        children: [
                          AdminPill(x.status.toUpperCase(), color: adminStatusColor(t, x.status)),
                          const Spacer(),
                          Text(
                            '${x.memberCount} members · ${adminDate(x.createdAt)}',
                            style: TextStyle(fontFamily: AppTypography.fontMono, fontSize: 11, color: t.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
          ],
        );
      },
    );
  }

  Future<void> _open(BuildContext context, AdminTrip trip) async {
    final changed = await AppSheet.show<bool>(
      context: context,
      title: trip.name,
      builder: (_) => TripActionsSheet(trip: trip),
    );
    if (changed == true) ref.invalidate(adminTripsProvider);
  }
}

class TripActionsSheet extends ConsumerStatefulWidget {
  const TripActionsSheet({required this.trip, super.key});

  final AdminTrip trip;

  @override
  ConsumerState<TripActionsSheet> createState() => _TripActionsSheetState();
}

class _TripActionsSheetState extends ConsumerState<TripActionsSheet> {
  bool _busy = false;
  String? _error;

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final x = widget.trip;
    final t = context.tokens;
    final repo = ref.read(adminRepositoryProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AdminPill(x.status.toUpperCase(), color: adminStatusColor(t, x.status)),
              const SizedBox(width: 8),
              Text('${x.memberCount} members', style: TextStyle(color: t.textSecondary)),
            ],
          ),
          const SizedBox(height: 4),
          Text('ID ${x.id}', style: TextStyle(fontSize: 11, color: t.textMuted)),
          const SizedBox(height: 16),
          AppButton(
            key: const Key('trip-ground'),
            label: x.frozen ? 'Unground trip' : 'Ground trip',
            icon: x.frozen ? Icons.flight_takeoff_rounded : Icons.flight_land_rounded,
            variant: AppButtonVariant.secondary,
            isLoading: _busy,
            onPressed: _busy ? null : () => _run(() => repo.setTripFrozen(x, !x.frozen)),
          ),
          const SizedBox(height: 10),
          AppButton(
            key: const Key('trip-archive'),
            label: x.archived ? 'Restore trip' : 'Archive trip',
            icon: x.archived ? Icons.unarchive_rounded : Icons.archive_rounded,
            variant: AppButtonVariant.secondary,
            onPressed: _busy ? null : () => _run(() => repo.setTripArchived(x, !x.archived)),
          ),
          const SizedBox(height: 10),
          AppButton(
            key: const Key('trip-delete'),
            label: 'Delete trip',
            icon: Icons.delete_forever_rounded,
            variant: AppButtonVariant.secondary,
            onPressed: _busy
                ? null
                : () async {
                    final ok = await ConfirmDialog.show(
                      context: context,
                      title: 'Delete "${x.name}"?',
                      message: 'This removes the trip and all of its expenses for every member. It cannot be undone.',
                      confirmLabel: 'Delete',
                      isDestructive: true,
                    );
                    if (ok) await _run(() => repo.deleteTrip(x));
                  },
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                _error!,
                key: const Key('trip-error'),
                style: TextStyle(color: t.colorDanger),
              ),
            ),
        ],
      ),
    );
  }
}
