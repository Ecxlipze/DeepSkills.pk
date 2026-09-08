# DeepSkills project guidance

## Project map
- Next.js Pages Router with React; see `README.md` for architecture and deployment details. Read relevant sections only.
- `pages/`: Next routes; `pages/api/`: Node API handlers.
- `src/admin/`, `src/student/`, `src/teacher/`: portal UI; other `src/` files: public UI and shared code.
- `components/next/`: Next wrappers; `lib/`: server/shared helpers, including `portalAuthServer.js` and `supabaseServer.js`.
- `public/api/`: PHP API handlers; backend changes may require matching Node and PHP behavior. Trace the affected request before choosing files.
- `supabase/`: schema and migrations; `data/siteContent.js`: site/course content; `tests/`: regression tests.

## Keep context focused
- Start with the task's paths or symbols. Use scoped `rg` searches, then read relevant line ranges and direct dependencies.
- Expand investigation when evidence requires it; avoid routine whole-project audits and repeated file inventories.
- Reuse findings within the task unless files changed or evidence is incomplete. Read detailed documentation on demand.
- Exclude dependencies, generated builds, deployment copies, archives, assets, and logs from routine code reads. Inspect them when the task concerns them.
- Common generated paths: `node_modules/`, `.next/`, `build/`, `next-build/`, `out/`, `.export-stash/`, `deepskills-cpanel/`, `deepskills-deploy/`, `deepskills-deploy 2/`, `deepskills-vps-source/`.
- Avoid dumping full lockfiles, SVGs, minified files, logs, or command output. Return relevant excerpts and failure details; keep full diagnostics in a file when useful.
- Keep this guidance short. Do not append task histories, large code excerpts, or duplicate the README.

## Changes and validation
- Make the smallest complete change; preserve unrelated edits and behavior. Check working-tree status before editing.
- Run relevant existing checks first. Expand validation for shared code, security, cross-runtime behavior, or unresolved failures.
- `package.json` has no `test` or `lint` script; inspect available tests rather than invoking nonexistent scripts.
- Node regression tests use `node:test` in `tests/*-node.test.mjs`; inspect runtime requirements before running. The attendance test uses `mock.module`, which requires module-mocking support.
- PHP regression suites are `tests/phase1a-security-php.php` and `tests/attendance-php.php`; invoke the relevant suite with `php`.
- Syntax-check changed PHP with `php -l <file>`. Use `npm run build` when build validation is relevant; it also runs sitemap generation.
- Do not run legacy `scratch/` scripts until their side effects are understood. Prefer isolated test fixtures.
- Documentation-only changes need a diff/content review, not an application build. UI acceptance requires rendered checks when requested or needed to verify the change.
- Preserve authorization and data-ownership checks; never skip necessary security validation to reduce tokens.
- Keep deployment, migrations, live-data changes, real emails, and process activation within explicit user authorization. Never print secrets.

## Communication
- Keep updates brief and useful. Finish with what changed, validation results, and material limitations.
- Do not repeat plans, quote entire changed files, or produce long reports unless requested.
- For a requested handoff, record only the objective, relevant paths, decisions, completed checks, and remaining work.
