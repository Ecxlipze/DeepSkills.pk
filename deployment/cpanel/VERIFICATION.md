# Local release verification — 2026-09-09

Target: https://deepskills.pk/ using cPanel Node.js + Apache/PHP.

## Passed

- Production `npm run build` from an isolated copy of the source package, including sitemap generation after correcting `sourceDir` to `next-build`.
- 27 Node regression tests: email transport/authorization/error handling, complaints request handling, attendance, and Phase 1A security.
- PHP attendance suite: 7 scenarios passed; PHP Phase 1A suite: 5 tests passed.
- Syntax validation of all 44 PHP files.
- Packaged `app.js` starts in production. Ten HTTP smoke checks passed: homepage, portal shells, JSON responses/authorization on PHP aliases, sitemap, and denial of environment/helper source URLs.
- Production homepage rendered in Chrome; desktop screenshot inspected.
- Archive inventory excludes environment secrets, local dependencies/builds, private `public/data`, obsolete JSON application handlers, and the old Plesk deployment script.

## Not established

- cPanel/Apache rewrite execution, PHP-handler configuration, actual Linux dependency installation, hosting resource limits, and HTTPS configuration.
- Authenticated production portal actions, uploads, realtime behavior, and real account/database changes. Only isolated tests and read-only local smoke checks were used.
- SMTP connectivity or inbox delivery: required SMTP values are absent locally. The SMTP check fails closed. No real email was sent.
- Legacy contact and HR email delivery through PHP `mail()`. HR share-files and send-JD endpoints currently send administrative notices; they do not implement recipient-specific document delivery. Several legacy handlers ignore the result of `mail()`. These are existing application limitations, not proof of working delivery.

This is a prepared source package, not a completed live deployment or a claim that every feature has production parity. Remaining host checks require cPanel access, the selected sending mailbox, and an authorized email test recipient.
