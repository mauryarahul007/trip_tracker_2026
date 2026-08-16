import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CACHE_NAME_PATTERN = /const CACHE_NAME = '([^']*)';/;

export function stampCacheName(source, buildId) {
  const match = source.match(CACHE_NAME_PATTERN);
  if (!match) {
    throw new Error('CACHE_NAME declaration not found in service worker source');
  }
  const [prefix] = match[1].split('-cache-');
  return source.replace(CACHE_NAME_PATTERN, `const CACHE_NAME = '${prefix}-cache-${buildId}';`);
}

function main() {
  const swPath = new URL('../dist/sw.js', import.meta.url);
  const source = readFileSync(swPath, 'utf8');
  const buildId = Date.now().toString(36);
  writeFileSync(swPath, stampCacheName(source, buildId));
  console.log(`Stamped dist/sw.js with build id ${buildId}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
