# Piano: REG-268 — 11 sotto-task CRM (reglo-crm)

## What was done (2026-08-07)

Tutte le 11 sotto-task implementate e marcate Done su Linear, nell'ordine pianificato. Note di implementazione rispetto al piano:

- **REG-270**: gate admin/both su `getSalesWithGoogle` + `getCalendarEventsForUser`; scoping mappa/home verificato già corretto. `getPipelineCounts` resta globale (solo conteggi aggregati, nessun dato personale).
- **REG-347**: re-theme completo navy (#1a1a2e) + Geist; token `pink` → `brand` (eliminato, non aliasato); ~200 hex sostituiti valore→valore (le CSS var non funzionano nelle opzioni Google Maps); palette stage/sales/categorie ridisegnate. Migrazioni: `0003` (default users.color) + `0011_navy_theme_colors.sql` (UPDATE stage/utenti — DEVE stare dopo 0005/0008 che riscrivono i colori vecchi; migrate.ts riesegue tutti i file, la 0011 vince sempre). Mappa: `mapId` da env `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` con fallback `DEMO_MAP_ID` (sentinel ufficiale Google per AdvancedMarker senza Map ID registrato). ⚠️ Su Vercel vanno aggiunte `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (+ eventuale MAP_ID reale).
- **REG-295**: `Linkify`/`LinkPreviewCard`/`getEmbedUrl` estratti in `components/ui/linkify.tsx`; applicati a note contratto, commenti bacheca/risorse (+ timeline in 302).
- **REG-302**: nessun Enter-submit esisteva; il bug era il rendering senza `whitespace-pre-wrap` nella timeline (443-447) — fixato + Linkify.
- **REG-299**: `updateActivity(id, text)` (autore-o-admin; stage_change read-only; per i task il testo vive in `title`, altrimenti in `body`) + edit inline con matita hover.
- **REG-297**: filtro Regione con `REGIONI_PROVINCE`, restringe le opzioni Provincia, sync URL + chip.
- **REG-318**: colonna `lost_reason` + `updateAutoscuolaStage(id, stage, {lostReason})` (obbligatoria server-side per non_chiuso, azzerata in uscita, storia nell'activity) + `components/lost-reason-dialog.tsx` condiviso tra drag pipeline (niente optimistic finché non confermata) e stepper dettaglio + card rossa in Anagrafica.
- **REG-317**: colonna `trial_start_at` auto-settata al primo passaggio a cliente (mai sovrascritta), `TRIAL_DAYS=30`, backfill eseguito su dev (10 clienti datati dallo storico stage_change), campo data in Anagrafica, pill gialla countdown / grigia "Prova terminata" sulla card.
- **REG-272**: estratto `components/event-form-fields.tsx` (`useEventForm` + `EventFormFields`: preset, combobox autoscuola con lock, titolo computato, owner selector admin-only, branch follow-up → `setFollowUp`); `MeetingDialog` riscritto come shell modale attorno ai campi condivisi; popover Calendario NON toccato (scelta pianificata, swap futuro possibile).
- **REG-296**: phone nel join di `getCalendarEvents` + riga tel: nel popover evento; `getAutoscuolePhoneMap(ids)` batch per /attivita e home (id estratto dal Link CRM nelle notes del task); fixato il composer che creava task senza link.
- **REG-319**: gruppo piatto `group_id` + `is_group_primary` (zero riscrittura FK, reversibile); `mergeAutoscuole` (assorbe gruppi esistenti), `unmergeAutoscuola` + `normalizeGroup` (promozione/dissoluzione), `getGroupMembers`; fix bug latente `deleteAutoscuola` (mancava cascade `contractRequests` → FK violation); UI: card "Sedi collegate" + `MergeSediDialog` (admin) nel dettaglio, chip "⧉ Gruppo" sulla card Kanban.

Verifica: `npx tsc --noEmit` + `pnpm build` puliti dopo ogni blocco; migrazioni applicate su DB dev; smoke test sign-in con dev server. Da fare a mano: QA visivo completo come sales e admin, env su Vercel.

---

## Contesto

Implementare tutte le sotto-task in stato "Todo" dell'issue Linear REG-268 (progetto CRM) in `reglo-crm`: un re-theme completo del design system allo stile Airbnb navy della web app `reglo`, un fix privacy sui follow-up, e 9 miglioramenti funzionali su pipeline, calendario e dettaglio autoscuola. REG-321 esclusa. REG-319 ("Unisci sedi") per ultima.

**Decisioni confermate dall'utente:**
1. **REG-347**: allineamento COMPLETO del design system al CSS **live** di `reglo` (`/Users/tizianodifelice/reglo/assets/styles/globals.css`) — palette navy/neutri, font Geist, radius, ombre, spaziature, tipografia, stati hover/focus. Il pink sparisce del tutto come brand. La doc `design-system.md` di reglo è stale (pink/giallo): NON usarla come riferimento.
2. **REG-270**: overlay calendari colleghi riservato ad admin/both.
3. **REG-317**: colonna `trialStartAt` auto-settata al passaggio a "cliente", backfill da storico, editabile, countdown 30 giorni.
4. **REG-319**: dopo l'unione, sedi = schede separate in pipeline con badge gruppo.

**Linear**: a ogni task → `mcp__linear-server__save_issue` per marcare In Progress all'inizio e Done alla fine.

## Ordine di esecuzione

| # | Task | Migrazione DB | Motivo posizione |
|---|------|--------------|------------------|
| 1 | REG-270 privacy calendario | no | Leak privacy: subito, diff piccolo |
| 2 | REG-347 design system + mappa | sì (colori DB) | Presto, così tutta la UI successiva nasce navy-native |
| 3 | REG-295 Linkify condiviso | no | Fondazione per 302/299 |
| 4 | REG-302 a capo timeline | no | 1 riga, dipende da 295 |
| 5 | REG-299 attività modificabili | no | Stessa superficie di 302 |
| 6 | REG-297 filtro Regione | no | Isolato, basso rischio |
| 7 | REG-318 motivazione non chiuso | sì (`lost_reason`) | Modifica `updateAutoscuolaStage`, propedeutica a 317 |
| 8 | REG-317 badge mese di prova | sì (`trial_start_at`) + script backfill | Costruisce sullo stesso action |
| 9 | REG-272 allineare form meeting | no | UI più grossa, beneficia dei token navy |
| 10 | REG-296 telefono nei follow-up | no | Tocca payload calendario dopo il 272 |
| 11 | REG-319 unisci sedi | sì (`group_id`, `is_group_primary`) | Ultimo per richiesta esplicita; più delicato |

Workflow migrazioni: edit `lib/db/schema.ts` → `npx drizzle-kit generate` → ispezione SQL → `npx tsx lib/db/migrate.ts`.

---

## 1. REG-270 — Gate visibilità calendari per ruolo

Root cause: `getSalesWithGoogle` (`lib/actions/calendar.ts:280-296`) e `getCalendarEventsForUser` (`calendar.ts:251-278`) controllano solo la sessione, mai il ruolo → ogni sales può sovrapporre il calendario Google (e i follow-up) di qualsiasi collega dalla sidebar Calendario.

- In entrambe le action: se `role` non è admin/both → `return []` (pattern ruolo come `pipeline/page.tsx:14-16`; role è già nel token, `lib/auth.ts`).
- Nessun fork UI: con `salesUsers=[]` la sidebar colleghi e il selettore "Calendario di" (`calendario-client.tsx:1410`, gated su `salesUsers.length > 0`) spariscono da soli per i sales.
- Sanity check: verificare che `pipeline/mappa/page.tsx` e la home applichino lo stesso scoping `isAdmin ? undefined : { assignedTo }` di `pipeline/page.tsx:17-18`; allineare se no.

**Verifica**: come sales → niente sidebar colleghi né selettore; come admin → invariato.

## 2. REG-347 — Design system Airbnb navy completo + fix mappa

Fonte di verità: `:root` live di `reglo/assets/styles/globals.css` (--primary #1a1a2e, foreground #222222, muted-foreground #6a6a6a, border #dddddd, accent/muted #f7f7f7, destructive #c13515, positive #22C55E, navy scale, gray scale, radius 0.875rem + pill + card-primary 35px, blocco shadows card/panel/cta/dropdown, motion vars, Geist).

**a) Token in `app/globals.css`** — mantengo i NOMI neutri (`ink-*`, `surface*`, `bg`, `border-1/2`) con nuovi valori; **rinomino `pink` → `brand`** (un token che si chiama pink e rende navy è una bugia):
- `--color-brand #1a1a2e`, `--color-brand-50 #eeeef4`, `--color-brand-100 #e2e2e8`; le righe `--color-pink*` vengono ELIMINATE (niente alias: un `text-pink` residuo deve fallire il grep, non risolvere in silenzio).
- Rimappa: primary/ring/sidebar → navy (#1a1a2e, ring #222222); bg/background/sidebar #FAFAF9 → #FFFFFF; ink-900 #0F172A→#222222, ink-700→#33334d, ink-600→#4b4b55, ink-500→#6a6a6a, ink-400→#929292, ink-300→#dddddd; surface-2/secondary/muted/accent → #f7f7f7; border-1/input → #dddddd, border-2 → #f2f2f2; red/destructive → #c13515 (+tinta #faf0ed); green → #22C55E; yellow INVARIATO (funzionale, serve al badge REG-317); chart-1..5 → palette navy/neutri di reglo; radius 0.75→0.875rem + `--radius-pill`.
- **Scope completo (non solo colori)**: adottare il blocco shadows di reglo, le motion vars, il focus ring (#222), gli hover basati su gray-cloud #f7f7f7; scrollbar, ProseMirror selectedCell/handle e `.reglo-links` ri-tematizzati navy. Font: `app/layout.tsx` → `Geist` + `Geist_Mono` da `next/font/google`, aggiornare i tre mapping `--font-*` e l'override `html, body, *`. Passata finale di audit su componenti interattivi (bottoni, input, select, pill, sidebar) per stati hover/focus coerenti con reglo.
- Replace regex repo-wide `pink` → `brand` (prima i suffissi `-50/-100`, poi il base; poi `grep -rn "pink"` deve dare zero hit su classi).

**b) ~200 hex hardcoded in 23 file** — mappa: #EC4899→brand, #FDF2F8→brand-50, #64748B→ink-500, #94A3B8→ink-400, #E2E8F0/#CBD5E1→border-1, #F8FAFC→surface-2, #F1F5F9→border-2, #0F172A/#1E293B/#475569→neutri nuovi, #EF4444/#DC2626/#FEF2F2→destructive+tinta (dove NON sono colori-stage). In `className` → classi token; in `style={}` → `var(--color-…)`. KEEP: hex logo Google, colori identità funzionale (userColor). File prioritari: `calendario-client.tsx` (51), `map-client.tsx` (20), `autoscuola-client.tsx` (19), `commissioni-client.tsx` (15), admin clients, `sign-in`.

**c) Palette funzionali in `lib/constants.ts`** — stage distinguibili ma navy-compatibili:
`da_chiamare #6a6a6a, non_interessato #c13515, follow_up #2563EB, email #0E7490 (era violet in collisione), in_attesa #7C3AED, appuntamento #16A34A, no_show #D97706, cliente #1a1a2e (il "won" porta il brand), non_chiuso #7f1d1d, nuove_features #A855F7`. Nuovi `SALES_COLORS`, `RESOURCE_CATEGORIES`/`NEWS_CATEGORIES` (#EC4899→#1a1a2e).
**ATTENZIONE**: i colori stage vivono ANCHE nella tabella `pipeline_stages` (le card leggono dal DB) e `users.color` ha default `#EC4899` (schema.ts:22) → migrazione con `UPDATE pipeline_stages SET color=…` per stage, `UPDATE users SET color='#1a1a2e' WHERE color='#EC4899'`, `ALTER … SET DEFAULT` (UPDATE appesi a mano al SQL generato). Aggiornare `lib/db/seed.ts`.

**d) Fix mappa** — `map-client.tsx:704` e `home-client.tsx:389` hardcodano `mapId="reglo-map"`/`"reglo-home-map"`: `AdvancedMarker` richiede un Map ID registrato su Google Cloud (candidato n.1); la key `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` c'è in `.env.local` ma non è documentata (forse assente su Vercel).
1. Diagnosi: `pnpm dev` → console su `/pipeline/mappa` (InvalidKeyMapError vs invalid Map ID).
2. Fix: nuova env `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`; se presente → `AdvancedMarker` come oggi; se assente → fallback a `<Marker>` classico senza mapId (piccolo wrapper `MapPin`). Documentare entrambe le env in CLAUDE.md; segnalare di aggiungerle su Vercel.
3. Ri-tematizzare i marker/cluster nella stessa passata.

**Verifica**: `pnpm build`; grep pink/`#EC4899` pulito; smoke visivo di tutte le pagine (sales e admin); mappa con marker visibili.

## 3. REG-295 — Linkify condiviso

Estrarre da `autoscuola-client.tsx:960-1090` in **`components/ui/linkify.tsx`**: `URL_REGEX`, `getEmbedUrl`, `LinkPreviewCard`, `Linkify` (export). Prop opzionale `embeds?: boolean` default true. Applicare a: tab Note (sostituzione import), note contract request (`autoscuola-client.tsx:~1753`), commenti bacheca (`bacheca-client.tsx:250`), commenti risorse (`risorse-client.tsx:311`) — tutti con `whitespace-pre-wrap`. (La timeline attività la copre il task 4.)

## 4. REG-302 — A capo nella timeline attività

Confermato: la textarea del composer (righe 322-328) NON ha onKeyDown — Invio inserisce già il newline; il bug è il rendering (443-447) senza pre-wrap. Fix: aggiungere `whitespace-pre-wrap` + `<Linkify text={a.body} />` al `<p>` del body. Verifica runtime che nessun handler intercetti Invio.

## 5. REG-299 — Attività modificabili

- `activities.userId` esiste (schema.ts:70) → policy: **autore o admin**; `stage_change` resta read-only (system-generated, porterà le motivazioni REG-318).
- Nuova action `updateActivity(id, body)` in `lib/actions/autoscuole.ts`: auth, not found / stage_change → throw, permesso autore-o-admin, update body, revalidate detail. (Verificare in implementazione se per le note il testo vive in title o body e permettere di conseguenza.)
- UI timeline: matita hover-reveal per tipi call/email/meeting/note → `editingActivityId` scambia il `<p>` con textarea + Salva/Annulla (pattern edit del NoteTab, righe 892-958), optimistic update. Passare `userId` nel payload attività e `currentUserId`/`isAdmin` come props se mancanti.

## 6. REG-297 — Filtro Regione in pipeline

Solo `components/pages/pipeline-client.tsx` + import `REGIONI_PROVINCE` (constants.ts:63-84):
- `ActiveFilters` += `region: string | null` (init da URL, sync URL, clearFilters, badge conteggio).
- Predicato in `filtered`: `REGIONI_PROVINCE[filters.region].includes(a.province)`.
- Select "Regione" nel `FilterPopover` sopra Provincia, stesso stile; **la regione restringe le opzioni Provincia** (filtra `provinces`; se la provincia selezionata esce dalla regione → azzerata nello stesso setFilters).

## 7. REG-318 — Motivazione obbligatoria su "Non chiuso"

- Schema: `lostReason: text("lost_reason")` su `autoscuole` → migrazione.
- `updateAutoscuolaStage(id, stageId, opts?)`: per `non_chiuso` richiede `opts.lostReason` (throw se vuoto anche server-side), salva colonna + activity `Stage cambiato a "non_chiuso" — Motivo: …`; uscendo da non_chiuso → `lostReason: null` (la storia resta nell'activity).
- Pipeline `handleDragEnd` (122-144): su `non_chiuso` NIENTE optimistic update → stato `pendingLostMove` + **`LostReasonDialog`** (nuovo componente condiviso `components/lost-reason-dialog.tsx`, shell dal pattern NewOppDialog 562-694): textarea obbligatoria, Annulla → la card torna da sola (nessun update applicato), Conferma → optimistic + action. Guard su drop nella stessa colonna.
- Dettaglio: lo stepper stage (`autoscuola-client.tsx` `handleStageClick`, 128-133) intercetta allo stesso modo con lo stesso dialog.
- Display: card rossa "Motivo non chiuso" in AnagraficaTab quando presente.

## 8. REG-317 — Badge "mese di prova" con countdown

- `TRIAL_DAYS = 30` in constants; schema: `trialStartAt: timestamp("trial_start_at")` → migrazione.
- `updateAutoscuolaStage`: passaggio a `cliente` con `trialStartAt` null → set `new Date()` (mai sovrascrivere se già valorizzata).
- Backfill `scripts/backfill-trial-start.ts` (npx tsx): per clienti senza data, prima activity `stage_change` con body contenente `"cliente"` → suo `createdAt`; log updated/skipped.
- AnagraficaTab: campo data "Inizio periodo di prova" editabile via `updateAutoscuola` (estendere i campi ammessi).
- Card Kanban (477-544): `AutoscuolaFlat` += `trialStartAt`; se stage cliente e data presente: `daysLeft > 0` → pill gialla `bg-yellow-50 text-yellow-600` "Prova: N gg" (posizionata PRIMA dell'evidenza colore cliente); scaduta → pill grigia "Prova terminata". Sync optimistic nel drag verso cliente.

## 9. REG-272 — Allineare "Fissa meeting" al form del Calendario

Scelta pragmatica: **estrarre i campi condivisi, NON rifattorizzare il popover del Calendario** (inscindibile dallo stato draft-block/positioning di FullCalendar → rischio regressione alto, zero guadagno: ha già il feature-set completo).
1. Nuovo `components/event-form-fields.tsx` + hook `useEventForm`: preset `EVENT_PRESETS` (durata + meet default), titolo computato da template, combobox autoscuola (`searchAutoscuole` debounced, email auto-aggiunta agli ospiti), inizio/fine (`DateTimePicker`), ospiti chips, toggle Meet, note; branch follow-up → `setFollowUp` (replicare ESATTAMENTE il formato data che il popover passa oggi), altrimenti `createCalendarEvent({…, autoscuolaId, forUserId})`. Props: `lockedAutoscuola` (prefilled + bloccata dal dettaglio), `salesUsers`+`forUser` (visibile solo se non vuoto — admin-only post REG-270).
2. `MeetingDialog` riscritto come shell modale (overlay, 480px, schermata successo invariata) attorno a `EventFormFields`; dal dettaglio autoscuola passa `lockedAutoscuola` e i `salesUsers` da `getSalesWithGoogle()` (fetch in `autoscuola/[id]/page.tsx`).
3. Popover Calendario invariato (swap meccanico futuro possibile).

**Verifica**: dal dettaglio creare Demo (meet ON, titolo auto, activity in timeline), follow-up (stage → follow_up, followUpAt settata); regression pass sul calendario.

## 10. REG-296 — Telefono nelle viste follow-up/calendario

- `getCalendarEvents` (calendar.ts:51-65): select += `autoscuole.phone` → `autoscuola: {id, name, phone}`; popover dettaglio evento (calendario-client 1277-1291): riga `tel:` con icona sotto il nome.
- /attivita + home: i task follow-up portano `Link CRM: …/autoscuola/{id}` nelle notes (setFollowUp, autoscuole.ts:361); i client già estraggono l'id via regex. Nuova action batch `getAutoscuolePhoneMap(ids)` → `Record<id, {name, phone}>`; le page server la chiamano e passano `phoneMap`; `TaskRow` (entrambi i client) rende link `tel:`.
- Gap da fixare: i task creati dal composer del dettaglio scrivono notes SENZA link (`autoscuola-client.tsx:141-145`) → aggiungere `Link CRM: /autoscuola/${id}` (i vecchi degradano senza telefono, ok).

## 11. REG-319 — "Unisci sedi" (ULTIMO)

**Modello dati: gruppo piatto** — `autoscuole` += `groupId: text` (nullable) + `isGroupPrimary: boolean default false` → migrazione. Zero riscrittura FK: ogni sede tiene attività, documenti, contratti, commissioni, stage, assegnazione propri. Merge/un-merge = solo metadati, reversibile. (Scartati: parent-child — asimmetrico; merge canonico distruttivo — perde storia per-sede e impedisce l'un-merge.)

- Actions (`autoscuole.ts`):
  - `mergeAutoscuole(ids, primaryId)` — admin-only; ≥2 id, primaryId ∈ ids; se un membro ha già un gruppo → assorbe l'intero gruppo esistente; `groupId = grp_${Date.now()}`, primary unico; activity nota su ogni membro; revalidate.
  - `unmergeAutoscuola(id)` — clear; se era primary promuove il primo rimasto; se resta 1 solo membro dissolve il gruppo.
  - `getGroupMembers(groupId)` per i cross-link.
  - **Fix bug cascade in `deleteAutoscuola` (222-233)**: manca il delete di `contractRequests` (FK notNull → violazione) — aggiungerlo; gestire promozione primary se si cancella la principale.
- UI: bottone "Unisci sedi" (admin) nel dettaglio → modale con combobox `searchAutoscuole` multi-select + radio sede principale; card sidebar "Sedi collegate" (link, chip "Principale", "Scollega"); card Kanban: chip `⧉ Gruppo` (brand-50) quando `groupId` presente (`AutoscuolaFlat` += groupId). Pipeline/filtri/commissioni invariati.

**Verifica**: merge 2 sedi → badge + cross-link; unmerge pulito; delete di una sede con contract request funziona; `pnpm build`.

---

## Verifica trasversale

- Dopo ogni task: `pnpm build` (fa anche il type-check) + flusso manuale del task.
- Task con migrazione (2, 7, 8, 11): generate → ispezione SQL → migrate su DB dev PRIMA del codice che usa la colonna.
- Regressione finale completa come `sales` E come `admin`: sign-in, home, pipeline (drag incluso non_chiuso/cliente), mappa, calendario, dettaglio autoscuola (tutti i tab), attivita, bacheca/risorse, admin.
- Linear: `save_issue` → In Progress a inizio task, Done a fine task (11 issue).
- A piano approvato: salvarne copia in `plans/crm/002-reg268-subtasks.md` (convenzione repo) e aggiornare la copia a fine lavori con il riepilogo "what was done".
