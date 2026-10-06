import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/platform/haptics.dart';
import '../../../shared/theme/app_icons.dart';
import '../../../shared/theme/app_tokens.dart';
import '../places/weather_service.dart';

/// Ambient Destination Weather Badge.
/// Displays live temperature, condition emoji, and allows quick refresh.
/// Parity with web `BoardingPassHeroCard` weather strip and `ChecklistNotesTab` weather badge.
class WeatherBadge extends ConsumerStatefulWidget {
  final dynamic destination;
  final bool compact;

  const WeatherBadge({
    super.key,
    required this.destination,
    this.compact = false,
  });

  @override
  ConsumerState<WeatherBadge> createState() => _WeatherBadgeState();
}

class _WeatherBadgeState extends ConsumerState<WeatherBadge> with SingleTickerProviderStateMixin {
  WeatherData? _weather;
  bool _isLoading = false;
  late final AnimationController _spinController;

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _loadWeather();
  }

  @override
  void didUpdateWidget(covariant WeatherBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.destination != widget.destination) {
      _loadWeather();
    }
  }

  @override
  void dispose() {
    _spinController.dispose();
    super.dispose();
  }

  Future<void> _loadWeather({bool forceRefresh = false}) async {
    if (widget.destination == null) return;
    if (widget.destination is String && (widget.destination as String).trim().isEmpty) return;

    if (forceRefresh) {
      _spinController.repeat();
      setState(() => _isLoading = true);
    }

    try {
      final service = ref.read(weatherServiceProvider);
      final data = await service.getDestinationWeather(
        widget.destination,
        forceRefresh: forceRefresh,
        onLiveUpdate: (fresh) {
          if (mounted) {
            setState(() {
              _weather = fresh;
              _isLoading = false;
            });
          }
        },
      );
      if (mounted) {
        setState(() {
          _weather = data;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    } finally {
      if (mounted && _spinController.isAnimating) {
        _spinController.stop();
        _spinController.reset();
      }
    }
  }

  Future<void> _handleRefresh() async {
    unawaited(AppHaptics.selection());
    await _loadWeather(forceRefresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final weather = _weather;

    if (weather == null && !_isLoading) {
      return const SizedBox.shrink();
    }

    if (widget.compact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: tokens.bgSurfaceHover,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: tokens.borderColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              weather?.weatherEmoji ?? '⛅',
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(width: 4),
            Text(
              weather != null ? '${weather.tempC}°C' : '...',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: tokens.textPrimary,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      key: const Key('weather_badge_card'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tokens.bgSurfaceHover,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tokens.borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            weather?.weatherEmoji ?? '⛅',
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(width: 6),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                weather != null ? '${weather.tempC}°C · ${weather.condition}' : 'Checking weather...',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: tokens.textPrimary,
                ),
              ),
              if (weather != null && weather.city.isNotEmpty)
                Text(
                  weather.city,
                  style: TextStyle(
                    fontSize: 10,
                    color: tokens.textMuted,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 6),
          InkWell(
            key: const Key('btn_refresh_weather'),
            onTap: _isLoading ? null : _handleRefresh,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: RotationTransition(
                turns: _spinController,
                child: Icon(
                  AppIcons.sync,
                  size: 14,
                  color: tokens.primaryAccent,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
