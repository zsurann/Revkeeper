---
id: 507
title: "Rinforzi piccoli: file scaricati e clic sulla notifica"
labels: [wayfinder:task]
status: closed
---

## Question

- `getFile` in `server/api.ts` restituisce il file con il tipo dichiarato da chi lo ha caricato: aggiungere `x-content-type-options: nosniff` e servire come `inline` solo immagini e PDF, il resto come `attachment`.
- `notificationclick` in `public/push-sw.js` porta in primo piano la finestra senza andare a `data.url`: usare `focus()` più `navigate(url)`.

PR e pubblicazione.

## Risoluzione

- `fileHeaders` in `server/api.ts`, usata da `getFile`: sempre `x-content-type-options: nosniff`; `inline` solo per immagini raster e PDF, tutto il resto (SVG compreso, che può eseguire script) come `attachment`. L'app scarica i file con `fetch` (`src/db.ts`), quindi non cambia nulla per lei: protegge chi apre il link diretto. Test in `server/api.test.ts` (falliva prima).
- `notificationclick` in `public/push-sw.js`: con una finestra aperta fa `focus()` e poi `navigate(url)`; se `navigate` fallisce (finestra non controllata dal service worker) resta dov'è. Senza finestra apre `url` come prima. Nessun test: il service worker non gira in vitest; controllata la sintassi con `node --check`.
