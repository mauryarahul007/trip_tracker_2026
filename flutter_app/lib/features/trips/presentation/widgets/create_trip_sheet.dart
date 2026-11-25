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
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../expenses/application/trip_budget.dart';
import '../../../../domain/logic/currency.dart' show getCurrencySymbol;
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/section_label.dart';
import '../../application/trips_providers.dart' show tripsProvider, tripColorsProvider;
import 'destination_field.dart';
import '../../../../shared/widgets/discard_guard.dart';

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
  final _budget = TextEditingController(); // Horizon: optional, kept on this device like Set budget
  DateTimeRange? _range;
  String _currency = 'INR';
  bool _currencyTouched = false;
  bool _nameTouched = false;
  bool _busy = false;
  String? _template; // a starter kit id (flag `enableTripTemplates`)
  BentoTone? _cover; // Horizon cover colour, kept on this device only
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
    _budget.dispose();
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
    // Only the Horizon sheet shows the picker, so a picked colour means Horizon is on.
    if (_cover != null) {
      ref.read(tripColorsProvider.notifier).set(id, _cover!.name);
    }
    final budget = double.tryParse(_budget.text.trim().replaceAll(',', ''));
    if (budget != null && budget > 0) await ref.read(tripBudgetProvider(id).notifier).set(budget);
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

  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  String _short(DateTime d) => '${d.day} ${_months[d.month - 1]}';

  InputDecoration _boxDecoration(String label, {String? error, String? prefix}) {
    final t = context.tokens;
    OutlineInputBorder b(Color c, [double w = 1]) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: c, width: w),
    );
    return InputDecoration(
      labelText: label,
      floatingLabelBehavior: FloatingLabelBehavior.always,
      errorText: error,
      prefixText: prefix,
      filled: true,
      fillColor: t.bgSurface,
      border: b(t.borderColor),
      enabledBorder: b(t.borderColor),
      focusedBorder: b(t.primaryAccent, 2),
      labelStyle: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 14, color: t.textSecondary),
      contentPadding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
    );
  }

  Widget _dateBox(Key key, String label, DateTime? d) {
    final t = context.tokens;
    return InkWell(
      key: key,
      borderRadius: BorderRadius.circular(14),
      onTap: _pickDates,
      child: InputDecorator(
        decoration: _boxDecoration(label),
        child: Text(
          d == null ? '—' : _short(d),
          style: TextStyle(fontFamily: AppTypography.fontBody, fontSize: 16, color: t.textPrimary),
        ),
      ),
    );
  }

  /// Horizon ("New trip" mockup): Trip name, Starts / Ends, Currency and Budget side by side, cover colours and
  /// "Create and invite". Destination and templates stay, under the form.
  Widget _horizon(BuildContext context, bool templatesOn) {
    final l10n = context.l10n;
    final t = context.tokens;
    final body = TextStyle(fontFamily: AppTypography.fontBody, fontSize: 16, color: t.textPrimary);
    return DiscardGuard(
      controllers: [_name, _destination],
      initial: const ['', ''],
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
        child: SingleChildScrollView(
          key: const Key('horizon-create-trip'),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                key: const Key('create-trip-name'),
                controller: _name,
                style: body,
                textInputAction: TextInputAction.next,
                decoration: _boxDecoration(
                  l10n.fieldTripName,
                  error: _nameError,
                ).copyWith(hintText: l10n.fieldTripNameHint),
                onChanged: (v) => _nameTouched = v.trim().isNotEmpty,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _dateBox(const Key('create-trip-starts'), l10n.horizonStarts, _range?.start)),
                  const SizedBox(width: 10),
                  Expanded(child: _dateBox(const Key('create-trip-ends'), l10n.horizonEnds, _range?.end)),
                ],
              ),
              if (_dateError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 6, left: 4),
                  child: Text(_dateError!, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
                ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      key: const Key('create-trip-currency'),
                      isExpanded: true,
                      initialValue: _currency,
                      style: body,
                      borderRadius: BorderRadius.circular(14),
                      decoration: _boxDecoration(l10n.fieldCurrency),
                      items: [
                        for (final c in defaultExchangeRates.keys)
                          DropdownMenuItem(value: c, child: Text('${getCurrencySymbol(c)} $c')),
                      ],
                      onChanged: (v) => setState(() {
                        _currency = v ?? _currency;
                        _currencyTouched = true;
                      }),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      key: const Key('create-trip-budget'),
                      controller: _budget,
                      style: body.copyWith(fontFamily: AppTypography.fontMono),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: _boxDecoration(l10n.horizonBudgetOptional, prefix: getCurrencySymbol(_currency)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _CoverPicker(value: _cover, onChanged: (v) => setState(() => _cover = v)),
              const SizedBox(height: 16),
              AppButton(
                key: const Key('create-trip-submit'),
                label: l10n.horizonCreateAndInvite,
                isLoading: _busy,
                isFullWidth: true,
                onPressed: _busy ? null : _submit,
              ),
              const SizedBox(height: 18),
              SectionLabel(l10n.createTripSectionWhere),
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
              if (templatesOn) ...[
                const SizedBox(height: 14),
                Text(l10n.templateTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    for (final tp in tripTemplates)
                      ChoiceChip(
                        key: Key('template-${tp.id}'),
                        showCheckmark: false,
                        shape: const StadiumBorder(),
                        label: Text(_templateLabel(tp.id)),
                        selected: _template == tp.id,
                        onSelected: (on) => setState(() => _template = on ? tp.id : null),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final templatesOn = ref.watch(flagProvider(('enableTripTemplates', null))).value ?? true;
    if (context.tokens.horizon) return _horizon(context, templatesOn);
    return DiscardGuard(
      controllers: [_name, _destination],
      initial: const ['', ''],
      child: Padding(
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
              SectionLabel(l10n.createTripSectionWhere),
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
              const SizedBox(height: 16),
              SectionLabel(l10n.createTripSectionWhen),
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
              const SizedBox(height: 16),
              SectionLabel(l10n.createTripSectionMoney),
              AppFieldLabel(l10n.fieldCurrency),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _currency,
                borderRadius: BorderRadius.circular(context.tokens.radiusSm + 4),
                decoration: appFieldDecoration(context.tokens),
                items: [for (final c in defaultExchangeRates.keys) DropdownMenuItem(value: c, child: Text(c))],
                onChanged: (v) => setState(() {
                  _currency = v ?? _currency;
                  _currencyTouched = true;
                }),
              ),
              if (context.tokens.horizon) ...[
                const SizedBox(height: 16),
                _CoverPicker(value: _cover, onChanged: (v) => setState(() => _cover = v)),
              ],
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
      ),
    );
  }
}

/// Horizon cover colour swatches (flag `enableHorizonUi`). Tap one to pick it, tap it again to go back to the
/// automatic colour. Saved on this device only: the trip itself has no colour field.
class _CoverPicker extends StatelessWidget {
  const _CoverPicker({required this.value, required this.onChanged});

  final BentoTone? value;
  final ValueChanged<BentoTone?> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final l10n = context.l10n;
    return Column(
      key: const Key('cover-picker'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionLabel(t.horizon ? l10n.horizonCover : l10n.horizonCoverColour),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: [
            for (final tone in BentoTone.values)
              Semantics(
                button: true,
                selected: value == tone,
                label: l10n.horizonToneName(tone.name),
                child: InkResponse(
                  key: Key('cover-${tone.name}'),
                  onTap: () => onChanged(value == tone ? null : tone),
                  radius: 26,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: t.tones[tone].accent,
                      shape: BoxShape.circle,
                      border: Border.all(color: value == tone ? t.textPrimary : Colors.transparent, width: 3),
                    ),
                    child: value == tone ? const Icon(Icons.check_rounded, color: Colors.white, size: 22) : null,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(l10n.horizonCoverColourHint, style: TextStyle(fontSize: 12, color: t.textSecondary)),
      ],
    );
  }
}
