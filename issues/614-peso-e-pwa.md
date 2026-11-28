---
id: 614
title: "Peso al primo caricamento e PWA"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

`main.tsx` importa `App` e `Legal` subito: la pagina di installazione scarica 515 kB (usare `lazy()`); `Mark.tsx` importa `animate` e scavalca `LazyMotion`; `loadBrand` senza `.catch` offline (`BikeForm.tsx:102`); manifest senza `id`; `/.well-known/assetlinks.json` risponde con HTML. Dettagli in [05-pwa-perf.md](../docs/audit-2026-11-28/05-pwa-perf.md).

## Risoluzione

`App` caricata con `lazy()`: il blocco iniziale passa da 515 kB a 299 kB e l'avviso sparisce. `loadBrand` offline senza errore. Manifest con `id`. Non fatto: `Mark.tsx` con `animate` (ora pesa solo nel blocco dell'app) e `assetlinks.json` (Play Store fuori dalla mappa).
