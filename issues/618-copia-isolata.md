---
id: 618
title: "Copia settimanale che non trascina giù gli altri lavori"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

La copia del DB sta tutta in memoria in una sola esecuzione (`cron/backup.ts`); se fallisce saltano anche pulizia inattivi e controllo quota (`cron/worker.ts`). Ogni lavoro della domenica gira da solo e un errore non ferma gli altri; avviso a Sentry quando la copia si avvicina al limite, così il passaggio a pezzi o al piano a pagamento arriva in tempo.

## Risoluzione

Copia, pulizia inattivi e quota girano ognuna in `step()` (`cron/worker.ts`): un errore diventa evento Sentry e non ferma le altre (test in `cron/worker.test.ts`). Oltre 50.000 righe la copia avvisa Sentry (`WARN_ROWS` in `cron/backup.ts`): è il segnale per dividerla su più giri o passare a Workers Paid.
