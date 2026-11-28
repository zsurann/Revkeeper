---
id: 611
title: "Cron promemoria che regge tutti gli utenti"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: [602]
---

## Question

`remind_at` aggiornato prima del lavoro pesante, ordine che ruota, formatter `Intl` riusati, query contate sul limite, avviso del tetto a Sentry e non solo `console.warn`, `checkQuota` anche nel giro orario. Copia settimanale a pezzi. Dimensioni secondo [Piano Cloudflare](602-piano-cloudflare.md). `cron/worker.ts`, `cron/backup.ts`, `server/reminders.ts`.
