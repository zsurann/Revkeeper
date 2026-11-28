---
id: 603
title: "Dopo un ripristino del DB: cosa fanno i telefoni"
labels: [wayfinder:grilling]
status: closed
assignee: claude
parent: 600
blocked_by: []
---

## Question

Oggi dopo un ripristino (copia settimanale o Time Travel) le sessioni non esistono più: ogni telefono riceve 401 e svuota IndexedDB, comprese le modifiche non inviate; e `users.rev` torna indietro, quindi gli altri dispositivi non vedono i record nuovi. RIPRISTINO.md conta sui telefoni come copia. Cosa deve succedere: il telefono tiene i dati e li reinvia dopo un nuovo login? il server alza `rev` dopo il ripristino?

## Risoluzione

Decisa dallo sviluppatore il 28/11/2026: **il telefono tiene i dati**. Una sessione scaduta o sconosciuta (401) non svuota più IndexedDB: l'app chiede di rientrare e, al login, reinvia tutto il locale. Il server, quando riceve record da un dispositivo che ha un cursore oltre il proprio `rev`, alza `users.rev` così gli altri telefoni ricevono tutto.
