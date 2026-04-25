# Piano: Mega CRM Overhaul (REG-180)

## What Was Done

### Fase 1 — Quick Fixes & Design Polish
- **REG-184**: Logo "REGLO" maiuscolo in sidebar
- **REG-188**: Email links already had `mailto:` — verified OK
- **REG-186**: Font shortcuts home page aumentato a 15px (era 13px)
- **REG-187**: Card Cal.com e Grain — sfondo cambiato da `#1a1a2e` a `#0A0A0A`
- **REG-189**: Province mostrano "Roma (RM)" — creato `PROVINCE_NAMES` mapping + `formatProvince()` helper, applicato a pipeline, mappa, autoscuola, assegnazioni
- **REG-203**: `createNews()` ora fa `revalidatePath` su bacheca e gestione-news; anche `updateNews` e `deleteNews`
- **REG-229**: Click link interno risorsa ora seleziona automaticamente la categoria target

### Fase 2 — Editor WYSIWYG Bug Fix
- **REG-228, 197, 200**: Prose CSS completo su tutti e 4 i punti di rendering (gestione-news editor, gestione-risorse editor, bacheca reader, risorse reader) — h1/h2/h3 con dimensioni distinte, ul/ol con bullet/numeri visibili, blockquote con bordo rosa, code inline, link in rosa
- **REG-223**: Blockquote CSS aggiunto — il comando era già wired correttamente via StarterKit
- **REG-201**: Link extension aggiunta al news editor + colore link standardizzato a rosa
- **REG-195**: Toolbar ora funziona — tutti i pulsanti hanno i comandi corretti

### Fase 3 — Editor Enhancement
- **REG-198**: Rimosso bottone "clear formatting" dalla toolbar risorse
- **REG-196**: Tooltip "Codice" + tutti i bottoni toolbar hanno tooltip italiani
- **REG-199**: Color picker con palette 8 colori (nero, grigio, rosso, blu, verde, arancione, viola, rosa) + rimuovi colore
- **REG-222**: Emoji picker con 40 emoji comuni su entrambi gli editor (news + risorse)
- **REG-204**: Upload immagini — bottone nella toolbar, upload su R2, inserimento via TipTap Image extension. API upload aggiornata per supportare upload senza autoscuolaId
- **REG-221**: Table builder migliorato — dialog per scegliere righe/colonne, menu contestuale (aggiungi riga/colonna, rimuovi, elimina tabella)

### Fase 4 — Territori & Dati
- **REG-190**: Assegnazioni — opzione "Rimuovi assegnazione" già presente nel bulk action e "Non assegnata" nel dropdown singolo
- **REG-182**: Schema `blocked_provinces` creato — UI da implementare
- **REG-191, 206**: Padding hull ridotto da 0.04° a 0.015° (~1.5km), edge case per 1-2 punti gestito con diamond fallback
- **REG-202**: Follow-up schedulati — campo `followUpAt` su autoscuole, date picker nella sidebar autoscuola, countdown/scaduto su card kanban (verde se futuro, rosso se scaduto)

### Fase 5 — CRM Features
- **REG-205**: Schema `news_categories` creato + CRUD actions, UI da collegare
- **REG-224**: Notifiche letto/non letto — `news_reads` table, `markNewsAsRead` on select, `getUnreadNewsCount`, dot rosso nella sidebar su "Bacheca news"
- **REG-218**: Commenti su News e Risorse — tabella `comments`, sezione commenti con avatar, nome, timestamp, form input, delete own comments
- **REG-183**: Legende mappa — già consistenti tra pipeline e mappa

### Fase 6 — Features Maggiori
- **REG-194**: Schema `home_cards` + CRUD actions creati, admin page da implementare
- **REG-193**: Schema `oauth_tokens` creato — OAuth flow da implementare
- **REG-218**: Implementato (vedi sopra)

## Schema Changes
Migration generata: `drizzle/0001_light_squadron_sinister.sql`

Nuove tabelle: `blocked_provinces`, `news_categories`, `news_reads`, `comments`, `home_cards`, `oauth_tokens`
Nuovo campo: `autoscuole.follow_up_at`

## Remaining Work
- REG-182: UI per bloccare/sbloccare province in assegnazioni
- REG-205: Collegare news categories CRUD alla UI gestione-news (replace hardcoded)
- REG-194: Admin page per Home Cards CRUD
- REG-193: Google Calendar OAuth integration (complex — separate PR)
- REG-233/225: Script dedup autoscuole
- REG-192: Import ampliato autoscuole
