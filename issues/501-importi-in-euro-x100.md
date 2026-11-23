---
id: 501
title: "Correggere gli importi in euro moltiplicati per 100"
labels: [wayfinder:task]
status: closed
assignee: claude
---

## Question

`euro()` in `src/domain/serviceForm.ts` toglie ogni `.` come separatore delle migliaia: `12.50` diventa 1250 € (riprodotto). Regola proposta: con la virgola i punti sono migliaia (`1.120,50`); senza virgola un solo punto seguito da 1-2 cifre è il decimale (`12.50`), mentre punti seguiti da gruppi di 3 cifre sono migliaia (`1.200`). Test con `12.50`, `12,50`, `1.200`, `1.120,50`, `80`; PR e pubblicazione.

## Risoluzione

- `euro()` in `src/domain/serviceForm.ts`: con la virgola i punti sono migliaia (`1.120,50`); senza virgola i punti sono migliaia solo se seguiti da gruppi di 3 cifre (`1.200`, `1.234.567`), altrimenti sono il decimale (`12.50`, `12.5`). `1,2,3` resta rifiutato.
- Ponytail: `1.200` è sempre milleduecento, mai 1,20 €; per scrivere 1,20 € serve `1,20` o `1.20`.
- Test: `legge importi con punto o virgola decimale e migliaia` in `serviceForm.test.ts` (prima falliva: `12.50` → 1250).
- Importi già salvati sbagliati: non si possono distinguere da importi veri, quindi non c'è correzione automatica; si correggono a mano modificando l'intervento.
