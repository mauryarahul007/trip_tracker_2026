import { copyFileSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
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
//
// Output as .js, not .mjs: some static hosts (nginx without an .mjs mime
// type entry, seen on the EC2 deploy) serve unrecognized extensions as
// application/octet-stream, which browsers refuse to run as a module
// script -- the worker silently fails to load and the map never renders.
// .js is universally recognized, so the extension swap sidesteps that
// server config entirely instead of depending on it. The worker's own
// import of the shared module has to be rewritten to match.
const SRC_DIR = fileURLToPath(new URL('../node_modules/maplibre-gl/dist', import.meta.url));
const OUT_DIR = fileURLToPath(new URL('../public/maplibre', import.meta.url));
const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

mkdirSync(OUT_DIR, { recursive: true });
for (const file of FILES) {
  const outFile = file.replace(/\.mjs$/, '.js');
  rmSync(join(OUT_DIR, file), { force: true }); // clean up a stale .mjs from before this rename
  if (file === 'maplibre-gl-worker.mjs') {
    const contents = readFileSync(join(SRC_DIR, file), 'utf8').replace(
      './maplibre-gl-shared.mjs',
      './maplibre-gl-shared.js'
    );
    writeFileSync(join(OUT_DIR, outFile), contents);
  } else {
    copyFileSync(join(SRC_DIR, file), join(OUT_DIR, outFile));
  }
}
console.log(`Synced ${FILES.join(', ')} to public/maplibre/ (as .js)`);
