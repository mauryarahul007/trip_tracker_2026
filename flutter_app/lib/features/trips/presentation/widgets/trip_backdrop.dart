import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../domain/models/trip.dart';
import '../../../../shared/theme/app_tokens.dart';
import '../../application/trips_providers.dart';

/// The top trip's photo, blurred, behind the card stack. Cross-fades when the top card changes; with no photo it
/// is just the page colour.
class TripBackdrop extends ConsumerWidget {
  const TripBackdrop({required this.trip, super.key});

  final Trip? trip;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.tokens;
    final url = trip == null ? null : ref.watch(tripCoverProvider(tripCoverKey(trip!))).value;
    return Stack(
      fit: StackFit.expand,
      children: [
        ColoredBox(color: t.bgPage),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 450),
          child: url == null || url.isEmpty
              ? const SizedBox.expand(key: ValueKey('no-photo'))
              : ImageFiltered(
                  key: ValueKey(url),
                  imageFilter: ImageFilter.blur(sigmaX: 28, sigmaY: 28, tileMode: TileMode.mirror),
                  child: Image.network(
                    url,
                    key: const Key('stack-backdrop-photo'),
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: double.infinity,
                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),
        ),
        // Keeps text and chips legible whatever the photo: the page colour, mostly see-through at the top.
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                t.bgPage.withValues(alpha: 0.55),
                t.bgPage.withValues(alpha: 0.25),
                t.bgPage.withValues(alpha: 0.6),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
