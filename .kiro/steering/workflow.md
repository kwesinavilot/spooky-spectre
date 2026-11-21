# Specter — Workflow

Build and document together. Every unit of work ships with its documentation and a commit.

## For every unit of work

A unit of work is one task or a small group of related tasks from a spec's `tasks.md`, a fix, or a
steering change. When it is done:

1. **Docs:** update or add the relevant page in `docs/` so it describes what now exists. Describe
   real behavior, not plans. Mark anything not yet verified as such.
2. **Spec:** tick the task in the spec's `tasks.md`, with a one-line note if it differed from the plan.
3. **Changelog:** add an entry under `## [Unreleased]` in `CHANGELOG.md` (Added, Changed, Fixed,
   Removed). Say whether tests were run.
4. **Commit and push:** one conventional commit per unit (`feat:`, `fix:`, `docs:`, `test:`,
   `chore:`), staging files by name. Push to `origin main` and confirm the remote matches.

Do not batch several units into one commit, and do not leave documentation for the end.

## Versions

- Each completed spec bumps the minor version (0.6.0 → 0.7.0) in every `package.json`, and moves
  the `Unreleased` entries under the new version heading with the date.
- Fixes between specs bump the patch version.

## Docs layout

- `docs/README.md` is the index. Every page is linked from it.
- One page per area (architecture, detection and extraction, effects, privacy, development).
- `docs/design/` holds reference screens for the design steering.
- Docs are for people working on or evaluating Specter. User-facing help articles live in
  `packages/help`.

## When verification is blocked

If tests or builds cannot be run, commit the work anyway with "untested" in the changelog entry and
the commit body, and list the exact command for the user to run. Never describe untested work as
passing.
