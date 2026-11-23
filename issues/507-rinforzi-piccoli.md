---
id: 507
title: "Rinforzi piccoli: file scaricati e clic sulla notifica"
labels: [wayfinder:task]
status: open
---

## Question

- `getFile` in `server/api.ts` restituisce il file con il tipo dichiarato da chi lo ha caricato: aggiungere `x-content-type-options: nosniff` e servire come `inline` solo immagini e PDF, il resto come `attachment`.
- `notificationclick` in `public/push-sw.js` porta in primo piano la finestra senza andare a `data.url`: usare `focus()` più `navigate(url)`.

PR e pubblicazione.
