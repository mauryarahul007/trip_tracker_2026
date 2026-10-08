// Picks the Drift executor per platform: native SQLite file on mobile/desktop,
// WebAssembly SQLite (IndexedDB/OPFS) in the browser.
export 'connection_native.dart' if (dart.library.js_interop) 'connection_web.dart';
