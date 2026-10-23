import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'cached_photo.dart';

/// A destination cover: the trip photo when there is one, else a teal-to-sunrise gradient, with a bottom
/// scrim so white [child] text stays readable on either.
class CompassCover extends StatelessWidget {
  const CompassCover({this.photoUrl, this.height = 132, this.radius = 24, this.child, super.key});

  final String? photoUrl;
  final double height;
  final double radius;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final t = context.tokens;
    final url = photoUrl;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [t.primaryAccent, const Color(0xFFF2602B)],
                ),
              ),
            ),
            if (url != null && url.isNotEmpty)
              Image(
                image: cachedPhotoSized(context, url, logicalWidth: MediaQuery.sizeOf(context).width),
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x0D000000), Color(0x9E000000)],
                ),
              ),
            ),
            if (child != null) Padding(padding: const EdgeInsets.all(14), child: child),
          ],
        ),
      ),
    );
  }
}
