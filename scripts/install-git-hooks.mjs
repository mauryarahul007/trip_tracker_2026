// scripts/install-git-hooks.mjs
// Points git at the repo's tracked .githooks/ dir (postinstall, so it's
// wired automatically after `npm install` — no manual setup step per clone).
import { execSync } from 'node:child_process';

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
} catch {
  // not a git repo (e.g. installing from a tarball) — nothing to wire up
}
