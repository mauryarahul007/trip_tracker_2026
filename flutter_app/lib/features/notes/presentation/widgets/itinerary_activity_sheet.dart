import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/platform/haptics.dart';
import '../../../../domain/models/itinerary_item.dart';
import '../../../../shared/theme/app_icons.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_sheet.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../application/itinerary_providers.dart';

class ItineraryActivitySheet extends ConsumerStatefulWidget {
  final String tripId;
  final String initialDate;
  final ItineraryItem? initialItem;
  final String? tripStartDate;
  final String? tripEndDate;

  const ItineraryActivitySheet({
    required this.tripId,
    required this.initialDate,
    this.initialItem,
    this.tripStartDate,
    this.tripEndDate,
    super.key,
  });

  static Future<void> show(
    BuildContext context, {
    required String tripId,
    required String initialDate,
    ItineraryItem? initialItem,
    String? tripStartDate,
    String? tripEndDate,
  }) {
    return AppSheet.show<void>(
      context: context,
      title: initialItem != null ? 'Edit Activity' : 'Add Activity',
      builder: (_) => ItineraryActivitySheet(
        tripId: tripId,
        initialDate: initialDate,
        initialItem: initialItem,
        tripStartDate: tripStartDate,
        tripEndDate: tripEndDate,
      ),
    );
  }

  @override
  ConsumerState<ItineraryActivitySheet> createState() => _ItineraryActivitySheetState();
}

class _ItineraryActivitySheetState extends ConsumerState<ItineraryActivitySheet> {
  late final TextEditingController _titleController;
  late final TextEditingController _dateController;
  late final TextEditingController _timeController;
  late final TextEditingController _locationController;
  late final TextEditingController _notesController;
  late String _selectedCategory;
  bool _busy = false;
  String? _error;

  static const _categories = [
    ('activity', '🎟️ Activity'),
    ('food', '🍝 Dining'),
    ('sightseeing', '🏛️ Sightseeing'),
    ('transport', '🚕 Transit'),
    ('lodging', '🏨 Stay'),
    ('other', '✨ Other'),
  ];

  @override
  void initState() {
    super.initState();
    final item = widget.initialItem;
    _titleController = TextEditingController(text: item?.title ?? '');
    _dateController = TextEditingController(text: item?.date ?? widget.initialDate);
    _timeController = TextEditingController(text: item?.time ?? '10:00');
    _locationController = TextEditingController(text: item?.location ?? '');
    _notesController = TextEditingController(text: item?.notes ?? '');
    _selectedCategory = item?.category ?? 'activity';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    _locationController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final cur = DateTime.tryParse(_dateController.text) ?? DateTime.now();
    final first = widget.tripStartDate != null
        ? DateTime.tryParse(widget.tripStartDate!) ?? DateTime(2020)
        : DateTime(2020);
    final last = widget.tripEndDate != null
        ? DateTime.tryParse(widget.tripEndDate!) ?? DateTime(2035)
        : DateTime(2035);

    final picked = await showDatePicker(
      context: context,
      initialDate: cur.isBefore(first) ? first : (cur.isAfter(last) ? last : cur),
      firstDate: first,
      lastDate: last,
    );
    if (picked != null) {
      final iso =
          '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      setState(() => _dateController.text = iso);
    }
  }

  Future<void> _pickTime() async {
    final parts = _timeController.text.split(':');
    final curHour = parts.isNotEmpty ? int.tryParse(parts[0]) ?? 10 : 10;
    final curMin = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;

    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: curHour, minute: curMin),
    );
    if (picked != null) {
      final formatted =
          '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      setState(() => _timeController.text = formatted);
    }
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final date = _dateController.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'Please enter an activity title.');
      await AppHaptics.selection();
      return;
    }
    if (date.isEmpty) {
      setState(() => _error = 'Please select a date.');
      await AppHaptics.selection();
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final notifier = ref.read(tripItineraryProvider(widget.tripId).notifier);
      final time = _timeController.text.trim();
      final location = _locationController.text.trim();
      final notes = _notesController.text.trim();

      if (widget.initialItem != null) {
        await notifier.update(
          widget.initialItem!.id,
          title: title,
          date: date,
          time: time.isNotEmpty ? time : null,
          category: _selectedCategory,
          location: location.isNotEmpty ? location : null,
          notes: notes.isNotEmpty ? notes : null,
        );
      } else {
        await notifier.add(
          title: title,
          date: date,
          time: time.isNotEmpty ? time : null,
          category: _selectedCategory,
          location: location.isNotEmpty ? location : null,
          notes: notes.isNotEmpty ? notes : null,
        );
      }
      await AppHaptics.medium();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _busy = false;
        _error = 'Failed to save: $e';
      });
    }
  }

  Future<void> _delete() async {
    if (widget.initialItem == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(tripItineraryProvider(widget.tripId).notifier).delete(widget.initialItem!.id);
      await AppHaptics.light();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _busy = false;
        _error = 'Failed to delete: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: tokens.colorDanger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(tokens.radiusSm),
                border: Border.all(color: tokens.colorDanger.withValues(alpha: 0.3)),
              ),
              child: Text(
                _error!,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: tokens.colorDanger),
              ),
            ),
            const SizedBox(height: 12),
          ],

          AppTextField(
            controller: _titleController,
            label: 'Activity title',
            hint: 'e.g. Colosseum Tour, Dinner at Trastevere',
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: _busy ? null : _pickDate,
                  borderRadius: BorderRadius.circular(tokens.radiusSm),
                  child: IgnorePointer(
                    child: AppTextField(
                      controller: _dateController,
                      label: 'Date',
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: _busy ? null : _pickTime,
                  borderRadius: BorderRadius.circular(tokens.radiusSm),
                  child: IgnorePointer(
                    child: AppTextField(
                      controller: _timeController,
                      label: 'Time (optional)',
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Text(
            'CATEGORY',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: tokens.textMuted, letterSpacing: 0.4),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              for (final cat in _categories)
                ChoiceChip(
                  label: Text(cat.$2, style: const TextStyle(fontSize: 12)),
                  selected: _selectedCategory == cat.$1,
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedCategory = cat.$1);
                  },
                ),
            ],
          ),
          const SizedBox(height: 12),

          AppTextField(
            controller: _locationController,
            label: 'Location / Venue',
            hint: 'Address or landmark for Directions',
            prefixIcon: const Icon(AppIcons.location, size: 18),
          ),
          const SizedBox(height: 12),

          AppTextField(
            controller: _notesController,
            label: 'Notes & reservations',
            hint: 'Booking numbers, dress code, instructions...',
            maxLines: 2,
          ),
          const SizedBox(height: 18),

          Row(
            children: [
              if (widget.initialItem != null) ...[
                TextButton(
                  onPressed: _busy ? null : _delete,
                  style: TextButton.styleFrom(foregroundColor: tokens.colorDanger),
                  child: const Text('Delete'),
                ),
                const Spacer(),
              ],
              TextButton(
                onPressed: _busy ? null : () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 8),
              AppButton(
                label: widget.initialItem != null ? 'Update' : 'Add to Day',
                isLoading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
