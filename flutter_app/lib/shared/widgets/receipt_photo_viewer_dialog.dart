import 'dart:io';

import 'package:flutter/material.dart';

import 'cached_photo.dart';

/// Shows an interactive, full-screen image viewer with pinch-to-zoom, pan,
/// dark backdrop, title/subtitle header, and a prominent close button.
/// Supports both local file paths and remote URLs.
Future<void> showReceiptPhotoViewer(
  BuildContext context, {
  required String previewPath,
  String? title,
  String? subtitle,
  Widget? actionButton,
  Key? key,
}) {
  return showDialog<void>(
    context: context,
    barrierColor: Colors.black,
    builder: (ctx) => ReceiptPhotoViewerDialog(
      previewPath: previewPath,
      title: title,
      subtitle: subtitle,
      actionButton: actionButton,
      key: key ?? const Key('receipt-photo-viewer'),
    ),
  );
}

class ReceiptPhotoViewerDialog extends StatelessWidget {
  const ReceiptPhotoViewerDialog({required this.previewPath, this.title, this.subtitle, this.actionButton, super.key});

  final String previewPath;
  final String? title;
  final String? subtitle;
  final Widget? actionButton;

  Widget _buildImage(BuildContext context) {
    final clean = previewPath.replaceFirst('file://', '');
    final isNet = clean.startsWith('http://') || clean.startsWith('https://');

    if (isNet) {
      return Image(
        image: CachedPhotoProvider(clean),
        key: const Key('receipt-large'),
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _errorPlaceholder(context),
      );
    }

    final file = File(clean);
    if (file.existsSync()) {
      return Image.file(
        file,
        key: const Key('receipt-large'),
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _errorPlaceholder(context),
      );
    }

    return _errorPlaceholder(context);
  }

  Widget _errorPlaceholder(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.broken_image_outlined, color: Colors.white54, size: 48),
          SizedBox(height: 12),
          Text('Unable to load receipt photo', style: TextStyle(color: Colors.white70, fontSize: 14)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog.fullscreen(
      backgroundColor: Colors.black,
      child: Stack(
        children: [
          Positioned.fill(
            child: InteractiveViewer(minScale: 0.8, maxScale: 5.0, child: Center(child: _buildImage(context))),
          ),
          // Top bar with gradient backdrop for contrast
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black87, Colors.transparent],
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      IconButton(
                        key: const Key('receipt-photo-close'),
                        tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
                        color: Colors.white,
                        icon: const Icon(Icons.close_rounded, size: 28),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (title != null && title!.isNotEmpty)
                              Text(
                                title!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                              ),
                            if (subtitle != null && subtitle!.isNotEmpty)
                              Text(
                                subtitle!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (actionButton != null)
            SafeArea(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(padding: const EdgeInsets.all(16), child: actionButton!),
              ),
            ),
        ],
      ),
    );
  }
}
