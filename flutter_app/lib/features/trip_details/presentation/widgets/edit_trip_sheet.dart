import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/providers.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange;
import '../../../../domain/models/trip.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../application/trip_nav.dart' show tripProvider;
import '../../../trips/application/trips_providers.dart' show tripsProvider;
import '../../../trips/presentation/widgets/create_trip_sheet.dart' show dateRangePickerProvider;
import '../../../trips/presentation/widgets/destination_field.dart';
import '../../../../shared/widgets/discard_guard.dart';

String _iso(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Edit a trip's name, destination and dates (the web "Edit Trip" card). Pops true when saved.
class EditTripSheet extends ConsumerStatefulWidget {
  const EditTripSheet({required this.tripId, this.today, super.key});

  final String tripId;

  /// Injectable for tests.
  final DateTime? today;

  @override
  ConsumerState<EditTripSheet> createState() => _EditTripSheetState();
}

class _EditTripSheetState extends ConsumerState<EditTripSheet> {
  late final TextEditingController _name;
  late final String _initialName;
  // One box per destination; stored as one comma-separated string so the rest of the app keeps working.
  final _destinations = <TextEditingController>[];
  DateTimeRange? _range;
  String? _nameError;
  String? _dateError;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final trip = ref.read(tripProvider(widget.tripId)).value;
    _initialName = trip?.name ?? '';
    _name = TextEditingController(text: _initialName);
    final saved = [
      for (final d in (trip?.destination ?? '').split(','))
        if (d.trim().isNotEmpty) d.trim(),
    ];
    for (final d in saved.isEmpty ? [''] : saved) {
      _destinations.add(TextEditingController(text: d));
    }
    final start = DateTime.tryParse(trip?.startDate ?? '');
    final end = DateTime.tryParse(trip?.endDate ?? '');
    if (start != null && end != null) _range = DateTimeRange(start: start, end: end);
  }

  @override
  void dispose() {
    _name.dispose();
    for (final c in _destinations) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDates() async {
    final r = await ref.read(dateRangePickerProvider)(context, widget.today ?? DateTime.now(), _range);
    if (r == null) return;
    setState(() {
      _range = r;
      _dateError = null;
    });
  }

  Future<void> _save() async {
    setState(() {
      _nameError = _name.text.trim().isEmpty ? 'Give the trip a name' : null;
      _dateError = _range == null ? 'Pick the trip dates' : null;
    });
    if (_nameError != null || _dateError != null) return;
    setState(() => _busy = true);
    await ref
        .read(tripRepositoryProvider)
        .updateTripDetails(
          widget.tripId,
          name: _name.text,
          destination: [
            for (final c in _destinations)
              if (c.text.trim().isNotEmpty) c.text.trim(),
          ].join(', '),
          startDate: _iso(_range!.start),
          endDate: _iso(_range!.end),
        );
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final pastDestinations = [
      for (final t in ref.watch(tripsProvider).value ?? const <Trip>[])
        for (final d in (t.destination ?? '').split(','))
          if (d.trim().isNotEmpty) d.trim(),
    ];
    return DiscardGuard(
      controllers: [_name],
      initial: [_initialName],
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppTextField(
                key: const Key('edit-trip-name'),
                controller: _name,
                label: 'Trip name',
                errorText: _nameError,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              for (var i = 0; i < _destinations.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: DestinationField(
                          key: ObjectKey(_destinations[i]),
                          controller: _destinations[i],
                          label: _destinations.length == 1 ? 'Destination (optional)' : 'Destination ${i + 1}',
                          enabled: ref.watch(flagProvider(('enableDestinationAutocomplete', null))).value ?? true,
                          pastDestinations: pastDestinations,
                          onChanged: (_) {},
                        ),
                      ),
                      if (_destinations.length > 1)
                        IconButton(
                          key: Key('edit-trip-remove-destination-$i'),
                          tooltip: 'Remove destination',
                          constraints: const BoxConstraints(minWidth: 48, minHeight: 56),
                          icon: const Icon(Icons.remove_circle_outline_rounded),
                          onPressed: () => setState(() => _destinations.removeAt(i).dispose()),
                        ),
                    ],
                  ),
                ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  key: const Key('edit-trip-add-destination'),
                  onPressed: () => setState(() => _destinations.add(TextEditingController())),
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Add destination'),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                key: const Key('edit-trip-dates'),
                onPressed: _pickDates,
                icon: const Icon(Icons.date_range_rounded),
                label: Text(_range == null ? 'Dates' : formatDateRange(_iso(_range!.start), _iso(_range!.end))),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(56),
                  alignment: Alignment.centerLeft,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                ),
              ),
              if (_dateError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6, left: 4),
                  child: Text(_dateError!, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
                ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: AppButton(
                      key: const Key('edit-trip-save'),
                      label: 'Update Trip',
                      isLoading: _busy,
                      onPressed: _busy ? null : _save,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: AppButton(
                      key: const Key('edit-trip-cancel'),
                      label: 'Cancel',
                      variant: AppButtonVariant.secondary,
                      onPressed: () => Navigator.of(context).pop(false),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
