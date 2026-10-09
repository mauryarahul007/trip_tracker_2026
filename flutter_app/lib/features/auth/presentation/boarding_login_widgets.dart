import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/env/app_env.dart';
import '../../../data/providers.dart';
import '../../../domain/logic/flag_defaults.g.dart';
import '../../../l10n/l10n_ext.dart';
import '../../../shared/theme/app_typography.dart';
import '../../trips/application/trips_providers.dart';

/// Whether the login shows the boarding-gate design. It follows the staged `boardingPassLogin` flag; development
/// and staging builds always show it so it can be reviewed before a superadmin arms the flag for everyone.
final boardingLoginProvider = Provider<bool>((ref) {
  if (!AppEnv.current.isProd) return true;
  return ref.watch(flagProvider(('boardingPassLogin', null))).value ??
      (defaultFeatureFlags['boardingPassLogin'] ?? false);
});

/// Places the login rotates through (a different one each day). Looked up from Wikipedia like trip covers.
const boardingPlaces = ['Goa', 'Maldives', 'Santorini', 'Bali', 'Swiss Alps', 'Kyoto'];

/// The day's photo for the login: today's place first, then the others until one has a picture. Null offline.
final boardingPhotoProvider = FutureProvider<String?>((ref) async {
  final resolve = ref.watch(tripCoverResolverProvider);
  final start = DateTime.now().day % boardingPlaces.length;
  for (var i = 0; i < boardingPlaces.length; i++) {
    final url = await resolve(boardingPlaces[(start + i) % boardingPlaces.length]);
    if (url != null) return url;
  }
  return null;
});

const boardingSheet = Color(0xFF070A10);

/// Full-screen destination photo under a deep navy wash; a calm gradient until (or without) a photo.
class BoardingBackdrop extends ConsumerWidget {
  const BoardingBackdrop({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final url = ref.watch(boardingPhotoProvider).value;
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF1C5A73), Color(0xFF123A57), Color(0xFF0A1827)],
            ),
          ),
        ),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 700),
          child: url == null
              ? const SizedBox.expand(key: ValueKey('no-photo'))
              : Image.network(
                  url,
                  key: const Key('boarding-photo'),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
        ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.45, 1],
              colors: [Color(0x80050B14), Color(0x40050B14), Color(0xF2070A10)],
            ),
          ),
        ),
      ],
    );
  }
}

/// The torn ticket edge on top of the dark sheet: a row of semicircular bites.
class ScallopEdge extends StatelessWidget {
  const ScallopEdge({super.key, this.radius = 7, this.color = boardingSheet});

  final double radius;
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: radius + 2,
    width: double.infinity,
    child: CustomPaint(painter: _ScallopPainter(radius, color)),
  );
}

class _ScallopPainter extends CustomPainter {
  const _ScallopPainter(this.r, this.color);

  final double r;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    canvas.drawRect(Rect.fromLTWH(0, r, size.width, size.height - r), paint);
    final n = (size.width / (r * 2.6)).floor();
    final step = size.width / n;
    for (var i = 0; i < n; i++) {
      canvas.drawCircle(Offset(step * (i + 0.5), r + 1), r, paint);
    }
  }

  @override
  bool shouldRepaint(_ScallopPainter old) => old.r != r || old.color != color;
}

/// A four-colour "G" for the Google button (no brand asset is bundled).
class GoogleGlyph extends StatelessWidget {
  const GoogleGlyph({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) => ShaderMask(
    blendMode: BlendMode.srcIn,
    shaderCallback: (rect) => const SweepGradient(
      center: Alignment.center,
      startAngle: -0.4,
      endAngle: 5.9,
      colors: [Color(0xFF4285F4), Color(0xFF34A853), Color(0xFFFBBC05), Color(0xFFEA4335), Color(0xFF4285F4)],
      stops: [0, 0.3, 0.5, 0.78, 1],
    ).createShader(rect),
    child: Text(
      'G',
      style: TextStyle(
        fontFamily: AppTypography.fontTitle,
        fontSize: size,
        fontWeight: FontWeight.w800,
        height: 1,
        color: Colors.white,
      ),
    ),
  );
}

/// "GATE CODE · • • • • • • · 6 DIGITS" input with its Join button; Join lights up at six characters.
class GateCodeField extends StatelessWidget {
  const GateCodeField({required this.controller, required this.onJoin, required this.onChanged, super.key});

  final TextEditingController controller;
  final ValueChanged<String> onJoin;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final ready = controller.text.trim().length == 6;
    const amber = Color(0xFFE08A2E);
    // A fixed-height control: its text may grow with the system setting, but only so far.
    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: 1.25,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(color: const Color(0xFF0F1622), borderRadius: BorderRadius.circular(13)),
                child: Row(
                  children: [
                    Text(
                      context.l10n.loginGateCode.toUpperCase(),
                      style: const TextStyle(
                        fontFamily: AppTypography.fontMono,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: Colors.white54,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        key: const Key('gate-code'),
                        controller: controller,
                        onChanged: onChanged,
                        onSubmitted: onJoin,
                        textInputAction: TextInputAction.go,
                        textCapitalization: TextCapitalization.characters,
                        maxLength: 6,
                        cursorColor: Colors.white,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontMono,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 4,
                          color: Colors.white,
                        ),
                        decoration: const InputDecoration(
                          counterText: '',
                          isDense: true,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          hintText: '• • • • • •',
                          hintStyle: TextStyle(color: Colors.white24, letterSpacing: 2),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                    // No room for the "6 DIGITS" hint on narrow phones; the dots already say it.
                    if (!ready && MediaQuery.sizeOf(context).width >= 400)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(6)),
                        child: Text(
                          context.l10n.loginSixDigits.toUpperCase(),
                          style: const TextStyle(
                            fontFamily: AppTypography.fontMono,
                            fontSize: 10,
                            color: Colors.white38,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              height: 50,
              child: FilledButton(
                key: const Key('gate-join'),
                style: FilledButton.styleFrom(
                  backgroundColor: amber,
                  disabledBackgroundColor: amber.withValues(alpha: 0.32),
                  foregroundColor: Colors.white,
                  disabledForegroundColor: Colors.white38,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                  padding: const EdgeInsets.symmetric(horizontal: 22),
                ),
                onPressed: ready ? () => onJoin(controller.text) : null,
                child: Text(context.l10n.loginJoin, style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
