# DeepSkills — E-Learning Platform

DeepSkills is the web platform for the DeepSkills training institute: a public marketing site (courses, blogs, media, inquiry) plus three logged-in portals (admin, student, teacher) covering enrollment, attendance, tasks, results, finance, HR, and reporting.

## Tech Stack

- **Framework**: Next.js 16 (pages router) with a hybrid rendering model — SSG + ISR for the public site, client-side rendering for the portals
- **UI**: React 19, styled-components (with SSR style extraction), Framer Motion, React Icons, React Slick, Recharts, TipTap (blog editor)
- **Database**: Supabase (Postgres + RLS, storage, realtime); CNIC-based auth with email OTP
- **Server API**: Node.js Next API routes (`pages/api/`) for all forms, OTP, emails and portal operations
- **SEO**: per-page meta/OG/JSON-LD via `components/next/Seo.js`, `next-sitemap`, `next/image`

## Rendering Architecture

| Area | Strategy |
|---|---|
| `/`, `/courses`, `/media`, `/trainers` | SSG via `getStaticProps` + ISR (5 min) |
| `/blogs`, `/blogs/[slug]` | SSG + ISR (60 s), `fallback: 'blocking'` for new posts |
| `/courses/[slug]` | SSG + ISR (1 h), outlines are hardcoded components |
| `/about`, `/contact`, `/founder-message`, `/inquiry` | Fully static |
| Forms (inquiry, contact) & OTP login | Client-side, POST to Node `/api/*` routes |
| `/admin`, `/student`, `/teacher` portals | Client-only (`ssr: false`), `noindex` |

Admin content edits call `/api/revalidate` (secured by `REVALIDATE_SECRET`) to regenerate affected pages on demand; ISR is the backstop. Public data is fetched server-side through `lib/supabaseServer.js`.

`react-router-dom` imports in portal code are aliased to `lib/nextRouterDomCompat.js` (a `next/link`/`next/router` shim) — a remnant of the CRA→Next migration; new code should use Next APIs directly.

## Getting Started

Use Node.js 22.

```bash
npm install
cp .env.example .env   # or create .env — see Environment below
npm run dev            # http://localhost:3000
```

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project + anon key (client + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by `getStaticProps` and Next API routes |
| `REVALIDATE_SECRET` / `NEXT_PUBLIC_REVALIDATE_SECRET` | Same value; authorizes on-demand ISR from the admin panel |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (defaults to `https://deepskills.pk`) |
| `NEXT_PUBLIC_BUSINESS_PHONE` | Verified public phone for structured data; omitted when unset. For GitHub Actions, set the repository variable of the same name. |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Optional Google Search Console meta tag |
| `CRON_SECRET` | Auth for the notifications-cleanup cron route |

## Builds & Deployment

Use one Node application for development and production:

```bash
npm test
npm run check:node
npm run build          # includes sitemap generation
npm start
npm run check:smtp     # connection/authentication only, no email sent
npm run package:cpanel # source ZIP without secrets or dependencies
```

For beginner deployment steps, read [the cPanel guide](deployment/cpanel/README.md). For the existing SSH/GitHub setup, see [GitHub Actions deployment](deployment/github-actions/README.md). All email paths use `lib/smtp.cjs`; set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. `CONTACT_EMAIL_TO` and `HR_EMAIL_TO` choose the administrative recipients.

Static/PHP deployment is retired. Old supported `.php` URLs rewrite internally to authenticated Node handlers; the UI calls extensionless routes directly. The former PHP files, static build and Plesk deployment workflow are archived in `legacy/` and excluded from the deployment ZIP. See [migration scope](deployment/cpanel/MIGRATION.md) and [verification](deployment/cpanel/VERIFICATION.md).

Public page canonicals and sitemaps use trailing slashes. Node ISR and blocking fallback support new published blog slugs without a static export rebuild.

## Project Structure

- `pages/` — Next.js routes; portals are catch-alls (`admin|student|teacher/[[...path]].js`)
- `pages/api/` — Node API handlers for public forms, login, mail, portals, revalidation, blog CRUD and cron
- `src/` — application UI: public page components at the root, `admin/`, `student/`, `teacher/` portal modules, shared `components/`, `context/`, `utils/`
- `components/next/` — Next-specific wrappers (Seo, PublicLayout, SmartCoverImage, portal guard)
- `lib/` — server/shared helpers (`supabaseServer`, `blog`, `rendering`, `seo`, `structuredData`, router compat shim)
- `data/siteContent.js` — hardcoded site metadata and course outline data
- `legacy/` — retired PHP/static reference files; never deploy
- `supabase/` — schema, migrations, seeds
- `scripts/` — Node-only guards, SMTP check and cPanel packaging

## License

This project is private and intended for internal use.
