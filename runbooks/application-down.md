# Incident: Application Down (site unreachable / blank page for all users)

## Purpose
Recover when the deployed web app (GitHub Pages or EC2/nginx) fails to load for users — distinct from [Supabase/database unavailable](supabase-database-unavailable.md), where the app loads but data operations fail.

## Impact
All users on the affected deployment target cannot open the app at all (not just "some feature broken").

## Severity
P0

## Symptoms
- `https://trip-tracker.blackmaroon.in` (EC2) or the GitHub Pages URL returns a connection error, 5xx, or blank/broken page.
- Browser console shows failed requests for `index.html` or the hashed JS/CSS bundle.
- Note: repeat visitors have a service worker (`public/sw.js`, stale-while-revalidate — see `docs/explanation-offline-caching.md`) that serves the previously cached shell even if the origin is down, so this is more likely to be caught by new/incognito visitors first.

## Immediate Actions
1. Confirm scope: try the URL in an incognito window (bypasses local service-worker cache) and from a second network.
2. Check which deployment target is affected — this project ships to both **GitHub Pages** (`.github/workflows/deploy-pages.yml`, subpath) and **EC2 via nginx** (`.github/workflows/deploy-ec2.yml`, domain root at `trip-tracker.blackmaroon.in`). They are independent; one can be down while the other is fine.
3. Check the most recent run of the relevant GitHub Actions workflow (`ci.yml` gates `main`; `deploy-ec2.yml` / `deploy-pages.yml` run on push to `main`) for failure.

## Diagnosis
- **GitHub Pages target**: check the "Deploy to GitHub Pages" workflow run status in the repo's Actions tab. A failed `npm run build` or `actions/deploy-pages` step blocks the update — worth checking whether the *previous* successful deployment is still serving (Pages doesn't roll back automatically, but a broken build simply never gets deployed on top of it).
- **EC2 target**: check the "Deploy to EC2" workflow run. Steps that can fail: `npm run build` (needs `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` secrets), SSH key install, host key trust, or the `rsync --delete` to `/var/www/trip-tracker-2026/dist/`. A failed rsync mid-transfer combined with `--delete` is the main risk of a partially-broken deployed tree — NOT VERIFIED whether nginx serves a fully consistent tree during an interrupted rsync.
- If the workflow succeeded but the site is still down: the failure is likely on the EC2 host itself (nginx not running, disk full, DNS) — NOT VERIFIED, no runbook-documented SSH diagnostic path exists in this repo; server access is outside what's captured here.

## Recovery
- **GitHub Pages**: re-run the failed workflow from the Actions tab, or push a fix to `main` (deploy workflow triggers automatically on push).
- **EC2**: re-run the "Deploy to EC2" workflow (`workflow_dispatch` is enabled — it can be triggered manually without a new commit).
- If a specific commit broke the build, see [Deployment Rollback](deployment-rollback.md).

## Validation
- Load the site in an incognito window and confirm the app shell renders and a trip/login screen appears.
- Confirm `npm run build` succeeded in the latest workflow run logs.

## Rollback
See [Deployment Rollback](deployment-rollback.md) for reverting to the last known-good commit on either target.

## Escalation
If both re-running the workflow and rolling back the commit fail to restore service, or the EC2 host itself appears unreachable (SSH failures, DNS issues) — escalate to a human with EC2/DNS access. This repo does not document EC2 host-level administration.

## Do Not
- Do not force-push to `main` to "retry" a deploy — re-run the existing workflow instead (avoids rewriting shared history).
- Do not manually edit files on the EC2 server outside of the deploy pipeline — the next `rsync --delete` will silently wipe manual changes.
- Do not rotate `EC2_SSH_KEY`, `VITE_SUPABASE_*`, or other secrets as a first response — only if credential compromise is separately confirmed.

## Root Cause Follow-Up
- If the cause was a bad build reaching `main`, confirm `ci.yml` (lint + build + test) actually ran and passed on that commit before it merged.
- If the cause was an EC2-side issue (disk, nginx), that host-level fix is outside this repo's scope — track separately.
