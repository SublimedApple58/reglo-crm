# Reglo CRM — Piattaforma CRM per il team sales

## What was done

Full implementation of the Reglo CRM platform:

- **Phase 0**: Next.js 16 scaffolding with TypeScript, Tailwind CSS v4, shadcn/ui, pnpm
- **Phase 1**: Design system (Inter + JetBrains Mono, pink/yellow/slate palette, custom CSS variables)
- **Phase 2**: Drizzle ORM schema (users, autoscuole, pipeline_stages, activities, news, commissions, resources) + NextAuth v5 with credentials provider
- **Phase 3**: Dashboard shell (AppSidebar with role-based nav, Topbar with breadcrumbs)
- **Phase 4**: Home page (hero, shortcuts, map teaser, integrations, pipeline preview)
- **Phase 5**: Pipeline (Kanban with drag-and-drop via @hello-pangea/dnd + List view)
- **Phase 6**: Scheda Autoscuola (stage stepper, activity timeline, anagrafica, notes, right sidebar)
- **Phase 7**: Mappa territorio (CSS-based pin map with province filters, fallback for Google Maps)
- **Phase 8**: Bacheca news (two-panel reader with category filters)
- **Phase 9**: Commissioni (stats, recharts bar chart, commission tiers, lines table)
- **Phase 10**: Risorse (three-panel: categories, docs list, reader)
- **Phase 11**: Profilo (user info, password change)
- **Phase 12**: Admin pages (Gestione Sales with KPI cards + table, Assegnazioni with bulk reassign, Gestione Risorse with Tiptap editor)

## Tech Stack

- Next.js 16 (App Router, proxy.ts instead of middleware.ts)
- Tailwind CSS v4, shadcn/ui
- Drizzle ORM + NeonDB
- NextAuth v5 (credentials)
- @hello-pangea/dnd, recharts, @tiptap/react, lucide-react

## Credentials (seed)

- gabriele.ruzzu@reglo.it / reglo2026 (sales+admin)
- admin@reglo.it / reglo2026 (admin only)
- All sales users / reglo2026
