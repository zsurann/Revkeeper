---
id: 606
title: "Sync: pagine bloccate e lotti oltre 50 query"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Correggere: `deleteBike` scrive tutti i tombstone con un solo `rev` e oltre 500 righe `pageOf` risponde pagina vuota con `more: true` (loop infinito del pull, push fermi); un lotto con più di ~15 allegati eliminati supera le 50 query D1. Un test per ciascuno che prima fallisce. `server/api.ts:154-178, 501-519`.

## Risoluzione

- `deleteBike` alza `rev` a ogni blocco di 50: nessuna pagina di pull resta piena dello stesso rev.
- `pull`: se la pagina è tutta di un solo rev (dati vecchi), quel rev arriva intero.
- `push`: gli allegati cancellati si liberano con una query e un batch per tutto il lotto (prima 3 query per allegato).
- Test in `server/handle.test.ts` (601 record dopo l'eliminazione di una moto, 520 righe vecchie sullo stesso rev, 30 allegati cancellati in meno di 15 query); falliscono sul codice di prima.
