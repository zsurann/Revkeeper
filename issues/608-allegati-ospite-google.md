---
id: 608
title: "Allegati dell'ospite persi passando a Google"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Il login cancella i file R2 dell'ospite (`server/api.ts:80-87`), ma il client li tiene `uploaded: 1` e non li ricarica (`src/sync.ts:39,128`). Alla migrazione azzerare `uploaded` (o spostare i file invece di cancellarli). Test.

Dopo [Gli ospiti sul server](601-ospiti-e-tetti.md) i nuovi ospiti non caricano più file: resta da sistemare chi ha già allegati `uploaded: 1` caricati da ospite.

## Risoluzione

`markAllDirty` (al login Google) azzera `uploaded` sugli allegati che hanno il file sul telefono, così vengono ricaricati dopo che il server ha cancellato quelli dell'ospite. Test in `src/logout.test.ts`.
