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
  late final TextEditingController _destination;
  DateTimeRange? _range;
  String? _nameError;
  String? _dateError;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final trip = ref.read(tripProvider(widget.tripId)).value;
    _name = TextEditingController(text: trip?.name ?? '');
    _destination = TextEditingController(text: trip?.destination ?? '');
    final start = DateTime.tryParse(trip?.startDate ?? '');
    final end = DateTime.tryParse(trip?.endDate ?? '');
    if (start != null && end != null) _range = DateTimeRange(start: start, end: end);
  }

  @override
  void dispose() {
    _name.dispose();
    _destination.dispose();
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
          destination: _destination.text,
          startDate: _iso(_range!.start),
          endDate: _iso(_range!.end),
        );
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
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
            DestinationField(
              controller: _destination,
              label: 'Destination (optional)',
              enabled: ref.watch(flagProvider(('enableDestinationAutocomplete', null))).value ?? true,
              pastDestinations: [
                for (final t in ref.watch(tripsProvider).value ?? const <Trip>[])
                  if ((t.destination ?? '').trim().isNotEmpty) t.destination!.trim(),
              ],
              onChanged: (_) {},
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
    );
  }
}
