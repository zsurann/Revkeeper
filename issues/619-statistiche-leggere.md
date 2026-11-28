---
id: 619
title: "Statistiche admin senza scansioni complete"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

`stats` in `server/api.ts` legge `records` per intero quattro volte a ogni apertura: a 10k utenti bastano poche aperture per superare i 5 M di righe lette al giorno. Attivi da `users.seen_at`, totale record da `users.records`, una sola scansione per tipo e marche, risultato tenuto un'ora.

## Risoluzione

Attivi a 7/30 giorni da `users.seen_at` (ultima apertura dell'app, non ultima modifica); `records` letta 2 volte invece di 4; risultato tenuto un'ora per database. Test aggiornato in `server/handle.test.ts`.
