# 8. Output rules

After a task, tell the user what changed, why, and how you checked. Stay short.

## Always include

1. What changed (files or behavior), not a tour of the whole app.
2. Why, in one or two sentences.
3. Verification: commands run and results, or what you could not verify.
4. Risks, assumptions, or limitations **only if they are real** (skipped native, untested offline path, schema not migrated).

## Do not

- Repeat the plan or the prompt.
- Dump a project architecture summary.
- Paste the full unified diff unless the user asked for it.
- List every file in `src/` that you considered and rejected.

## Push / GitHub is a different bar

When the user asked to **push**, follow `.agents/AGENTS.md`: narrative commit body, and a detailed summary with SHA, branch, remote, file links, and test/lint status.

Day-to-day coding replies stay concise. Do not use the push-summary format for a local patch.
