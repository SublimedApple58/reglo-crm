# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm lint             # ESLint
npx tsc --noEmit      # Type-check without emitting
npx tsx lib/db/seed.ts          # Seed database
npx tsx lib/db/migrate.ts       # Run Drizzle migrations
npx drizzle-kit generate       # Generate migration SQL from schema changes
npx tsx scripts/<script>.ts     # Run one-off data scripts
```

There is no test suite or test runner in this repo. Verification = `npx tsc --noEmit` + `pnpm lint` + manual testing.

### Database migration workflow

1. Edit `lib/db/schema.ts`
2. Run `npx drizzle-kit generate` → creates a new `.sql` file in `drizzle/`
3. Run `npx tsx lib/db/migrate.ts` → executes all migrations (skips "already exists" errors, loads `.env.local` itself)

### Environment variables (`.env.local`)

`DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (optional — falls back to Google's `DEMO_MAP_ID` for AdvancedMarker support; set a real cloud-registered Map ID in production)

## Architecture

**Reglo CRM** — Sales CRM for the Reglo commercial team, domain-specific to Italian driving schools ("autoscuole"). All UI copy, routes, and business terminology are in Italian.

Note: `README.md` is stale create-next-app boilerplate — ignore it.

### Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Drizzle ORM** on **Neon PostgreSQL** (serverless HTTP driver)
- **next-auth v5 beta** (JWT sessions, Google OAuth + Credentials)
- **Tailwind CSS v4** + **shadcn/ui v4** (style `base-nova`) + custom design tokens
- **pnpm** as package manager

### Path alias

`@/*` maps to the project root (e.g. `@/lib/db`, `@/components/ui`).

### Data flow pattern

Every route follows the same pattern:
1. `app/(dashboard)/<route>/page.tsx` — async Server Component, calls server actions to fetch data
2. `components/pages/<route>-client.tsx` — Client Component, receives all data as props

Naming deviations: root `/` → `home-client.tsx`, `/pipeline/mappa` → `map-client.tsx`, and all admin page clients live in the `components/pages/admin/` subfolder (e.g. `/admin/assegnazioni/[salesId]` → `admin/sales-detail-client.tsx`).

There is no client-side data fetching library (no SWR/React Query). Mutations use server actions called from client components via `useTransition`, followed by `router.refresh()` or `revalidatePath()`. Exception: `AppSidebar` fetches its badge counts (pipeline, unassigned, unread news, pending contracts, Google tasks) by calling server actions on mount.

### Key directories

| Path | Purpose |
|---|---|
| `lib/actions/` | All server actions (`"use server"` files): `autoscuole`, `calendar`, `contracts`, `data` (dashboard aggregates/counts), `documents`, `link-preview`, `users` |
| `lib/db/schema.ts` | All Drizzle table definitions (18 tables) |
| `lib/auth.ts` / `lib/auth.config.ts` | Full NextAuth config / edge-safe subset used by `proxy.ts` |
| `lib/google/client.ts` | Google Calendar/Tasks API clients with token auto-refresh |
| `lib/storage/r2.ts` | Cloudflare R2 (S3-compatible) file upload/download helpers |
| `lib/constants.ts` | Pipeline stages, roles, regions/provinces, resource/news categories, commission tiers, calendar event presets, per-sales colors |
| `components/pages/` | One client component per page (admin pages under `admin/`) |
| `components/ui/` | shadcn/ui primitives + custom components |
| `drizzle/` | SQL migration files |
| `scripts/` | One-off data migration scripts (run with `npx tsx`) |
| `plans/crm/` | Architecture decision documents |

### Route groups

- `(auth)` — public (sign-in page)
- `(dashboard)` — protected, wrapped with sidebar layout

### Auth & roles

- Google OAuth restricted to `@reglo.it` domain (`hd` param + signIn callback check); sign-in also requires an existing active user row in the DB. Email/password via Credentials provider (bcrypt)
- Google OAuth scopes include Calendar events/readonly and Tasks; tokens upserted into `oauth_tokens` on sign-in
- Roles: `sales`, `admin`, `both`
- Admin checks: `role === "admin" || role === "both"`
- Auth protection lives in `proxy.ts` (not `middleware.ts`), using the edge-safe `lib/auth.config.ts`; it skips `/api` and static assets
- Session extends with: `id`, `role`, `territory`, `avatar`

### Pipeline stages

10 ordered stages defined in `lib/constants.ts` (`STAGES`, `StageId`): `da_chiamare`, `non_interessato`, `follow_up`, `email`, `in_attesa`, `appuntamento`, `no_show`, `cliente`, `non_chiuso`, `nuove_features`. Use these IDs — they are stored on `autoscuole` rows and drive the Kanban.

### API routes

- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `app/api/upload/route.ts` + `app/api/upload/[id]/route.ts` — Document upload to R2 (tied to autoscuola)
- `app/api/upload-contract/route.ts` — Contract PDF upload
- `app/api/editor-image/[...key]/route.ts` — Tiptap editor image proxy from R2

### Database conventions

- Schema in `lib/db/schema.ts`, migrations in `drizzle/`
- ID generation: `u_${Date.now()}` for users, `as_${Date.now()}` for autoscuole
- Cascade deletes are manual in server actions (not DB-level)
- Migrations run via custom `lib/db/migrate.ts`, not `drizzle-kit push`

### Integrations

- **Google Calendar + Tasks** (`googleapis`): OAuth tokens stored in `oauth_tokens` table, auto-refreshed in `lib/google/client.ts`; on refresh failure the token row is deleted (user must re-auth)
- **Google Maps** (`@vis.gl/react-google-maps` + `supercluster`): Territory map with marker clustering and region polygons from `lib/region-boundaries.json`
- **Cloudflare R2**: Document uploads, editor images, contract PDFs via `lib/storage/r2.ts`
- **Tiptap v3**: Rich text editor in news/resources admin pages, with image upload to R2 and table support
- **FullCalendar v6**: Calendar view synced with Google Calendar
- **@hello-pangea/dnd**: Kanban drag-and-drop in pipeline view

### Design tokens

Airbnb-style navy palette, aligned with the live tokens of the sister repo `reglo` (`assets/styles/globals.css` — the source of truth; its `docs/design-system.md` is stale). Primary brand color is `brand` (`#1a1a2e` navy). Text uses `ink-900` to `ink-300` (warm gray scale: `#222222` → `#dddddd`). Surfaces: `surface` (white), `surface-2` (`#f7f7f7`), `bg` (white). Destructive `#c13515`. `yellow` stays functional (trial badge). Radius base `0.875rem` + `--radius-pill`. Shadows and motion vars mirror reglo's (`--shadow-card/panel/cta/...`, `--motion-*`). All tokens in `app/globals.css` under `@theme inline`. Fonts: Geist Sans + Geist Mono (`--font-geist-sans/-mono`). There is no `pink` token anymore — use `brand`/`brand-50`/`brand-100`.

### Notable custom components

- `DateTimePicker` (`components/date-time-picker.tsx`) — Calendar grid + optional time picker, supports `dateOnly` mode
- `MeetingDialog` (`components/meeting-dialog.tsx`) — Google Calendar event creation modal
- `StageChip` (`components/ui/stage-chip.tsx`) — Pipeline stage pill badge
- `AppSidebar` (`components/layout/app-sidebar.tsx`) — Fixed sidebar with nav, admin section, unread badges
