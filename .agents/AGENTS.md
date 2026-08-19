# Workspace Rules & Guidelines

## Architecture Decision Records (ADRs)

- **Rule:** Whenever a meaningful code decision, library choice, design pattern, or architectural trade-off is accepted in this codebase, you must document it in `decisions.md` located at the root of the workspace.
- **Format:**
  - Context of the problem.
  - Selected decision & resolution.
  - Trade-offs accepted.

## Git Push & Commit Protocols

- **Rule:** Whenever code or configuration is committed and pushed to GitHub, you MUST ALWAYS provide a comprehensive, granular **Summary of Changes** in your response.
- **Detailed Summary Requirements:**
  - Commit SHA, branch, and remote URL.
  - Detailed file-by-file breakdown with clickable file links.
  - Explicit explanation of exactly what was modified, added, or deleted in each file.
  - Motivation/context behind each change.
  - Verification & testing status.

