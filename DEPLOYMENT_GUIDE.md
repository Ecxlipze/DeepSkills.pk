# DeepSkills — Final Deployment Guide

This guide covers deploying the unified Node.js (Next.js 16 Pages Router) application for **DeepSkills** (`https://deepskills.pk/`). PHP is completely retired; the entire frontend and all API endpoints run on Node 22 with Supabase and SMTP.

---

## 1. Deployment Architecture Overview

DeepSkills supports two deployment pathways:

1. **Option A: Automated Deployment via GitHub Actions (Recommended)**  
   - Triggered via GitHub Actions workflow (`.github/workflows/deploy.yml`).
   - Connects via verified SSH, builds on the server, tests SMTP connectivity, atomically symlinks releases, and runs post-deployment health verification with automatic rollback.
2. **Option B: Manual / cPanel / Shared Hosting Deployment**  
   - Uses the clean source bundle `deepskills-cpanel-node.zip` generated via `npm run package:cpanel`.
   - Hosted using Phusion Passenger (cPanel "Setup Node.js App" / "Application Manager").

---

## 2. Environment Variables & Credentials

Both deployment methods require the following environment variables (stored in server `.env.local` or GitHub Secrets/Variables):

| Variable | Required | Description |
|---|:---:|---|
| `NODE_ENV` | Yes | Must be `production` |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://deepskills.pk` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Anonymous Key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Service Role Key (**never expose to client**) |
| `REVALIDATE_SECRET` | Yes | Secret token for `/api/revalidate` ISR triggers |
| `NEXT_PUBLIC_REVALIDATE_SECRET` | Yes | Same value as `REVALIDATE_SECRET` (used by admin portal) |
| `CRON_SECRET` | Optional | Bearer token for `/api/notifications/cleanup` cron jobs |
| `SMTP_HOST` / `MAIL_HOST` | Yes | Mail server hostname (e.g. `mail.kotenterprises.dev`) |
| `SMTP_PORT` / `MAIL_PORT` | Yes | `465` (implicit TLS) or `587` (STARTTLS) |
| `SMTP_USER` / `MAIL_USERNAME` | Yes | Mailbox username / login |
| `SMTP_PASS` / `MAIL_PASSWORD` | Yes | Mailbox password |
| `SMTP_FROM` / `MAIL_FROM_ADDRESS` | Yes | Authorized sender email (e.g. `no-reply@kotenterprises.dev`) |
| `MAIL_FROM_NAME` | Optional | Sender display name (defaults to `DeepSkills`) |
| `CONTACT_EMAIL_TO` | Yes | Recipient for contact form inquiries (e.g. `info@deepskills.pk`) |
| `HR_EMAIL_TO` | Yes | Recipient for HR notifications (e.g. `info@deepskills.pk`) |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Optional | Verified business phone for structured data / SEO |

> [!CAUTION]
> Never commit `.env` or `.env.local` to git. Set file permissions on the server to `chmod 600 .env.local`.

---

## 3. Option A: Automated Deployment (GitHub Actions)

### Step 1: Configure GitHub Repository Secrets & Variables

In **GitHub → Repository Settings → Secrets and variables → Actions**:

**Repository Secrets:**
- `DEPLOY_SSH_KEY`: Private SSH key authorized on the hosting server.
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key.

**Repository Variables:**
- `DEPLOY_HOST`: e.g. `deepskills.pk` (defaults to `deepskills.pk`).
- `DEPLOY_USER`: SSH user (e.g. `deepihvk`).
- `DEPLOY_PORT`: SSH port (defaults to `22`).
- `DEPLOY_APP_ROOT`: Absolute path to the private app directory on the server (e.g. `/home/username/deepskills-node`).
- `DEPLOY_NODE_BIN`: Absolute directory path containing `node` and `npm` binaries (e.g. `/opt/cpanel/ea-nodejs22/bin`).
- `NEXT_PUBLIC_BUSINESS_PHONE`: Optional business contact phone.

### Step 2: One-Time Server Directory Layout Setup

Connect to your server via SSH and set up the stable release structure:

```bash
mkdir -p <DEPLOY_APP_ROOT>/releases
mkdir -p <DEPLOY_APP_ROOT>/shared
mkdir -p <DEPLOY_APP_ROOT>/tmp

# Place your production .env.local inside shared:
cp .env.local <DEPLOY_APP_ROOT>/shared/.env.local
chmod 600 <DEPLOY_APP_ROOT>/shared/.env.local

# Copy the Passenger bootstrap file:
cp deployment/github-actions/app.cjs <DEPLOY_APP_ROOT>/app.js

# Create relative symlink for public document root:
cd <DEPLOY_APP_ROOT>
ln -s current/public public
```

### Step 3: Trigger Deployment

