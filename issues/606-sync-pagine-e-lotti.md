---
id: 606
title: "Sync: pagine bloccate e lotti oltre 50 query"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: []
---

## Question

Correggere: `deleteBike` scrive tutti i tombstone con un solo `rev` e oltre 500 righe `pageOf` risponde pagina vuota con `more: true` (loop infinito del pull, push fermi); un lotto con più di ~15 allegati eliminati supera le 50 query D1. Un test per ciascuno che prima fallisce. `server/api.ts:154-178, 501-519`.
