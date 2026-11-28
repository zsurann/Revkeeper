---
id: 614
title: "Peso al primo caricamento e PWA"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: []
---

## Question

`main.tsx` importa `App` e `Legal` subito: la pagina di installazione scarica 515 kB (usare `lazy()`); `Mark.tsx` importa `animate` e scavalca `LazyMotion`; `loadBrand` senza `.catch` offline (`BikeForm.tsx:102`); manifest senza `id`; `/.well-known/assetlinks.json` risponde con HTML. Dettagli in [05-pwa-perf.md](../docs/audit-2026-11-28/05-pwa-perf.md).
