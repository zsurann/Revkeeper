---
id: 607
title: "Non perdere le modifiche non inviate su un 401"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: [603]
---

## Question

Un 401 svuota IndexedDB anche con record `dirty` (`src/sync.ts:114-117`). Le sessioni durano 180 giorni fissi, senza rinnovo (`server/api.ts:18,93`). Rinnovo scorrevole della sessione e nessuna cancellazione di dati non inviati; il comportamento dopo un ripristino segue [Dopo un ripristino del DB: cosa fanno i telefoni](603-ripristino-e-telefoni.md).
