---
id: 621
title: "Sentry leggero sulle API"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Misurato il 28/11/2026 su 1.962 richieste: CPU p50 7 ms, p99 34,5 ms (limite 10 ms). L'SDK completo in `functions/api/_middleware.ts` è lo stesso che nel cron costava ~10 ms. Sostituirlo con l'invio diretto degli errori (come `cron/sentryLite.ts`) e rimisurare.

## Risoluzione

`functions/api/_middleware.ts` senza SDK: i `console.error` di una richiesta (separati per richiesta con `AsyncLocalStorage`) diventano un evento inviato dopo la risposta (`errorEnvelope` in `cron/sentryLite.ts`); id nei percorsi mascherati. Tolti `@sentry/cloudflare` e `server/sentry.ts`; le Functions passano a 72 kB. Test in `functions/api/middleware.test.ts`. Da rimisurare la CPU dopo il deploy (prima: p50 7 ms, p99 34,5 ms). Persi i trace al 5%.
