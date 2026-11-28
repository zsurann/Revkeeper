---
id: 620
title: "Export dei dati senza CRC dei file sul server"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

`/account/export` calcola il CRC32 in JS di tutti i file (~46 ms ogni 15 MB) e li tiene in memoria. Il server consegna solo `dati.json`; il telefono scarica i file uno per uno (`/api/files/:id`, nessuna CPU) e compone lo ZIP con lo stesso `server/zip.ts`.

## Risoluzione

`/account/export` restituisce solo `dati.json`; `buildAccountExport` in `src/sync.ts` scarica i file da `/api/files/:id` e compone lo ZIP sul telefono con `server/zip.ts`. Test in `server/handle.test.ts` (lo ZIP composto contiene dati e file).
