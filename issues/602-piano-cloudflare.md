---
id: 602
title: "Piano Cloudflare: restare sul gratuito?"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Sul gratuito: 10 ms di CPU per invocazione, 50 query D1 per richiesta, 100k righe scritte al giorno, 5 M lette. Il cron dei promemoria regge ~16 utenti all'ora, la copia settimanale salta verso 1k utenti. Con Workers Paid (5 $/mese) i limiti salgono di molto. Si resta sul gratuito e si riscrive cron/backup per starci, o si passa al piano a pagamento al lancio?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: **si resta sul piano gratuito**. Cron e copia vanno riscritti per stare nei limiti (10 ms di CPU, 50 query D1 per invocazione, 100k righe scritte al giorno): promemoria con ordine che ruota e query contate, copia del DB a pezzi, avvisi a Sentry quando un tetto si avvicina. Il passaggio a Workers Paid si valuta quando arrivano gli avvisi.
