import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../domain/logic/place_suggest.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../../../shared/widgets/app_text_field.dart';

/// Seam so tests can fake the Photon lookup.
typedef OnlinePlaces = Future<List<PlaceSuggestion>> Function(String query);

/// Destination input with suggestions while typing and a "did you mean" fix
/// (enableDestinationAutocomplete). With [enabled] false it is a plain field.
class DestinationField extends StatefulWidget {
  const DestinationField({
    required this.controller,
    required this.label,
    required this.onChanged,
    this.enabled = true,
    this.pastDestinations = const [],
    this.onPicked,
    this.online = onlineSuggestions,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final bool enabled;
  final List<String> pastDestinations;
  final ValueChanged<String> onChanged;

  /// Set when the value came from a suggestion or a "did you mean" fix.
  final ValueChanged<PlaceSuggestion>? onPicked;
  final OnlinePlaces online;

  @override
  State<DestinationField> createState() => _DestinationFieldState();
}

class _DestinationFieldState extends State<DestinationField> {
  List<PlaceSuggestion> _suggestions = const [];
  List<PlaceFix> _fixes = const [];
  Timer? _timer;
  int _seq = 0;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _changed(String text) {
    widget.onChanged(text);
    if (!widget.enabled) return;
    _timer?.cancel();
    final part = currentPart(text).part;
    if (part.length < 2) {
      setState(() {
        _suggestions = const [];
        _fixes = const [];
      });
      return;
    }
    final local = localSuggestions(part, pastDestinations: widget.pastDestinations);
    setState(() {
      _suggestions = local;
      _fixes = findPlaceFixes(text, candidates: local);
    });
    // Debounced so the geocoder sees one request per pause, not per key.
    final seq = ++_seq;
    _timer = Timer(const Duration(milliseconds: 350), () async {
      if (part.length < 3) return;
      final online = await widget.online(part);
      if (!mounted || seq != _seq || online.isEmpty) return;
      setState(() {
        _suggestions = mergeSuggestions(local, online);
        _fixes = findPlaceFixes(widget.controller.text, candidates: _suggestions);
      });
    });
  }

  void _set(String text) {
    widget.controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
    widget.onChanged(text);
  }

  void _pick(PlaceSuggestion s) {
    final prefix = currentPart(widget.controller.text).prefix;
    _set(prefix + s.name);
    setState(() {
      _suggestions = const [];
      _fixes = const [];
    });
    widget.onPicked?.call(s);
  }

  void _applyFixes() {
    final fixes = _fixes;
    _set(applyPlaceFixes(widget.controller.text, fixes));
    setState(() {
      _suggestions = const [];
      _fixes = const [];
    });
    if (fixes.isNotEmpty) widget.onPicked?.call(fixes.last.suggestion);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppTextField(
          controller: widget.controller,
          label: widget.label,
          onChanged: _changed,
          textInputAction: TextInputAction.next,
          prefixIcon: const Icon(Icons.place_outlined),
        ),
        if (_fixes.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: ActionChip(
              key: const Key('destination-fix'),
              avatar: const Icon(Icons.auto_fix_high_rounded, size: 16),
              label: Text('Did you mean ${_fixes.map((f) => f.suggestion.name).join(', ')}?'),
              onPressed: _applyFixes,
            ),
          ),
        if (_suggestions.isNotEmpty)
          Container(
            key: const Key('destination-suggestions'),
            margin: const EdgeInsets.only(top: 8),
            decoration: t.cardDecoration(),
            clipBehavior: Clip.antiAlias,
            child: Material(
              type: MaterialType.transparency,
              child: Column(
                children: [
                  for (final s in _suggestions)
                    ListTile(
                      key: Key('destination-option-${s.name}'),
                      dense: true,
                      leading: Icon(Icons.place_rounded, size: 20, color: t.primaryAccent),
                      title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: s.detail.isEmpty ? null : Text(s.detail),
                      onTap: () => _pick(s),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
