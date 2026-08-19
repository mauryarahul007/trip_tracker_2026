import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// maplibre-gl-worker.mjs imports "./maplibre-gl-shared.mjs" via a bare
// relative path, so the two files must sit next to each other with their
// original names wherever they're served from. Vite's `?url` asset
// pipeline copies a single file as an opaque, content-hashed blob without
// touching (or preserving the sibling of) any imports inside it, which
// breaks that relationship. Copying both files verbatim into public/ —
// served as-is, unhashed, un-transformed — keeps the relative import
// resolvable. Runs on every install/build so it stays in sync with
// whatever maplibre-gl version is actually installed.
const SRC_DIR = fileURLToPath(new URL('../node_modules/maplibre-gl/dist', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../public/maplibre', import.meta.url));
const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

mkdirSync(OUT_DIR, { recursive: true });
for (const file of FILES) {
  copyFileSync(join(SRC_DIR, file), join(OUT_DIR, file));
}
console.log(`Synced ${FILES.join(', ')} to public/maplibre/`);
