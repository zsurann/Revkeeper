---
id: 611
title: "Cron promemoria che regge tutti gli utenti"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: [602]
---

## Question

`remind_at` aggiornato prima del lavoro pesante, ordine che ruota, formatter `Intl` riusati, query contate sul limite, avviso del tetto a Sentry e non solo `console.warn`, `checkQuota` anche nel giro orario. Copia settimanale a pezzi. Dimensioni secondo [Piano Cloudflare](602-piano-cloudflare.md). `cron/worker.ts`, `cron/backup.ts`, `server/reminders.ts`.

## Risoluzione

- Il giro gira ogni 10 minuti (`cron/wrangler.toml`) con query fisse: utenti in scadenza, record e iscrizioni di tutti i candidati in due query, un batch per gli aggiornamenti.
- `remind_at` si aggiorna prima degli invii; chi non entra nel tetto resta in coda per il giro dopo.
- Formatter `Intl` riusati per fuso (`server/reminders.ts`).
- Tetti raggiunti ⇒ `console.error` (evento Sentry), non più `console.warn`.
- `checkQuota` una volta all'ora: oltre l'80% accende `guests_closed`.
- Non fatto: copia settimanale a pezzi (`cron/backup.ts`). Con il DB di oggi (100 kB) non serve; resta nella nebbia della mappa.
