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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
