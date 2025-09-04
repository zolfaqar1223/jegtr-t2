# KMD Årshjul – README

Dette projekt er et klient-side webapp, der visualiserer aktiviteter i et årshjul og leverer tre centrale visninger: hovedside (administration), kundevisning (delbar, læsbar) og dashboard (overblik/KPI). Koden er modulær og uden backend – data lagres i `localStorage`.

## Indhold
- Funktioner og brugerflow
- Installation og kørsel
- Filstruktur og moduler
- Dataformat og lagring
- Dato/uge-logik (ISO-uger, 24-timers tid)
- Årshjul og kundevisning
- Del med kunde (Share)
- PDF/print opsætning
- UI/UX retningslinjer
- Tastatur og tilgængelighed

## Funktioner og brugerflow
- Opret/redigér/slet aktiviteter på hovedsiden (`index.html`).
- Aktiviteter har: dato, tidsrum (Fra–Til i 24-timers format), titel, ansvarlig, kategori, status, noter og vedhæftninger.
- Aktiviteter vises i liste samt som markører i årshjulet (uge-ringe).
- “Del med kunde” åbner modal, hvor du vælger aktiviteter og evt. kvartaler; der genereres kundevisning eller printbart layout.
- Kundevisningen (`customer.html`) er læsbar med filtre (kategori, status, år) og en “Næste aktivitet”-widget.
- Dashboard (`dashboard.html`) viser KPI/overblik (statisk/klientbaseret).

## Installation og kørsel
1. Klon repo og åbn mappen i en editor.
2. Åbn `index.html` i en browser (Chrome anbefales). Ingen build-step kræves.
3. Data gemmes automatisk i `localStorage`. Eksport/import kan ske via delings-/eksportfunktioner.

## Filstruktur og moduler
- `index.html`, `customer.html`, `dashboard.html` – tre visninger.
- `css/` – globale styles (`styles.css`) og glas-effekter (`glass.css`).
- `js/` – moduler:
  - `main.js` – logik for hovedsiden, share-modal, gem/redigér aktiviteter
  - `store.js` – konstanter, farver, samt `read*/write*` til `localStorage`
  - `wheel.js` – tegning af årshjul (SVG) og kvartalsbokse
  - `list.js` – liste-rendering (administration)
  - `customer.js` – kundevisning, filtre, pan/zoom-kontrol (låsbart)
  - `utils.js` – hjælpefunktioner inkl. `getIsoWeek`, polarkoordinater
  - `modal.js`, `toast.js`, `particles.js` – UI-hjælpere

## Dataformat og lagring
Aktivitet (eksempel):
```json
{
  "id": "uuid",
  "title": "Roadmapmøde",
  "owner": "Navn/Rolle",
  "cat": "Roadmapmøde",
  "status": "Planlagt",
  "date": "2025-10-20T00:00:00.000Z",
  "timeFrom": "09:00",
  "timeTo": "15:00",
  "month": "Oktober",
  "week": 43,
  "isoWeek": 43,
  "note": "...",
  "attachments": [{ "name": "Agenda.pdf", "dataUrl": "..." }]
}
```
- Lagring nøgler: `årshjul.admin.items`, `årshjul.admin.notes`, `årshjul.admin.settings`, `årshjul.admin.changelog`.
- Eksisterende legacy-nøgler læses stadig (fallback).

## Dato/uge-logik
- ISO-uger beregnes i `utils.js:getIsoWeek` og bruges konsekvent (2025/2026 korrekt håndteret).
- 24-timers tidsformat (ingen AM/PM). Valideres via input-pattern `HH:MM`.
- Kvartaler afledes af måned: Q1 (Jan–Mar), Q2 (Apr–Jun), Q3 (Jul–Sep), Q4 (Okt–Dec).

## Årshjul (wheel)
- Tegnes i `wheel.js` vha. SVG: kvartal-, måned- og ugeringe.
- Markører i ugeringen repræsenterer antal aktiviteter; klik åbner måned/uge.
- Midte viser titlen “Årshjul” (årstal skjult på kundesiden).
- Kundevisning har kvartalsbokse i hjørnerne (Q1 øverst højre, Q2 nederst højre, Q3 nederst venstre, Q4 øverst venstre) med kronologisk liste og “Ingen aktiviteter”, hvis tom.
- Hover-popups er slået fra i kundevisningen; kun klik.

## Kundevisning (customer.html)
- Filtre: Kategori, Status, År. Ved ændring:
  - “Næste aktivitet” opdateres
  - Markører og infobobler i hjulet re-tegnes uden animationer
  - Øvrige UI-elementer forbliver statiske
- Pan/Zoom-kontrol findes, men kan låses. Ingen hover-lys på kontrollen.
- Aktivitetslisten: hver aktivitet har en højre “note”-boks for læsbar tekst.
- Tekster er forstørret og med højere kontrast for kundedeling.

## Del med kunde (Share)
- Åbnes via knap på hovedsiden.
- Søg, vælg/deselektér aktiviteter, kvartalchips (Q1–Q4) og vælg handling:
  - Åbn kundevisning i nyt vindue (sender data via `sessionStorage`)
  - Åbn som PDF (print-stil)
  - Kopiér link (hash-baseret `#data=` uden store vedhæftninger)
- Modal har “premium” glaslook og kort med rundede hjørner.

## PDF/print
- To sider i landscape: 1) årshjul med kvartalsbokse, 2) aktiviteter.
- Farver/strukturer er 1:1 så tæt som muligt (`@media print` i `styles.css`).
- Dynamiske elementer skjules; kritiske vises (bubbles statiske, kvartalsbokse ensartede).

## UI/UX retningslinjer
- Farver via CSS-variabler: `--bg`, `--panel`, `--text`, `--accent`, `--q1`–`--q4`, `--neon`.
- Knapper og links har ens størrelser og centreret tekst i header.
- 24-timers tid i hele app’en; ugevisning viser kun ISO-uge (ikke “uge i måned”).
- Hover-effekter på kundesiden er begrænsede for roligt look; ingen overlay over aktivitetsbokse i liste.
- Badges med stærkere kontrast; kort med diskrete skygger.

## Tastatur og tilgængelighed (A11y)
- Modal-knapper har `aria-label` hvor relevant.
- `aria-label` på hjul kan sættes ift. highlightede kvartaler.
- Fokusmarkeringer bibeholdes via standard browserfokus.

## Git workflow
- Standard: `git add -A; git commit -m "<besked>"; git push -u origin main`.
- Alternativ visuel: `git remote -v; git status -sb; git log -1 --oneline; git push -u origin main`.

## Kendte valg og afgrænsninger
- Ingen backend – alt kører i browser og gemmes i `localStorage`.
- `calendar.js`/`upcoming.js` er ikke i aktiv brug i kundevisningen.
- Kvartalstråde (linjer) er deaktiveret i nuværende design.

## Support
Fejl eller forbedringsforslag? Opret et issue eller kontakt teamet.