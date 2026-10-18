import 'dart:ui' as ui;

import 'package:flutter/painting.dart' show Color;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/logic/accent_color.dart';
import '../../../shared/widgets/cached_photo.dart';
import '../../trip_details/application/trip_nav.dart' show tripProvider;
import 'trips_providers.dart';

/// A dark, readable accent taken from the trip's cover photo (the same photo the tiles show), or null when the trip
/// has no photo or the photo has no usable colour. Cosmetic only; a failure just means the standard colour.
final tripAccentProvider = FutureProvider.family<Color?, String>((ref, tripId) async {
  final trip = ref.watch(tripProvider(tripId)).value;
  if (trip == null) return null;
  final url = await ref.watch(tripCoverProvider(tripCoverKey(trip)).future);
  if (url == null || url.isEmpty) return null;
  try {
    final bytes = await PhotoCache.instance.bytes(url);
    final codec = await ui.instantiateImageCodec(bytes, targetWidth: 24, targetHeight: 24);
    final image = (await codec.getNextFrame()).image;
    final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    image.dispose();
    if (data == null) return null;
    final argb = accentFromRgba(data.buffer.asUint8List());
    return argb == null ? null : Color(argb);
  } catch (_) {
    return null;
  }
});
