# Temporary Vercel hosting

Project: `rohanali027-4855s-projects/deepskills-pk`. Temporary production domain: `https://deepskills-pk.vercel.app`. The existing `deepskills.pk` domain is not reassigned by these changes.

Vercel runs the Next.js Pages Router and API routes directly. It does not run the Passenger `app.js`/`server.js` entry point. The existing private Supabase project is retained. `vercel.json` selects Next.js, `npm ci` and `npm run build`; Node is pinned to 22 in `package.json` and the Vercel project settings. The custom `next-build` directory is explicitly selected as the Vercel output directory so the Next.js adapter can locate its manifests.

`.vercelignore` excludes private environment files, PHP/archive directories, dependencies and generated deployment copies. Project linking remains local in the ignored `.vercel` directory. Never upload `.env` or copy a private key into source control.

The production environment has the existing Supabase URL/anon key, server service-role key and paired revalidation settings, plus `NEXT_PUBLIC_SITE_URL=https://deepskills-pk.vercel.app`. Private values are stored in Vercel environment settings, not the source upload. Obsolete PHP email endpoints and GitHub dispatch credentials are not transferred.

## Pending email and scheduled cleanup

SMTP is not yet configured. Contact mail, OTP and admission/HR emails cannot be claimed working until `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` and the appropriate recipient settings are entered privately, followed by a redeployment and authorized inbox tests. Admin login through the existing Supabase authentication is separate from CNIC email OTP. No OTP bypass was added.

The existing daily notification-cleanup schedule is retained, with its trailing slash so it directly reaches the route. The handler now rejects requests if `CRON_SECRET` is missing as well as when credentials are wrong. No cleanup secret was provisioned or live cleanup triggered in this task. Scheduled requests remain unauthorized until an administrator intentionally configures the secret and redeploys. The job deletes notifications older than 30 days.

## Deploy updates

Until Git integration is connected to the renamed repository with these changes merged, deploy from this linked source directory using `vercel deploy --prod`. GitHub's SSH deployment workflow is independent and does not deploy to Vercel.

Use `vercel inspect <deployment-url>` to check build status and `vercel curl /api/health/ --deployment <deployment-url>` for protected deployments. Do not disable deployment protection for testing. The health endpoint reports the Vercel commit when available, or the SSH release file on self-hosted releases; it does not check database or email delivery.

Before relying on the temporary app, test approved admin/student/teacher records, permissions, uploads and realtime, and verify inbox receipt after SMTP setup. No DNS changes or Supabase migrations are needed for the temporary Vercel URL. If existing Supabase Auth redirect flows are used, their allowed URLs may also need this temporary origin; no live Auth configuration was changed automatically.

Official reference: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
