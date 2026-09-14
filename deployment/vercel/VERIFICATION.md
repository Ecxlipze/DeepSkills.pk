# Vercel deployment verification — 2026-09-09

- Status: READY, production deployment `dpl_9UYkzW7qQ19kJfFFWT3NnfjRS6WS`.
- Website: https://deepskills-pk.vercel.app/
- Admin entry: https://deepskills-pk.vercel.app/admin/
- Vercel project: `rohanali027-4855s-projects/deepskills-pk`.
- Next.js 16.2.4 on Node 22; production build and sitemap generation passed after explicitly selecting `next-build` as the output directory.
- 52 isolated Node tests passed. GitHub verification and CodeQL checks passed on PR #3.
- 22 live HTTP checks passed: public pages and portal shells, Node health, public form validation, privileged-route denial, legacy complaint alias, protected cleanup, and inaccessible private/PHP source paths. Vercel denies some PHP-shaped paths with 403 rather than the local server's 404.
- Admin login rendered in Chrome. No authenticated admin changes, student/teacher OTP login, actual form submission, database cleanup or mail send was performed.
- A deployment-scoped runtime log query for 5xx responses returned no records during verification. This is limited smoke-test evidence, not continuous monitoring.
- SMTP is absent: email delivery and CNIC OTP remain pending. CRON_SECRET is absent: scheduled cleanup rejects requests until intentionally configured.
- Existing domain DNS/hosting and Supabase schema/auth configuration were not changed.
- Deployment used the linked CLI project. Git integration is not connected; GitHub SSH deployment remains separate. Vercel source/configuration changes are in https://github.com/Ecxlipze/DeepSkills.pk/pull/3 .
