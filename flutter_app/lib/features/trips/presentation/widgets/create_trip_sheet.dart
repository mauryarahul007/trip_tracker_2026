import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/auth_state.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/currency.dart' show defaultExchangeRates;
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange, guessTripCurrency, suggestTripName;
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

/// Seam so tests can pick dates without driving the Material picker.
final dateRangePickerProvider = Provider<Future<DateTimeRange?> Function(BuildContext, DateTime, DateTimeRange?)>(
  (ref) => (context, today, initial) => showDateRangePicker(
        context: context,
        firstDate: DateTime(today.year - 1),
        lastDate: DateTime(today.year + 5),
        initialDateRange: initial,
      ),
);

String _iso(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Create-trip form. Pops the new trip id.
class CreateTripSheet extends ConsumerStatefulWidget {
  const CreateTripSheet({this.today, super.key});

  /// Injectable for tests.
  final DateTime? today;

  @override
  ConsumerState<CreateTripSheet> createState() => _CreateTripSheetState();
}

class _CreateTripSheetState extends ConsumerState<CreateTripSheet> {
  final _name = TextEditingController();
  final _destination = TextEditingController();
  DateTimeRange? _range;
  String _currency = 'INR';
  bool _currencyTouched = false;
  bool _busy = false;
  String? _nameError;
  String? _dateError;

  DateTime get _today => widget.today ?? DateTime.now();

  @override
  void dispose() {
    _name.dispose();
    _destination.dispose();
    super.dispose();
  }

  void _onDestinationChanged(String v) {
    if (!_currencyTouched) {
      final guess = guessTripCurrency(v);
      if (guess != null && defaultExchangeRates.containsKey(guess)) setState(() => _currency = guess);
    }
  }

  Future<void> _pickDates() async {
    final r = await ref.read(dateRangePickerProvider)(context, _today, _range);
    if (r == null) return;
    setState(() {
      _range = r;
      _dateError = null;
    });
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    final destination = _destination.text.trim();
    var name = _name.text.trim();
    if (name.isEmpty && destination.isNotEmpty && _range != null) {
      name = suggestTripName(destination, _iso(_range!.start), _iso(_range!.end));
    }
    setState(() {
      _nameError = name.isEmpty ? l10n.createTripNameRequired : null;
      _dateError = _range == null ? l10n.createTripDatesRequired : null;
    });
    if (_nameError != null || _dateError != null) return;

    final user = ref.read(authStateProvider).user!;
    setState(() => _busy = true);
    final id = await ref.read(tripRepositoryProvider).createTrip(
          name: name,
          startDate: _iso(_range!.start),
          endDate: _iso(_range!.end),
          baseCurrency: _currency,
          ownerId: user.id,
          creatorName: user.displayName ?? user.email?.split('@').first ?? 'Me',
          destination: destination.isEmpty ? null : destination,
        );
    if (mounted) Navigator.of(context).pop(id);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppTextField(
              controller: _name,
              label: l10n.fieldTripName,
              hint: l10n.fieldTripNameHint,
              errorText: _nameError,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _destination,
              label: l10n.fieldDestination,
              onChanged: _onDestinationChanged,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickDates,
              icon: const Icon(Icons.date_range_rounded),
              label: Text(_range == null ? l10n.fieldDates : formatDateRange(_iso(_range!.start), _iso(_range!.end))),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            ),
            if (_dateError != null)
              Padding(
                padding: const EdgeInsets.only(top: 6, left: 4),
                child: Text(_dateError!, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
              ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _currency,
              decoration: InputDecoration(labelText: l10n.fieldCurrency),
              items: [for (final c in defaultExchangeRates.keys) DropdownMenuItem(value: c, child: Text(c))],
              onChanged: (v) => setState(() {
                _currency = v ?? _currency;
                _currencyTouched = true;
              }),
            ),
            const SizedBox(height: 20),
            AppButton(label: l10n.actionCreateTrip, isLoading: _busy, isFullWidth: true, onPressed: _busy ? null : _submit),
          ],
        ),
      ),
    );
  }
}