1. Go to **GitHub → Actions → "Verify and deploy Node app"**.
2. Click **Run workflow** on branch `main`.
3. Check the box **"Deploy the verified Node release to production"**.
4. The workflow will:
   - Run Node runtime checks (`check:node`).
   - Run the 52 regression tests (`npm test`).
   - Connect via SSH and install dependencies on Linux.
   - Run server-side build (`npm run build`).
   - Test SMTP connectivity without sending test emails (`npm run check:smtp`).
   - Atomically switch the `current` symlink to the new release.
   - Restart Passenger via `tmp/restart.txt`.
   - Poll `/api/health/` to confirm the new release ID is live.

---

## 4. Option B: Manual / cPanel Deployment

### Step 1: Generate Clean Source Package

From the project root on your local machine:

```bash
npm run check:node
npm test
npm run package:cpanel
```

This creates `deepskills-cpanel-node.zip` (contains all source files, excludes `node_modules`, builds, secrets, and legacy PHP).

### Step 2: Upload to cPanel

1. In **cPanel File Manager**, upload `deepskills-cpanel-node.zip` into your user home directory (e.g. `/home/YOUR_USER/`).
2. Extract the archive into a dedicated private folder (e.g. `/home/YOUR_USER/deepskills-app`).
   > [!IMPORTANT]
   > Do **NOT** extract the application into `public_html`. Keep application code and secrets outside the public web root.

### Step 3: Register the Node.js Application

In cPanel, open **Setup Node.js App** (or **Application Manager**):

| Setting | Value |
|---|---|
| **Node.js Version** | `22.x` |
| **Application Mode** | `Production` |
| **Application Root** | `deepskills-app` |
| **Application URL** | `https://deepskills.pk/` (or domain root) |
| **Application Startup File** | `app.js` |

Click **Create / Save**.

### Step 4: Configure `.env.local`

Inside `/home/YOUR_USER/deepskills-app/`:
1. Copy `.env.example` to `.env.local`.
2. Fill in the real production values (Supabase keys, SMTP credentials, secrets).
3. Set file permissions:
   ```bash
   chmod 600 .env.local
   ```

### Step 5: Install, Build & Verify via Terminal

Open the cPanel **Terminal**:

```bash
# 1. Navigate to the app directory
cd ~/deepskills-app

# 2. Activate Node 22 environment (if required by CloudLinux / ea-nodejs22)
# (Copy the activate command shown in cPanel, or export PATH):
export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

# 3. Install production dependencies
npm ci

# 4. Run runtime checks & tests
npm run check:node
npm test

# 5. Build production Next.js application & generate sitemaps
npm run build

# 6. Verify SMTP configuration
npm run check:smtp
```

### Step 6: Restart the Application

- In cPanel **Setup Node.js App**, click **Restart**.
- Or touch the restart file in terminal:
  ```bash
  touch ~/deepskills-app/tmp/restart.txt
  ```

---

## 5. Post-Deployment Verification Checklist

Once the server is restarted, verify the following:

- [ ] **Health Endpoint:** Visit `https://deepskills.pk/api/health/` — should return `200 OK` with JSON:
  ```json
  { "status": "ok", "release": "..." }
  ```
- [ ] **Static & ISR Pages:** Check `/`, `/courses/`, `/blogs/`, `/about/`, `/contact/`.
- [ ] **Sitemaps:** Verify `https://deepskills.pk/sitemap.xml` and `https://deepskills.pk/sitemap-0.xml`.
- [ ] **OTP Authentication:** Test admin/teacher/student OTP login on `/login/`. Confirm OTP email arrives in inbox.
- [ ] **Public Forms:** Submit a test inquiry on `/inquiry/` and contact message on `/contact/`.
- [ ] **Portals:** Confirm client-side portal routes load properly:
  - `/admin/`
  - `/student/`
  - `/teacher/`
- [ ] **ISR Revalidation:** Publish or edit a test blog post in admin and confirm updated content reflects on `/blogs/` without full redeployment.

---

## 6. Rollback & Troubleshooting

### Rollback (Automated Deployment)
The deployment script retains prior releases in `<DEPLOY_APP_ROOT>/releases/`. To roll back manually:
```bash
cd <DEPLOY_APP_ROOT>
ln -sfn releases/<PREVIOUS_RELEASE_ID>/deepskills-app current
touch tmp/restart.txt
```
Verify the health endpoint reports the previous release.

### Common Issues

1. **503 Service Unavailable / Passenger crash:**
   - Verify Node version is 22: `node -v`.
   - Check Passenger logs in cPanel or `~/logs/`.
   - Confirm `app.js` exists in the application root.
2. **`Unexpected token <` / HTML instead of JSON API response:**
   - Make sure old `.htaccess` rewrite rules in `public_html` or `/httpdocs` from previous PHP/static deployments are removed or backed up.
3. **Deployment lock error (`.deploy-lock` exists):**
   - If a previous deployment was interrupted, inspect `<DEPLOY_APP_ROOT>/.deploy-lock`. Only remove it after confirming no other build or deployment process is actively running.
