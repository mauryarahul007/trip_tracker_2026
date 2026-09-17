## Strict Git Push Prohibition (Mandatory, no exceptions)

Until the user says explicitly to "commit and push" (or commands a push directly), NEVER commit or push any changes to GitHub or to any repository. All modifications, builds, tests, and verifications must remain strictly local until explicit user instruction.

## Plan before code (mandatory, no exceptions)

For any coding task (feature, fix, refactor), post short implementation plan
before editing files: what changes, which files, why, risks/assumptions.
Wait for user go-ahead unless user already said "just do it" / gave explicit
approval upfront in same message. Trivial one-line/typo fixes exempt.

## AI engineering procedure

Follow the compact always-on rule in `.cursor/rules/ai-software-engineering.mdc`. Detailed phase docs (understand, smallest change, implement, debug, verify, output) live in `docs/ai-engineering/`. Open only the phase that is active; index: `docs/ai-engineering/README.md`.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Bug/feature logging before push (mandatory, no exceptions)

Before running `git push` for ANY change in this repo, stop and ask the
user whether the change being pushed should be logged as a bug fix or a
feature, and where:
- Bug fix → log in the bug tracker (`bugs/bugs.json` + `BUGS.md`, matching
  the existing schema/format) as resolved, with a resolutionNote and the
  commit hash.
- Feature → log in the Superadmin portal's feature tracking (find the
  relevant admin table/mechanism under `src/components/admin/` or its
  Supabase migrations; do not assume `bugs/bugs.json` applies to features).

Do this on every push, not just when explicitly asked — this is a standing
instruction, not a one-off. If genuinely unsure which category a change
falls into, ask the user rather than guessing. Never push before this
question is asked and answered.

## New features must be flag-gated and phase-classified (mandatory, no exceptions)

Every new customer-facing feature added to this app must ship behind a
Superadmin Ops Deck feature flag, default OFF, with no code path reachable
outside that flag. Register it in both `src/types/admin.ts`
(`FeatureFlagKey` union) and `src/utils/featureFlags.ts`
(`FEATURE_FLAGS_META` entry + `DEFAULT_FEATURE_FLAGS` default + a
`RELEASE_PHASES` `flagKeys` entry). Assign it to the release phase that
thematically fits (Phase 1 Core, Phase 2 Collab, Phase 3 Travel/Geo, Phase
4 FinTech/Security, Phase 5 Switch/Speed/Trust) rather than dumping it in
"Deferred" — Deferred is for genuinely out-of-scope/shelved work, not new
shipped features. Bump the hardcoded flag-count assertion in
`src/utils/featureFlags.test.ts` to match. The Ops Deck's Flags/Release
Phases pages are fully data-driven off this registry — no other wiring
needed for a flag to appear there.

## Feature manual test steps (mandatory, no exceptions)

Every customer-facing feature or UX fix that needs manual QA must append
detailed test steps to `docs/FEATURE_TEST_STEPS.md` (same PR/commit when
practical). Include flags, numbered steps, flag-OFF negative checks, and
pass criteria. Update the Index table in that file. Do not invent a second
test-guide file.

## Automated versioning & dev server reload (mandatory)

Before committing and pushing changes:
1. Automatically bump `package.json` version (`npm run release:patch|minor|major`) without waiting for user commands.
2. Restart the background Vite dev server so `__APP_VERSION__` and `__BUILD_NUMBER__` compile into the client UI immediately **only if the user still needs a local server for testing**.
3. Document the release in `decisions.md` and git commit body.

## Post-push: close all dev servers (mandatory)

Immediately after a successful git push (or when testing is done), terminate every local `npm run dev` / Vite / `vite preview` process and free their ports. Do not leave background dev servers running. This releases RAM, CPU, and network resources.

