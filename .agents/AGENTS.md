# Workspace Rules & Guidelines

## Architecture Decision Records (ADRs)

- **Rule:** Whenever a meaningful code decision, library choice, design pattern, or architectural trade-off is accepted in this codebase, you must document it in `decisions.md` located at the root of the workspace.
- **Format:**
  - Context of the problem.
  - Selected decision & resolution.
  - Trade-offs accepted.

## Git Push & Commit Protocols

- **Rule 1 (Git Commit Body):** Whenever code or configuration is committed, the **git commit message body** (commit description/comments pushed to GitHub) MUST be human-readable, narrative-driven, and grouped by thematic impact (e.g. Safety, Forms & data, Notifications & UI, Layout & polish) rather than just listing raw technical filenames. It must explain *what changed from the user's perspective, how it affects behavior, and why*.
- **Sample Inspiration Format for Git Commits:**
  ```text
  fix(ux): address UX audit findings across confirmations, forms, and layout

  Safety:
  - Trip deletion now requires the app's two-tap confirm dialog before
    staging the undo-toast delete, instead of deleting immediately.
  - Replace every remaining window.confirm() (clear all data, sign out,
    seed demo data, delete category, recycle bin, clear notifications)
    with the app's own styled ConfirmDialog, threaded down via a new
    onRequestConfirm prop.

  Forms & data:
  - Drop native `required` validation on the expense form (amount, title,
    date, split amounts) in favor of the existing styled inline errors,
    which were being pre-empted by the browser's native tooltip.
  - Add a "Review N affected expenses" banner that walks through, in
    sequence, every expense still referencing a removed member.
  - Members tab now says "gets back" instead of "owed", matching Balances.
  - Notification rows no longer repeat the trip name in both the title and
    the badge — the title now shows the actual event.

  Layout & polish:
  - Header: drop the currency pill and sync dot that used to compete with
    the trip name for space when scrolled; trip name now shrinks to fit
    instead of truncating early (new FitHeading component).
  - Fix the sync-status pill's bottom edge clipping in the header stats row.
  - Fix two equal-width grids (Analytics stat cards, expense review modal)
    that were quietly skewed toward the column with wider content — 1fr
    tracks need minmax(0, 1fr) to actually split evenly.
  - Fix the pull-to-reveal-filters touch handler capturing horizontal
    swipes on the filter chip row, which intermittently blocked scrolling
    it; it now only claims gestures that are vertically dominant.
  - Filter chip row fades at both edges instead of clipping the last chip.
  - Desktop (>=900px) uses a wider column with a 2-up trip grid instead of
    a fixed 500px mobile-width column.
  - Analytics category color for Travel & Transport moved off cyan (too
    close to Stay & Hotel's blue).
  - Undo toasts truncate long titles instead of showing them in full.
  - Settings screen notes which section applies account-wide vs. per-trip.
  ```

- **Rule 2 (Response Output):** Whenever changes are pushed to GitHub, you MUST ALWAYS provide a comprehensive, granular **Summary of Changes** with clickable file links in your response.
- **Detailed Summary Requirements (Both in Git Commit Body & Response):**
  - Commit SHA, branch, and remote URL.
  - Detailed file-by-file breakdown with exact file paths and clickable links.
  - Clear narrative explanation of user-facing changes and domain impacts.
  - Verification & testing status (tests passed, lint status).

## Deployment Target Scope & Defaults

- **Default Scope:** ALL changes made in this codebase are strictly targeted for the **webapp only**.
- **Native Apps (Android & iOS) Guardrail:** Do NOT apply or deploy changes to the native Android or iOS app wrappers/builds unless and until the user explicitly specifies it.
- **Push Prompt Protocol:** On each push to GitHub, you may ask the user if they want to deploy the changes for the native mobile apps as well. Otherwise, default is strictly webapp only.

## Automated Versioning & Dev Server Reload Protocol (Mandatory)

- **Rule 1 (Automatic Version Bump):** Whenever code changes (features, bug fixes, UI overhauls, or refinements) are prepared for commit and push, you MUST automatically bump the version in `package.json` without waiting for the user to prompt or ask for it:
  - Use `npm run release:patch` (or edit `package.json`) for bug fixes, performance improvements, and iterative UI refinements.
  - Use `npm run release:minor` for notable feature additions or multi-component functional additions.
  - Use `npm run release:major` for architectural rewrites or major platform milestone cuts.
  - The user must NEVER have to manually instruct or remind the agent to upgrade the version.
- **Rule 2 (Automatic Dev Server Refresh):** Because `vite.config.ts` compiles `__APP_VERSION__` (from `package.json`) and `__BUILD_NUMBER__` (from `git rev-list --count HEAD`) at initial server boot, whenever the version is bumped, you MUST automatically restart the background Vite development server (`kill` stale task, launch new background daemon `npm run dev`). This ensures the live browser view immediately displays the fresh version and build number in Settings and header badges.
- **Rule 3 (ADR & Commit Traceability):** Record the release cut in `decisions.md` under a corresponding ADR entry and reference the version in the git commit message and response summary.




