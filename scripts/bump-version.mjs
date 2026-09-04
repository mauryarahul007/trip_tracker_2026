// scripts/bump-version.mjs
// Manual release cut: `npm run release:major|minor|patch`.
// Bumps package.json's marketing version -- a deliberate, human-triggered
// action, not an every-commit auto-bump (that used to run via a post-commit
// hook and made the version climb absurdly fast, e.g. 1.106.3 after a few
// months). The build number shown alongside it (see src/utils/appVersion.ts,
// vite.config.ts) comes from `git rev-list --count HEAD` instead, so builds
// stay individually traceable without the marketing version moving on every
// commit -- the same Version/Build split Apple uses.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const bump = process.argv[2];

if (!['major', 'minor', 'patch'].includes(bump)) {
  console.error('Usage: node scripts/bump-version.mjs <major|minor|patch>');
  process.exit(1);
}

const pkgPath = join(rootDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!versionMatch) {
  console.error(`package.json version "${pkg.version}" is not a plain semver x.y.z string.`);
  process.exit(1);
}

let [, major, minor, patch] = versionMatch.map(Number);
if (bump === 'major') {
  major += 1; minor = 0; patch = 0;
} else if (bump === 'minor') {
  minor += 1; patch = 0;
} else {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version bumped: ${pkg.version} -> ${newVersion}. Commit this yourself, e.g.:\n  git commit -am "chore(release): v${newVersion}"`);
