---
id: 705
title: "Sync: nuovi tentativi e aggiornamento al rientro"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 700
blocked_by: []
---

## Question

Dopo un 5xx o 429 il sync non riprova da solo e non si aggiorna quando l'app torna in primo piano (audit 04, n. 15). Riprovare con attesa crescente (rispettando `Retry-After`) e sincronizzare su `visibilitychange`. Test.

## Risoluzione

Dopo un errore temporaneo (rete, 5xx, 429) il sync riprova da solo dopo 30 s, poi raddoppia fino a 15 minuti; si azzera al primo successo. Al ritorno in primo piano (`visibilitychange`) sincronizza. Test in `src/autosync.test.ts`.
