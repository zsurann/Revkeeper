---
id: 701
title: "Pulizia dei record cancellati: dopo quanto tempo?"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 700
blocked_by: []
---

## Question

I tombstone (record cancellati) restano in D1 per sempre e contano nel tetto di record. Si possono togliere dopo N giorni, ma un telefono rimasto offline più a lungo farebbe ricomparire ciò che era stato cancellato. Quanti giorni? E cosa fa un telefono che torna dopo quel limite (riparte da zero dal server)?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: **180 giorni**. Il cron della domenica toglie i tombstone più vecchi di 180 giorni e aggiorna il contatore dei record.
