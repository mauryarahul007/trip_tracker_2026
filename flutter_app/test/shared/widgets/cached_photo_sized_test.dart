import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:trip_tracker/shared/widgets/cached_photo.dart';

void main() {
  testWidgets('cachedPhotoSized decodes at logical width times the screen density', (tester) async {
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    late ImageProvider p;
    await tester.pumpWidget(
      Builder(
        builder: (context) {
          p = cachedPhotoSized(context, 'https://x/y.jpg', logicalWidth: 64);
          return const SizedBox();
        },
      ),
    );
    final r = p as ResizeImage;
    expect(r.width, 192);
    expect(r.imageProvider, const CachedPhotoProvider('https://x/y.jpg'));
  });
}
