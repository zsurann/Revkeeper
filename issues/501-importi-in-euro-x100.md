---
id: 501
title: "Correggere gli importi in euro moltiplicati per 100"
labels: [wayfinder:task]
status: open
---

## Question

`euro()` in `src/domain/serviceForm.ts` toglie ogni `.` come separatore delle migliaia: `12.50` diventa 1250 € (riprodotto). Regola proposta: con la virgola i punti sono migliaia (`1.120,50`); senza virgola un solo punto seguito da 1-2 cifre è il decimale (`12.50`), mentre punti seguiti da gruppi di 3 cifre sono migliaia (`1.200`). Test con `12.50`, `12,50`, `1.200`, `1.120,50`, `80`; PR e pubblicazione.
