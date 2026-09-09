# GitHub Actions: Node deployment

This replaces the archived static workflow at the same path, `.github/workflows/deploy.yml`. The existing `Ecxlipze/DeepSkills.pk` repository and its four secret names are reused. No passwords belong in the workflow.

## What runs

- Push to `main`: Node-only guard, tests, production build and downloadable source ZIP.
- Pull request to `main`: guard and isolated tests; no production secrets/build or deployment.
- Actions → **Verify and deploy Node app** → **Run workflow** on `main`: leave **deploy** unchecked to verify/package only; check it to deploy after verification.
- The old six-hour static upload and content-published dispatch are removed. Node ISR/revalidation handles content updates.

Deployment runs a read-only preflight before uploading, creates a private release directory, installs Linux dependencies, tests, builds with the server environment, and verifies SMTP connection/TLS/login without sending mail. Only after all pass does it switch `current`, request a Passenger restart, and require `/api/health/` to report the exact release ID. Failed health verification restores the previous symlink and requests another restart. That restoration still needs host/runtime confirmation; it is not a database rollback. The first Node deployment has no prior Node release to restore.

CI builds as a check; the host builds again to use its own native dependencies and private runtime environment. A shared host must have enough build memory/process allowance. Releases are retained for manual rollback; monitor disk usage and remove only confirmed-unused releases.

## Existing setup verified on 2026-09-09

- Repository: `Ecxlipze/DeepSkills.pk`, default branch `main`.
- GitHub has `DEPLOY_SSH_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` secret names. Secret values were not retrieved.
- Read-only SSH works when the named existing deployment key is selected explicitly.
- SSH sees a restricted filesystem rooted at `/`, a Plesk-style `/httpdocs` tree and `psaserv`/`psacln` groups. The current `.htaccess` routes APIs to PHP and portals to static HTML.
- `node` and `npm` are not on that SSH account's PATH. The usual `/opt/plesk/node/22/bin/node` and `/opt/plesk/node/24/bin/node` are not visible/executable there. This does not prove that Node is absent outside the restricted shell.
- The SSH host key in `known_hosts` is pinned to the fingerprint explicitly confirmed by the account owner. No automatic acceptance of changed server keys.

No production files, panel configuration, accounts, database records, or mail were changed during inspection.

## One-time hosting preparation

Ask hosting support to enable a Node 22 Passenger application for `deepskills.pk`, and expose its Node/npm binaries to this SSH account. Have them confirm the executable directory and both the shell-visible and panel-visible application paths; a jailed shell can use different paths from the panel.

Use a new private application directory, separate from `/httpdocs`, for example `/deepskills-node` as seen through SSH. Do not set this variable to the old public document root. The desired layout is:

```text
<app-root>/
  app.js                  # copy deployment/github-actions/app.cjs here once
  shared/.env.local       # private real settings, permissions 600
  public -> current/public
  current -> releases/<release-id>/deepskills-app
  releases/
  tmp/restart.txt
```

Create `shared`, `releases` and `tmp`, install the supplied bootstrap as `app.js`, and create the relative `public` symlink to `current/public`. `current` is created by the first successful deployment. Keep `.env.local` outside the public directory and enter credentials privately. Include existing Supabase configuration, production origin, revalidation settings and all SMTP settings from `.env.example`. The SMTP check is intentionally required before activation; it checks authentication only, not inbox delivery.

In the panel, configure Node 22, production mode, the stable application root, startup file `app.js`, and document root `<app-root>/public`. Ensure Passenger restarts on the stable root's `tmp/restart.txt`, including when `current` changes. Preserve existing site/config backups and coordinate the first domain switch: the `public` link is dangling until the first release is built, and the health check must reach this Node application to pass. First cutover can cause downtime; arrange a maintenance window or validate the same layout on a staging hostname first (with an explicitly updated health URL).

Old `/httpdocs/.htaccess` PHP/static rewrites must not intercept the Node app. The deployment scripts deliberately do not edit that old document root or panel configuration. Keep its backup until the Node deployment is accepted.

## GitHub settings

Keep the existing repository secrets. Add these **repository variables** under Settings → Secrets and variables → Actions → Variables:

| Variable | Value |
|---|---|
| `DEPLOY_APP_ROOT` | Host-confirmed absolute private application path as seen by SSH |
| `DEPLOY_NODE_BIN` | Host-confirmed absolute directory containing executable Node 22 and npm |
| `DEPLOY_PORT` | Optional, defaults to `22` |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Optional existing verified business phone |

The workflow keeps the existing host `deepskills.pk` and username. The `production` environment can use the repository's existing protection settings. SMTP passwords remain on the server; they are not included in artifacts.

If the host changes its SSH key, independently verify the new fingerprint before updating `deployment/github-actions/known_hosts`. For a nonstandard SSH port, that file must contain the correct `[hostname]:port` entry as well.

## Acceptance and rollback

After activation, verify login/OTP, complaint resolution, attendance, results, finance, uploads, realtime, HR and actual email receipt using approved test records. The health endpoint confirms the Node release only; it does not test the database or inbox delivery.

On a failed build/SMTP check, the old `current` link remains unchanged. On failed post-switch health, inspect the workflow and Passenger logs and confirm the previous release is serving. Never retry blindly if a remote SSH session was interrupted. Inspect `.deploy-lock`, `current`, the release directories and actual site response before clearing a stale lock. Database migrations are never run by this workflow.

For manual rollback, choose a verified previous release, atomically repoint `current` to it and update `tmp/restart.txt`; confirm `/api/health/` reports that release. Ask hosting support if you are unsure about the paths. Do not delete the shared environment or overwrite the old website as a rollback shortcut.

Official references: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Passenger application restart](https://www.phusionpassenger.com/docs/advanced_guides/troubleshooting/standalone/restart_app.html).

## Validation of this change

Local validation passed: 51 isolated Node tests, including failed build/SMTP activation, successful release selection, wrong-version rollback, first-release failure, concurrent-deploy rejection and Passenger bootstrap behavior. Actionlint accepted the workflow; Bash syntax checks and the Node-only guard passed. The isolated production build and a real local HTTP request to the release-identifying health endpoint passed. No live deployment or email send was performed. GitHub check results are reported on the draft PR.
