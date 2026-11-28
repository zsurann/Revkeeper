---
id: 608
title: "Allegati dell'ospite persi passando a Google"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: []
---

## Question

Il login cancella i file R2 dell'ospite (`server/api.ts:80-87`), ma il client li tiene `uploaded: 1` e non li ricarica (`src/sync.ts:39,128`). Alla migrazione azzerare `uploaded` (o spostare i file invece di cancellarli). Test.
