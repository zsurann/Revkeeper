---
id: 603
title: "Dopo un ripristino del DB: cosa fanno i telefoni"
labels: [wayfinder:grilling]
status: open
parent: 600
blocked_by: []
---

## Question

Oggi dopo un ripristino (copia settimanale o Time Travel) le sessioni non esistono più: ogni telefono riceve 401 e svuota IndexedDB, comprese le modifiche non inviate; e `users.rev` torna indietro, quindi gli altri dispositivi non vedono i record nuovi. RIPRISTINO.md conta sui telefoni come copia. Cosa deve succedere: il telefono tiene i dati e li reinvia dopo un nuovo login? il server alza `rev` dopo il ripristino?
