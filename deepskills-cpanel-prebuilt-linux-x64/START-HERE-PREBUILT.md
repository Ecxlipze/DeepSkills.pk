# DeepSkills prebuilt Node package — 2026-09-14

This ZIP contains next-build, public assets, app.js/server.js and Linux x64 glibc production node_modules. No npm install or build is required on the host. It is NOT a static HTML/PHP site. Keep the entire app outside public_html.

## Before switching the live website
1. Back up the current application and its private .env.local. Do not overwrite your only copy.
2. Upload this ZIP into a NEW private folder, for example ~/deepskills-prebuilt-release, and extract it. The application is its deepskills-app subfolder. Do not merge into the incomplete old node_modules or copy a node_modules symlink from the old application.
3. Copy your existing .env.local into the extracted deepskills-app, beside package.json. Set its permission to 600. Fill in Supabase and SMTP settings privately. This build uses https://deepskills.pk and the local project's public Supabase configuration; it must match your server's Supabase project. NEXT_PUBLIC values are compiled in: changing those requires another build.
4. Activate your existing Node 22 environment:
   source /home/deepihvk/nodevenv/deepskills-app/22/bin/activate
5. Enter the NEW directory:
   cd ~/deepskills-prebuilt-release/deepskills-app
6. Verify runtime compatibility (read-only):
   node -v
   node -e "require('next'); require('sharp'); console.log('Runtime dependencies load')"
7. Verify SMTP connection (no email is sent):
   npm run check:smtp
8. Only after compatibility and configuration checks pass, point your hosting application's root to the new extracted deepskills-app folder. Use production mode, Node 22, startup app.js. Preserve Passenger-generated configuration. If the panel insists on replacing node_modules with a virtual-environment symlink, stop: the bundled dependencies must stay accessible; ask for guidance before changing it.
9. Restart through the panel. If it offers no restart button, inside the NEW app root run:
   mkdir -p tmp
   touch tmp/restart.txt
10. Check /api/health/, /admin/, student/teacher login, an approved complaint-resolution test, and email delivery. Keep the previous folder for rollback by restoring its application-root mapping.

Do NOT run npm ci, npm audit fix, npm install, or npm run build on this package. Those replace the prepared dependencies/build. Do not put .env.local or the application folder in public_html. Preserve email DNS records.

## What was checked
- Production build and sitemap generation succeeded with Next.js 16.3.4.
- 52 isolated Node regression tests passed locally.
- Seven local HTTP checks passed: homepage, three portal entry pages, health, sitemap, and unauthorized cleanup rejection.
- Linux x64/glibc dependencies installed from package-lock.json with npm ci; install scripts disabled. Native files checked for Linux ELF format.
- Build was generated on macOS; runtime dependency tree targets Linux x64. Linux execution was NOT verified in this packaging run. The host's glibc and Passenger compatibility remain unverified. The server no longer needs the SWC build step, but native runtime dependencies such as sharp still need compatible system libraries.
- No server deployment, database writes, logged-in acceptance tests, or real emails performed.
- Dependency security remediation is not included. Existing Tiptap peer-version warnings remain; this ZIP is not a security certification.

Secrets are excluded. .env.example contains placeholders only. The public Supabase URL/anon key and public revalidation configuration are intentionally part of the client build; never substitute a service-role key there.
