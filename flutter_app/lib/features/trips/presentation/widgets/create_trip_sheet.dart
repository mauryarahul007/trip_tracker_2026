import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../app/auth_state.dart';
import '../../../../data/providers.dart';
import '../../../../domain/logic/currency.dart' show defaultExchangeRates;
import '../../../../domain/logic/trip_templates.dart';
import '../../../../domain/models/checklist_item.dart';
import '../../../../domain/models/trip.dart' show Trip;
import '../../../../domain/logic/place_suggest.dart' show PlaceSuggestion, currencyForCountry;
import '../../../../core/settings/app_settings.dart';
import '../../../../domain/logic/trip_utilities.dart' show formatDateRange, guessTripCurrency, suggestTripName;
import '../../../../l10n/l10n_ext.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../application/trips_providers.dart' show tripsProvider;
import 'destination_field.dart';

/// Seam so tests can pick dates without driving the Material picker.
final dateRangePickerProvider = Provider<Future<DateTimeRange?> Function(BuildContext, DateTime, DateTimeRange?)>(
  (ref) =>
      (context, today, initial) => showDateRangePicker(
        context: context,
        firstDate: DateTime(today.year - 1),
        lastDate: DateTime(today.year + 5),
        initialDateRange: initial,
      ),
);

String _iso(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

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
  bool _nameTouched = false;
  bool _busy = false;
  String? _template; // a starter kit id (flag `enableTripTemplates`)
  String? _nameError;
  String? _dateError;

  DateTime get _today => widget.today ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    // A default currency chosen in Settings beats the destination guess.
    final preferred = ref.read(defaultCurrencyPrefProvider);
    if (preferred != null && defaultExchangeRates.containsKey(preferred)) {
      _currency = preferred;
      _currencyTouched = true;
    }
  }

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
    // Suggest a trip name from the destination until the traveler types their own.
    if (!_nameTouched) _name.text = suggestTripName(v);
  }

  void _onPlacePicked(PlaceSuggestion s) {
    final code = currencyForCountry(s.countryCode);
    if (!_currencyTouched && code != null && defaultExchangeRates.containsKey(code)) setState(() => _currency = code);
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
    final id = await ref
        .read(tripRepositoryProvider)
        .createTrip(
          name: name,
          startDate: _iso(_range!.start),
          endDate: _iso(_range!.end),
          baseCurrency: _currency,
          ownerId: user.id,
          creatorName: user.displayName ?? user.email?.split('@').first ?? 'Me',
          destination: destination.isEmpty ? null : destination,
        );
    if (_template != null && (ref.read(flagProvider(('enableTripTemplates', null))).value ?? true)) {
      await _applyTemplate(id, tripTemplateById(_template));
    }
    if (mounted) Navigator.of(context).pop(id);
  }

  /// Adds the template's extra categories and its starter checklist to the new trip.
  Future<void> _applyTemplate(String tripId, TripTemplate? t) async {
    if (t == null) return;
    final cats = ref.read(categoryRepositoryProvider);
    final have = [for (final c in await cats.watch(tripId).first) c.name];
    for (final name in newCategoryNames(t, have)) {
      await cats.add(tripId, name);
    }
    final now = DateTime.now().millisecondsSinceEpoch;
    await ref.read(tripRepositoryProvider).setChecklist(tripId, [
      for (final (i, item) in t.checklist.indexed)
        ChecklistItem(id: const Uuid().v4(), text: item.$1, category: item.$2, createdAt: now + i, updatedAt: now + i),
    ]);
  }

  String _templateLabel(String id) => switch (id) {
    'weekend' => context.l10n.templateWeekend,
    'roadtrip' => context.l10n.templateRoadTrip,
    _ => context.l10n.templateGroupStay,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final templatesOn = ref.watch(flagProvider(('enableTripTemplates', null))).value ?? true;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (templatesOn) ...[
              Text(l10n.templateTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final t in tripTemplates)
                    ChoiceChip(
                      key: Key('template-${t.id}'),
                      showCheckmark: false,
                      shape: const StadiumBorder(),
                      label: Text(_templateLabel(t.id)),
                      selected: _template == t.id,
                      // Tap the chosen one again to start empty.
                      onSelected: (on) => setState(() => _template = on ? t.id : null),
                    ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            DestinationField(
              controller: _destination,
              label: l10n.fieldDestination,
              enabled: ref.watch(flagProvider(('enableDestinationAutocomplete', null))).value ?? true,
              pastDestinations: [
                for (final t in ref.watch(tripsProvider).value ?? const <Trip>[])
                  if ((t.destination ?? '').trim().isNotEmpty) t.destination!.trim(),
              ],
              onChanged: _onDestinationChanged,
              onPicked: _onPlacePicked,
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _name,
              label: l10n.fieldTripName,
              hint: l10n.fieldTripNameHint,
              errorText: _nameError,
              // Typing a name stops the suggestion; clearing it brings the suggestion back.
              onChanged: (v) => _nameTouched = v.trim().isNotEmpty,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickDates,
              icon: const Icon(Icons.date_range_rounded),
              label: Text(_range == null ? l10n.fieldDates : formatDateRange(_iso(_range!.start), _iso(_range!.end))),
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
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: _currency,
              decoration: InputDecoration(labelText: l10n.fieldCurrency),
              items: [for (final c in defaultExchangeRates.keys) DropdownMenuItem(value: c, child: Text(c))],
              onChanged: (v) => setState(() {
                _currency = v ?? _currency;
                _currencyTouched = true;
              }),
            ),
            const SizedBox(height: 20),
            AppButton(
              label: l10n.actionCreateTrip,
              isLoading: _busy,
              isFullWidth: true,
              onPressed: _busy ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}
