# Retired PHP / static deployment reference

These files were moved out of the runtime during the PHP-to-Node migration on 2026-09-09. They are not a deployable release and are excluded from the cPanel package. Do not upload this directory or run its deployment scripts.

- `php/`: former `public/api/` handlers, preserved for comparison.
- `data/`: former public JSON records; keep private.
- `tests/`: old PHP fixture tests.
- `static.htaccess`, `scripts/`, `deploy-static.yml.disabled`: retired static/Plesk deployment files. The workflow is no longer in `.github/workflows` and cannot deploy automatically from this checkout.

Current Node equivalents and rollout checks are in `deployment/cpanel/MIGRATION.md`. Use the pre-migration source backup for rollback, plus the separate hosting/database backups for any deployed changes. This directory alone does not restore the old runtime.
