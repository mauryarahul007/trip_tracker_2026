// scripts/bump-version.mjs
// Runs as the post-commit git hook. Reads the commit that was just made,
// infers a semver bump from its conventional-commit type, bumps
// package.json, and folds the change into that same commit via
// `commit --amend` — no manual "bump version" step, no extra commit.
//
// Runs post-commit (not prepare-commit-msg) because staging package.json
// mid-commit races git's own index write; amending after the commit exists
// is the reliable way to fold the bump in.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const parentCount = execSync('git rev-list --parents -n1 HEAD', { cwd: rootDir })
  .toString()
  .trim()
  .split(' ').length - 1;
if (parentCount > 1) {
  process.exit(0); // merge commit — nothing to bump
}

const subjectLine = execSync('git log -1 --pretty=%s', { cwd: rootDir }).toString().trim();
const fullMessage = execSync('git log -1 --pretty=%B', { cwd: rootDir }).toString();

const match = subjectLine.match(/^(\w+)(\([^)]*\))?(!)?:\s*.+/);
const type = match ? match[1].toLowerCase() : null;
const hasBangBreaking = match ? Boolean(match[3]) : false;
const hasBreakingFooter = /BREAKING CHANGE/.test(fullMessage);

let bump;
if (hasBangBreaking || hasBreakingFooter || type === 'major' || type === 'phase') {
  bump = 'major';
} else if (type === 'feat') {
  bump = 'minor';
} else {
  // fix, refactor, docs, test, chore, perf, ci, style, or unrecognized -> patch
  bump = 'patch';
}

const pkgPath = join(rootDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);

if (!versionMatch) {
  console.error(`[bump-version] package.json version "${pkg.version}" is not a plain semver x.y.z string, skipping bump.`);
  process.exit(0);
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
execSync('git add package.json', { cwd: rootDir });
execSync('git commit --amend --no-edit --no-verify', {
  cwd: rootDir,
  env: { ...process.env, SKIP_VERSION_BUMP: '1' },
});

console.log(`[bump-version] ${bump} bump -> ${newVersion}`);
