# Workspace Rules & Guidelines

## Architecture Decision Records (ADRs)

- **Rule:** Whenever a meaningful code decision, library choice, design pattern, or architectural trade-off is accepted in this codebase, you must document it in `decisions.md` located at the root of the workspace.
- **Format:**
  - Context of the problem.
  - Selected decision & resolution.
  - Trade-offs accepted.

## Git Push & Commit Protocols

- **Rule 1 (Git Commit Body):** Whenever code or configuration is committed, the **git commit message body** (commit description/comments pushed to GitHub) MUST contain a granular, file-by-file **Summary of Changes** explaining what changed in each file and why.
- **Rule 2 (Response Output):** Whenever changes are pushed to GitHub, you MUST ALWAYS provide a comprehensive, granular **Summary of Changes** with clickable file links in your response.
- **Detailed Summary Requirements (Both in Git Commit Body & Response):**
  - Commit SHA, branch, and remote URL.
  - Detailed file-by-file breakdown with exact file paths.
  - Explicit explanation of exactly what was modified, added, or deleted in each file.
  - Motivation/context behind each change.
  - Verification & testing status (tests passed, lint status).


