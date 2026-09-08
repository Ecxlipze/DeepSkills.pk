# DeepSkills: cPanel Node + PHP deployment

Target: https://deepskills.pk/ at the domain root. This is a source package, not a verified live deployment. Node.js 22 and PHP 8.3 are recommended for this checkout. Supabase remains the database, authentication, storage, and realtime service.

## Files and routing

1. Back up the existing website and its server configuration before replacement. Use a clean document root or move old static-export files into that backup: an old `index.html`, `/api` directory, or static `.htaccess` can override Passenger routes. Keep cPanel-managed configuration and verify the actual document root before moving anything.
2. Extract `deepskills-app` under your cPanel home, outside the public document root (for example `~/deepskills-app`). Do not upload the repository's root `.htaccess`: it belongs to static-export hosting.
3. In **Setup Node.js App / Application Manager**, select production, Node.js 22, application root `deepskills-app`, application URL `https://deepskills.pk/`, and startup file `app.js`.
4. Put `document-root/legacy-api` in the domain's actual document root. Merge `document-root/cpanel-routes.htaccess` BEFORE cPanel's generated Passenger settings in that document root's `.htaccess`. Preserve the generated Passenger and PHP-handler directives. Do not replace them with the example.
5. Node handles extensionless API routes and their mapped `.php` aliases. Only PHP-only endpoints are internally rewritten to `/legacy-api/`. The PHP directory disables Passenger. The host must permit PHP execution and these rewrite directives. If its Application Manager binds a different document root, ask the host to map this directory there.
6. The obsolete JSON-file application handlers and `public/data/users.json` are excluded. Current portal flows use Supabase. The old Plesk deploy script is also excluded.
7. Do not copy `public/api` back into the Node app. Its PHP sources have deliberately been removed from this package; Next.js does not execute PHP.

## Environment

Create a private `.env.local` in `~/deepskills-app` or enter equivalent cPanel application environment variables. Use `.env.example` as the key list, not as usable credentials. Set:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://deepskills.pk`
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Existing revalidation configuration and `CRON_SECRET` if the cleanup job is used
- `SMTP_HOST`, `SMTP_PORT` (465 for implicit TLS or 587 for STARTTLS), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (an address authorized by the provider)

Public variables are embedded during the build; rebuild if they change. Never put the service-role key or SMTP password into a `NEXT_PUBLIC_*` variable.

PHP-only endpoints load `.env.local` separately from their parent/document-root paths. Their current loaders are not connected to the Node process environment. Configure their Supabase values in the domain document root's `.env.local`, protected by the supplied dotfile-denial rule, and verify that an HTTPS request for it is denied. Prefer a host-configured private environment-file path if your host provides one. Do not assume the Node environment reaches PHP.

## Install, build, activate

Activate the Node environment using the exact command shown by cPanel, then run in `~/deepskills-app`:

```sh
npm ci
npm run build
node scripts/check-smtp.cjs
```

Do not upload macOS `node_modules` to Linux. This ZIP intentionally excludes local builds and dependencies. If the shared host cannot finish the build within its memory/process limits, build in a matching Linux environment and prepare a separate release; do not switch silently to static export.

Restart the registered app through cPanel after a successful build and configuration. Confirm HTTPS/AutoSSL covers both the selected canonical domain and any redirecting www hostname. Set Supabase Auth Site URL/redirect allowances to the production origin if needed for the existing admin authentication flow.

## Email verification

The Node admission-email handler now attempts real SMTP and only reports mail-server acceptance. OTP email also requires SMTP in production. `check-smtp.cjs` verifies connection/TLS/authentication only; it does not send a message or prove inbox delivery.

The legacy PHP contact and HR endpoints still use PHP `mail()`. cPanel must provide a working local mail transport and authorize their sender addresses (`info@deepskills.pk` and/or `dev@deepskills.pk`). Node SMTP settings do not configure PHP mail. Some legacy HR endpoints ignore mail errors: their success response is not delivery proof. Until those endpoints are tested against the host's mail logs/inbox, email parity is PENDING.

Use cPanel Email Deliverability to check SPF/DKIM; confirm mail routing matches the selected mailbox provider. With an authorized recipient, test OTP, an enrollment message, contact delivery, and the HR messages actually used. Check the recipient inbox and Track Delivery. SMTP acceptance alone does not prove delivery.

## Acceptance before calling deployment complete

- Homepage, courses/blog detail pages, refresh/direct navigation, images and fonts.
- Admin/student/teacher login and logout, production OTP (no dev OTP in responses).
- Attendance, complaint resolution/replies, results, finance, and uploads using approved test records.
- Contact/inquiry/registration and legacy HR endpoints return JSON, never PHP source or HTML error pages.
- Confirm email receipt for each used mail path and record any rejected/queued delivery.
- Unauthenticated privileged requests remain denied; `.env.local` and PHP helper source URLs are inaccessible.
- Check ISR revalidation after an approved content change and configure the authenticated notifications-cleanup cron if used.

No live migration, account change, email send, or deployment is performed by the packaging script. All live checks remain pending until host access and the sending mailbox/test recipient are supplied.

References: https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/ ; https://nextjs.org/docs/pages/guides/self-hosting ; https://www.phusionpassenger.com/docs/references/config_reference/apache/#passengerenabled ; https://nodemailer.com/smtp
