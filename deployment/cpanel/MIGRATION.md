# PHP-to-Node migration — 2026-09-09

The application now runs exclusively through Next.js/Node. Supabase tables, authentication records, storage and realtime remain in place. No database migration or live deployment was performed.

## Replacements

| Previous PHP route | Node route | Behavior |
|---|---|---|
| `/api/contact.php` | `/api/contact` | Validated contact message through shared SMTP; failures reported |
| `/api/inquiry.php` | `/api/inquiry` | Saves existing inquiry fields/referrals with server-controlled status |
| `/api/register.php` | `/api/register` | Saves Pending admissions; required fields, age and duplicate CNIC checks |
| `/api/hr/notify-admin.php` | `/api/hr/notify-admin` | Authenticated HR submission notification |
| `/api/hr/share-files.php` | `/api/hr/share-files` | Own-profile teacher or HR admin; signed saved-file links sent to saved teacher address |
| `/api/admin/hr/send-jd.php` | `/api/admin/hr/send-jd` | HR write permission; saved JD becomes available in teacher portal; SMTP notice |
| `/api/admin/hr/reject.php` | `/api/admin/hr/reject` | HR write permission; persists reason and sends notice |
| `/api/admin/hr/finalize.php` | `/api/admin/hr/finalize` | HR write permission; activates teacher, access and salary, marks hired, sends notice |

Other PHP handlers already had Node counterparts. The browser now uses those Node routes directly, without runtime fallback or automatic replay. `node-api-aliases.json` retains 41 legacy URL aliases, including blog deletion. The obsolete `admin/get-applications.php` and `admin/process-application.php` JSON-file handlers have no current UI callers and are retired, with no public replacements. Existing Supabase admission/admin flows remain.

## Intentional changes

- Contact, OTP, admission/notification and HR email use `lib/smtp.cjs`. SMTP configuration is required for production. Successful SMTP acceptance is distinguished from inbox delivery.
- HR emails use server-stored recipients/data. Teacher file access is restricted to that teacher's profile; file links expire after one hour. Existing stored paths must match the application's teacher/profile storage layout.
- Saved HR actions return an explicit warning if email fails, instead of silently pretending mail worked. Sharing files reports failure if delivery cannot be confirmed.
- Finalizing an already hired profile does not repeat its server writes/email. Multi-table hiring changes are not transactional; individual DB failures are checked and reported as potentially partial. Review before retrying. File upload/replacement remains the existing client/Supabase flow and still requires correct storage/RLS configuration.
- The registration API rejects non-integer ages outside 10–100. It preserves the previous required fields and field aliases.
- PHP sources, old public JSON records, static-export scripts and the Plesk workflow are under `legacy/`, excluded from the release. The old static workflow is disabled in this checkout. No remote workflow settings were changed.
- The Node-only package has one application folder; no Apache PHP mail transport or separate legacy API configuration is needed.

## Rollback

The pre-migration source backup is `/Users/kotenterprises/Desktop/DeepSkills-backups/php-to-node-20260909-032800.tar.gz`. It excludes secrets and generated builds/assets. Keep the existing site/configuration and database backups separately before deployment. The `legacy/` reference directory alone is not a complete rollback release.

Read `VERIFICATION.md` for the exact local evidence and outstanding live checks.
