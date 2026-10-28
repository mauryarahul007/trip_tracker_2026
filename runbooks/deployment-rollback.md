# Incident: Failed Deployment / Need to Roll Back

## Purpose
Revert to a known-good state after a bad deploy to any of this project's three release surfaces: GitHub Pages, EC2, or the Capacitor native live-update channel.

## Impact
Varies by target — a bad EC2 or Pages deploy affects all web users immediately; a bad native live-update bundle affects installed iOS/Android app users on next launch.

## Severity
P0 (broken production build actively serving to users) or P1 (bad build caught before wide impact).

## Symptoms
- New errors/blank screens reported immediately after a push to `main` or a manual workflow run.
- `npm run build` (which runs `tsc -b && vite build && node scripts/stampServiceWorker.mjs`) succeeded in CI but the resulting app misbehaves at runtime — a build-time-invisible regression.

## Immediate Actions
1. Identify which surface(s) are affected: web (Pages/EC2) and/or native (live-update). They deploy independently via separate workflows/scripts.
2. Stop further pushes to `main` from landing on top of the bad state until a fix or revert is ready.

## Diagnosis
- Find the commit that introduced the regression via `git log` on `main` and correlate with the failing GitHub Actions run (`ci.yml`, `deploy-ec2.yml`, `deploy-pages.yml`) timestamp.
- Confirm whether `ci.yml` (lint + build + test) actually passed for that commit — a regression that passed CI indicates a gap in test coverage worth closing afterward, not a process failure to route around right now.

## Recovery

### GitHub Pages
No verified rollback mechanism found beyond reverting the source. Revert the offending commit (`git revert <sha>`) and push to `main` — `deploy-pages.yml` runs automatically on push and redeploys from the new HEAD.

### EC2
No verified rollback mechanism found beyond redeploying from a known-good commit. Because `deploy-ec2.yml`'s rsync step uses `--delete` against `/var/www/trip-tracker-2026/dist/`, rolling back means: revert the offending commit on `main`, then either let the automatic push-triggered deploy run or manually trigger `workflow_dispatch` for "Deploy to EC2" — this rebuilds `dist/` from the reverted source and re-syncs it wholesale (safe: `--delete` makes the served tree match the new build exactly, not a partial patch).

### Native live-update bundle (Capacitor / `@capgo/capacitor-updater`)
The `deploy-ec2.yml` workflow packages every EC2 deploy as a live-update bundle (`scripts/package-update.sh "${GITHUB_SHA::7}" https://trip-tracker.blackmaroon.in/updates update dist`), producing a checksummed zip + `latest.json` manifest served from `/var/www/trip-tracker-2026/dist/updates/`. Installed apps pull updates via `src/utils/liveUpdate.ts`. Because a new EC2 deploy overwrites `latest.json` with the new version pointer, the practical rollback is the same action as the EC2 rollback above: revert the commit and let/trigger a fresh EC2 deploy, which republishes `latest.json` pointing at the reverted build's checksum. NOT VERIFIED whether `@capgo/capacitor-updater` has a client-side mechanism to reject/pin a specific bundle version independent of what `latest.json` currently points to — treat this as the human-approval-required path if the live-update bundle itself (not just the web build) is suspected as the regression source, since it affects installed apps outside the web deploy pipeline's normal blast radius.

## Validation
- Confirm the reverted commit is deployed: check the workflow run succeeded and reload the affected surface(s) in an incognito window.
- For native: confirm `latest.json` at `https://trip-tracker.blackmaroon.in/updates/latest.json` reflects the reverted version/checksum.

## Rollback
This runbook *is* the rollback procedure. If the revert itself introduces new problems, treat that as a new incident and repeat with a further revert — do not attempt `git reset --hard`/force-push on `main`.

## Escalation
If a bad native live-update bundle has already reached installed devices and reverting `latest.json` isn't sufficient to recover already-updated app instances, escalate to a human — this requires human approval per Phase 12 (AI safety) given the out-of-band nature of native app updates.

## Do Not
- Do not force-push or `git reset --hard` on `main` to "undo" the bad commit — use `git revert` so history stays intact and the EC2/Pages workflows see a normal new commit to build from.
- Do not manually edit files on the EC2 server or hand-edit `latest.json` outside of `scripts/package-update.sh`'s output — the checksum in `latest.json` must match the zip it points to, or client-side update verification (if any — NOT VERIFIED) may fail or worse, silently accept a mismatched bundle.
- Do not skip `ci.yml` checks (lint/build/test) when landing the revert.

## Root Cause Follow-Up
- Add a test covering the regression to `npm test` (Vitest) before considering the incident closed.
- If the bad build passed CI, evaluate whether `ci.yml` needs a broader check for this class of bug.
