---
id: 706
title: "Server: piccoli rinforzi"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 700
blocked_by: []
---

## Question

Indice `sessions(expires_at)` per la pulizia a ogni login (n. 16); in `deleteAccount` prima D1 poi R2, così un errore non lascia record senza file (n. 18); niente `sub` di Google negli eventi Sentry del cron (soundcheck n. 9); tetto agli eventi Sentry per esecuzione (n. 12). Test.

## Risoluzione

Indice `sessions(expires_at)` (`migrations/0007_indici.sql`); niente id utente negli errori del cron diretti a Sentry (`who()` in `cron/worker.ts`, anche in `cron/inactive.ts`); al massimo 20 eventi Sentry al minuto per isolate dalle API (test in `functions/api/middleware.test.ts`); tombstone oltre 180 giorni tolti la domenica (decisione di [Pulizia dei record cancellati](701-pulizia-tombstone.md), test in `cron/worker.test.ts`). L'ordine R2 → D1 in `deleteAccount` resta: se D1 fallisce l'account c'è ancora e l'eliminazione si può ripetere; al contrario resterebbero file senza proprietario.
