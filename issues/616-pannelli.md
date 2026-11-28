---
id: 616
title: "Controlli nei pannelli Cloudflare e Sentry"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Fuori dal codice, li fa lo sviluppatore: piano reale dell'account e avvisi di spesa; permessi di `CLOUDFLARE_API_TOKEN`; binding D1/R2 delle anteprime di Pages (oggi senza `[env.preview]` usano la produzione); Sentry con "non salvare gli IP" attivo; CPU reale con `wrangler tail` (`cpuTime`) e righe D1 lette/scritte al giorno.

## Risoluzione

Controllato con l'API di Cloudflare il 28/11/2026:

- **Piano:** Workers gratuito; R2 con fatturazione attiva (oltre 10 GB si paga: per questo gli ospiti non caricano più file).
- **Avvisi di spesa:** attivo "Default budget alert".
- **Anteprime di Pages:** usavano D1 e R2 di produzione, per ogni branch. Deciso in [Anteprime dei branch sui dati di produzione](617-anteprime-separate.md).
- **Migrazione `0006_tetti.sql`:** applicata in produzione prima del merge (1 utente, 29 record contati).

Restano allo sviluppatore (fuori dall'API raggiungibile da qui):

- [ ] Sentry → progetto revkeeper-api → Settings → Security & Privacy: "Prevent Storing of IP Addresses" attivo.
- [ ] Permessi di `CLOUDFLARE_API_TOKEN` nei secret di GitHub: solo Workers Scripts:Edit (per il cron), nient'altro.
- [ ] CPU reale: `npx wrangler tail revkeeper-cron` per un giro e guardare `cpuTime` (sotto i 10 ms).
