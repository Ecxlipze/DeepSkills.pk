# Local Node-only verification — 2026-09-09

Target: `https://deepskills.pk/` on cPanel Node.js. PHP is no longer part of the runtime.

## Passed locally

- `npm test`: **42 tests passed, 0 failed**. Covers migrated public forms and HR actions, ownership/write-permission rejection, saved-data field mappings, duplicate registration/finalization, checked DB failures, mail transport/authorization/failure handling, complaints, attendance and existing Phase 1A checks. Tests use isolated fixture data and mocked mail; they do not exercise live accounts.
- `npm run check:node`: **41 compatibility aliases** point to Node routes; no PHP files under `public`, no frontend PHP API references, no public legacy user JSON, no active static build/deploy workflow.
- `npm run build` including sitemap generation passed from an isolated extraction of the Node-only source ZIP. Next.js 16.2.4 compiled and generated the production output without build errors. The local build used the workspace's installed dependencies; Linux `npm ci` remains a host check.
- Packaged `app.js` started in production on temporary port 3107. **45 HTTP checks passed**: homepage/contact/inquiry and portal shells, sitemaps, public API methods/validation/honeypots, authenticated-route denial, legacy `.php` aliases, and inaccessible environment/private/helper source URLs. Trailing-slash redirects preserved POST bodies. Dynamic blog helper-like URLs can return method-denied JSON; no PHP source is served.
- Contact and inquiry forms rendered in Chrome against that production build. Empty submissions triggered validation; the inquiry course list loaded. No successful real form submission was made.
- Release inventory excludes PHP/legacy files, private environment files (except placeholder `.env.example`), dependencies, generated builds, private public-data records and obsolete deployment scripts. Final source comparison checked the archive against the workspace.
- The temporary production server and browser tab were closed. The existing localhost development server was not restarted or stopped.

## Still needs host verification

- cPanel/Passenger domain routing, Linux dependency installation/build, resource limits, HTTPS and removal of old static/PHP routes.
- Admin/student/teacher login and logout, real OTP, authenticated complaint resolution, attendance, results, finance, HR transitions, files/storage, and realtime using approved test records.
- SMTP connection/authentication and inbox delivery. Local SMTP values are absent; `check:smtp` fails closed. No real email was sent. Verify OTP, contact, inquiry/admission notifications, HR JD/rejection/finalization and document-sharing mail with an authorized recipient.
- Supabase deployed policies, storage layout and live schema. Existing configuration was retained, with no DB migration or production mutation. Multi-table HR finalization and client-side upload replacement are not atomic; failure responses explicitly require reviewing partial state before retrying.
- ISR revalidation after an approved content edit; authenticated notification-cleanup scheduling if used.

Local evidence does not guarantee every production feature. Follow `README.md` for beginner setup and this list for acceptance before switching the live site.
