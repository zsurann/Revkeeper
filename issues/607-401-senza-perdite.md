---
id: 607
title: "Non perdere le modifiche non inviate su un 401"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: [603]
---

## Question

Un 401 svuota IndexedDB anche con record `dirty` (`src/sync.ts:114-117`). Le sessioni durano 180 giorni fissi, senza rinnovo (`server/api.ts:18,93`). Rinnovo scorrevole della sessione e nessuna cancellazione di dati non inviati; il comportamento dopo un ripristino segue [Dopo un ripristino del DB: cosa fanno i telefoni](603-ripristino-e-telefoni.md).

## Risoluzione

- Un 401 non svuota più IndexedDB: `sessionLost` in `src/sync.ts` toglie solo l'account, spegne la push locale e avvisa "Accesso scaduto"; al nuovo accesso `markAllDirty` reinvia tutto.
- Sessione scorrevole: `sessionOf` in `server/api.ts` la riporta a 180 giorni (con nuovo cookie) quando ne restano meno di 150; al massimo una scrittura ogni 30 giorni.
- `pull` con cursore oltre `users.rev` (DB ripristinato) risponde cursore 0: il telefono riparte da zero senza perdere i dati locali più recenti. Passo `rev + 1000000` aggiunto a RIPRISTINO.md.
- Test: `src/logout.test.ts`, `server/handle.test.ts`.
