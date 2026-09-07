# DeepSkills — E-Learning Platform

DeepSkills is the web platform for the DeepSkills training institute: a public marketing site (courses, blogs, media, inquiry) plus three logged-in portals (admin, student, teacher) covering enrollment, attendance, tasks, results, finance, HR, and reporting.

## Tech Stack

- **Framework**: Next.js 16 (pages router) with a hybrid rendering model — SSG + ISR for the public site, client-side rendering for the portals
- **UI**: React 19, styled-components (with SSR style extraction), Framer Motion, React Icons, React Slick, Recharts, TipTap (blog editor)
- **Database**: Supabase (Postgres + RLS, storage, realtime); CNIC-based auth with email OTP
- **Server API**: PHP endpoints under `public/api/` (forms, OTP login, emails) served by Apache alongside the app, plus Next API routes (`pages/api/`) on the Node deploy
- **SEO**: per-page meta/OG/JSON-LD via `components/next/Seo.js`, `next-sitemap`, `next/image`

## Rendering Architecture

| Area | Strategy |
|---|---|
| `/`, `/courses`, `/media`, `/trainers` | SSG via `getStaticProps` + ISR (5 min) |
| `/blogs`, `/blogs/[slug]` | SSG + ISR (60 s), `fallback: 'blocking'` for new posts |
| `/courses/[slug]` | SSG + ISR (1 h), outlines are hardcoded components |
| `/about`, `/contact`, `/founder-message`, `/inquiry` | Fully static |
| Forms (inquiry, contact) & OTP login | Client-side, POST to `/api/*.php` |
| `/admin`, `/student`, `/teacher` portals | Client-only (`ssr: false`), `noindex` |

Admin content edits call `/api/revalidate` (secured by `REVALIDATE_SECRET`) to regenerate affected pages on demand; ISR is the backstop. Public data is fetched server-side through `lib/supabaseServer.js`.

`react-router-dom` imports in portal code are aliased to `lib/nextRouterDomCompat.js` (a `next/link`/`next/router` shim) — a remnant of the CRA→Next migration; new code should use Next APIs directly.

## Getting Started

Requires Node.js 20+.

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

Two build targets from the same codebase:

**Node deploy (full ISR)** — for hosts with Node support (cPanel "Setup Node.js App"/Passenger or a VPS):

```bash
npm run build   # also generates the sitemap (postbuild)
npm start       # runs server.js, honors $PORT
```

Keep `/api` served by Apache/PHP (e.g. `PassengerEnabled off` in `api/.htaccess`) so the PHP endpoints stay on the same origin.

**Static export (shared hosting, no Node)**:

```bash
npm run build:static   # writes a deployable static site to out/
```

Upload `out/` plus the root `.htaccess`. ISR is unavailable in this mode — content publishes require a rebuild + re-upload (`public/api/revalidate.php` is the hook point for automating this via CI). New blog posts are served by the `/blogs/post` client-side shell until the next rebuild.

Public page canonicals and sitemaps use trailing slashes in both deployment modes. The static blog fallback starts without `noindex` or a canonical pointing to the blog list; after loading, a published article supplies its own metadata, while a missing article receives `noindex`. New posts still need JavaScript until rebuilt, so keep the content rebuild workflow enabled. Direct requests to `/blogs/post/` redirect to `/blogs/`.

## Project Structure

- `pages/` — Next.js routes; portals are catch-alls (`admin|student|teacher/[[...path]].js`)
- `pages/api/` — revalidation, blog CRUD, view counter, cron (Node deploy only)
- `src/` — application UI: public page components at the root, `admin/`, `student/`, `teacher/` portal modules, shared `components/`, `context/`, `utils/`
- `components/next/` — Next-specific wrappers (Seo, PublicLayout, SmartCoverImage, portal guard)
- `lib/` — server/shared helpers (`supabaseServer`, `blog`, `rendering`, `seo`, `structuredData`, router compat shim)
- `data/siteContent.js` — hardcoded site metadata and course outline data
- `public/api/` — PHP endpoints (inquiry, contact, emails, OTP auth trio, register)
- `supabase/` — schema, migrations, seeds
- `scripts/build-static.js` — static-export build wrapper

## License

This project is private and intended for internal use.
