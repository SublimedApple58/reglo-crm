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

### Database migration workflow

1. Edit `lib/db/schema.ts`
2. Run `npx drizzle-kit generate` → creates a new `.sql` file in `drizzle/`
3. Run `npx tsx lib/db/migrate.ts` → executes all migrations (skips "already exists" errors)

### Environment variables (`.env.local`)

`DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

## Architecture

**Reglo CRM** — Sales CRM for the Reglo commercial team, domain-specific to Italian driving schools ("autoscuole"). All UI copy, routes, and business terminology are in Italian.

### Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Drizzle ORM** on **Neon PostgreSQL** (serverless HTTP driver)
- **next-auth v5 beta** (JWT sessions, Google OAuth + Credentials)
- **Tailwind CSS v4** + **shadcn/ui v4** + custom design tokens
- **pnpm** as package manager

### Path alias

`@/*` maps to the project root (e.g. `@/lib/db`, `@/components/ui`).

### Data flow pattern

Every route follows the same pattern:
1. `app/(dashboard)/<route>/page.tsx` — async Server Component, calls server actions to fetch data
2. `components/pages/<route>-client.tsx` — Client Component, receives all data as props

There is no client-side data fetching library (no SWR/React Query). Mutations use server actions called from client components via `useTransition`, followed by `router.refresh()` or `revalidatePath()`.

### Key directories

| Path | Purpose |
|---|---|
| `lib/actions/` | All server actions (`"use server"` files) |
| `lib/db/schema.ts` | All Drizzle table definitions |
| `lib/google/client.ts` | Google Calendar/Tasks API clients with token auto-refresh |
| `lib/storage/r2.ts` | Cloudflare R2 (S3-compatible) file upload/download helpers |
| `lib/constants.ts` | Pipeline stages, roles, provinces, commission tiers |
| `components/pages/` | One client component per page |
| `components/ui/` | shadcn/ui primitives + custom components |
| `drizzle/` | SQL migration files |
| `scripts/` | One-off data migration scripts (run with `npx tsx`) |
| `plans/` | Architecture decision documents |

### Route groups

- `(auth)` — public (sign-in page)
- `(dashboard)` — protected, wrapped with sidebar layout

### Auth & roles

- Google OAuth restricted to `@reglo.it` domain; also supports email/password via Credentials provider
- Roles: `sales`, `admin`, `both`
- Admin checks: `role === "admin" || role === "both"`
- Auth protection lives in `proxy.ts` (not `middleware.ts`)
- Session extends with: `id`, `role`, `territory`, `avatar`

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

- **Google Calendar + Tasks** (`googleapis`): OAuth tokens stored in `oauth_tokens` table, auto-refreshed in `lib/google/client.ts`
- **Google Maps** (`@vis.gl/react-google-maps` + `supercluster`): Territory map with marker clustering and region polygons from `lib/region-boundaries.json`
- **Cloudflare R2**: Document uploads, editor images, contract PDFs via `lib/storage/r2.ts`
- **Tiptap v3**: Rich text editor in news/resources admin pages, with image upload to R2 and table support
- **FullCalendar v6**: Calendar view synced with Google Calendar
- **@hello-pangea/dnd**: Kanban drag-and-drop in pipeline view

### Design tokens

Primary brand color is `pink` (`#EC4899`). Text uses `ink-900` to `ink-300` (slate scale). Surfaces: `surface` (white), `surface-2` (`#F8FAFC`), `bg` (`#FAFAF9`). All tokens defined in `app/globals.css` under `@theme inline`. Fonts: Inter (sans) + JetBrains Mono (mono).

### Notable custom components

- `DateTimePicker` (`components/date-time-picker.tsx`) — Calendar grid + optional time picker, supports `dateOnly` mode
- `MeetingDialog` (`components/meeting-dialog.tsx`) — Google Calendar event creation modal
- `StageChip` (`components/ui/stage-chip.tsx`) — Pipeline stage pill badge
- `AppSidebar` (`components/layout/app-sidebar.tsx`) — Fixed sidebar with nav, admin section, unread badges
