import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/settings/app_settings.dart';
import '../../data/providers.dart';

const dynamicColorFlag = 'enableDynamicColor';

/// The phone's wallpaper accent (Android 12+), or null where there is none (older Android, iOS, web, tests).
final systemAccentProvider = FutureProvider<Color?>((ref) async {
  try {
    // Android 12+ exposes the wallpaper palette; getAccentColor() is the desktop equivalent.
    final palette = await DynamicColorPlugin.getCorePalette();
    if (palette == null) return null;
    return Color(palette.primary.get(40));
  } on MissingPluginException {
    return null;
  } on PlatformException {
    return null;
  }
});

/// The accent to tint the app with: the wallpaper colour when the Superadmin flag, the user's Settings switch and the
/// phone all allow it, otherwise null (the Calm Passport teal).
final dynamicAccentProvider = Provider<Color?>((ref) {
  final flag = ref.watch(flagProvider((dynamicColorFlag, null))).value ?? true;
  if (!flag || !ref.watch(dynamicColorPrefProvider)) return null;
  return ref.watch(systemAccentProvider).value;
});
