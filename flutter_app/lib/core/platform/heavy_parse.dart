import 'package:flutter/foundation.dart';

/// Files bigger than this are parsed on a background isolate so a 10 MB backup or a long Splitwise export does not
/// freeze a frame (B-192). Smaller files stay on the UI isolate: spawning costs more than the parse, and widget
/// tests (fake async) keep running synchronously.
const heavyParseThreshold = 256 * 1024;

/// Runs [parse] on [text], off the UI isolate when the text is large. [parse] must be a top-level or static function.
Future<R> parseText<R>(R Function(String) parse, String text) =>
    text.length >= heavyParseThreshold ? compute(parse, text) : Future.value(parse(text));
