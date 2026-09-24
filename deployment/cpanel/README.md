# Deploy DeepSkills to cPanel — Node only

This package runs the website and all APIs in one Node.js application. Supabase stays in use. PHP is no longer required. The target is `https://deepskills.pk/`.

## 1. Back up and upload

In cPanel File Manager, back up the existing website and its configuration. Keep the backup outside the public document root. Do not delete it.

Upload `deepskills-cpanel-node.zip` into your account home folder (usually `/home/YOUR_USERNAME`), then click **Extract**. You should have `/home/YOUR_USERNAME/deepskills-app/app.js`. The app source and secrets belong outside `public_html`; do not upload the whole project there.

Old `index.html`, `/api`, `/legacy-api`, static-export rewrite rules, or PHP-routing rules in the domain document root can override Node requests. Back them up and remove those obsolete website files/rules when switching the domain to Node. Preserve cPanel's generated Passenger configuration. Ask your host to help if you cannot identify the domain's actual document root or generated rules.

## 2. Create the Node application

Open **Setup Node.js App** or **Application Manager**. The exact labels depend on your host. Register:

| Setting | Value |
|---|---|
| Node.js version | 22 |
| Application mode | Production |
| Application root | `deepskills-app` |
| Application URL | `https://deepskills.pk/` (domain root) |
| Application startup file | `app.js` |

Save/create the application. Do not add PHP rewrite rules. All `/api` requests must reach this Node app; old supported `.php` URLs are aliases handled inside Next.js.

## 3. Verify the private environment

This release archive already includes your pre-configured `.env.local` inside `deepskills-app/`.

In cPanel File Manager, enable **Show Hidden Files** (settings gear at top right) to view `.env.local` inside `deepskills-app/`. Set file permissions to `600` if not already set.

If you ever need to inspect or update values, the primary settings are:

- `NODE_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://deepskills.pk`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: keep your existing Supabase project.
- `REVALIDATE_SECRET`, `NEXT_PUBLIC_REVALIDATE_SECRET`: preserve the existing paired configuration. Use `CRON_SECRET` if the cleanup job is configured.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: obtain these from the sending mailbox provider. Typically port 465 uses implicit TLS; 587 uses STARTTLS. The provider must authorize the sender in `SMTP_FROM`.
- `CONTACT_EMAIL_TO`: where contact messages go, such as `info@deepskills.pk`.
- `HR_EMAIL_TO`: where HR administrative notifications go, such as `info@deepskills.pk`.

All email paths now use the same Node SMTP transport: OTP, contact, admissions/notifications, and HR. There is no PHP mail configuration to maintain.

## 4. Install and build

Open cPanel **Terminal**. The setup depends on which screen your host provides:

- **Setup Node.js App (CloudLinux):** copy and run the exact virtual-environment activation command displayed for your application.
- **Application Manager:** there is no CloudLinux activation command. First check which Node executable is installed:

  ```sh
  ls /opt/cpanel/ea-nodejs*/bin/node
  ```

  If the output includes `/opt/cpanel/ea-nodejs22/bin/node`, run:

  ```sh
  export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"
  node -v
  npm -v
  ```

  Node must show `v22.x` and npm must show a version. If the path is missing, another Node version appears, or either command fails, stop and ask your hosting provider to enable Node.js 22 and npm for both your SSH account and Passenger application. Do not install system packages yourself. The export applies to this terminal session; repeat it after opening a new session. It does not change Passenger's runtime version.

Your `.env.local` belongs inside `~/deepskills-app`, beside `package.json`; you do not need to duplicate its values in the panel.

Once Node and npm work, run these commands one at a time:

```sh
cd ~/deepskills-app
npm ci
npm run check:node
npm test
npm run build
npm run check:smtp
```

Each command must finish successfully before continuing. The build generates `next-build/` and public sitemaps. `check:smtp` verifies connection, TLS and login without sending an email; it does not prove inbox delivery.

If Terminal is unavailable, ask your host to run these commands in the registered app's Node environment. If the host kills the build for memory/process limits, ask for a higher build limit or a matching Linux build environment. Do not upload macOS `node_modules` or switch to static export.

## 5. Start and verify

Return to the Node application screen and click **Restart** after the successful build. If Application Manager has no restart button, Passenger supports creating/updating `tmp/restart.txt` inside the app root. Have your host confirm the app is bound to the domain root.

Enable HTTPS/AutoSSL for the domain and any www redirect. Preserve/configure Supabase Auth production URLs for existing admin login if used. Existing database tables and storage buckets are retained; this migration does not require changing database providers.

Use the acceptance list in `VERIFICATION.md` before considering the site live. Test with approved test accounts/records. Confirm email receipt, not just a success toast: cPanel Email Deliverability/Track Delivery or your external provider's logs can help verify SPF/DKIM, routing and rejected mail.

## If something fails

- **HTML instead of JSON / Unexpected token `<`:** verify the request URL, the app's build/start logs, and that old static/PHP rewrite rules do not intercept `/api`. Do not repeatedly click a save/send action; it may already have succeeded.
- **503 / app will not start:** check the Node version, application root, `app.js`, dependency install, successful build, and application logs.
- **Saved but email not confirmed:** the data can be saved even when mail fails. Review the record and mail logs before retrying. Do not re-finalize hiring just to resend mail; use Share Files for the teacher's documents.
- **Old site still appears:** inspect the domain document root for old static files and confirm Passenger is serving the correct app.

This ZIP is prepared source, not an already deployed website. The host's Node support, available resources, SMTP account and live functionality still need verification.

Official references: [cPanel Node application setup](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/), [Next.js self-hosting](https://nextjs.org/docs/pages/guides/self-hosting), [Nodemailer SMTP](https://nodemailer.com/smtp).
