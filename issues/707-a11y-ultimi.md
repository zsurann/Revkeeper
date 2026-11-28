---
id: 707
title: "Accessibilità: ultimi punti"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 700
blocked_by: []
---

## Question

Dal report 06: A-04 nome accessibile dell'header, A-08 editor foto anche senza trascinare, A-09 bersagli piccoli negli allegati, A-10 errori annunciati come alert, A-11 `aria-invalid` sul campo vuoto, A-12 `aria-selected` nel combobox, A-13 doppio annuncio dei toast, A-14 messaggio d'errore grezzo.

## Risoluzione

A-04 nome accessibile che contiene il testo visibile; A-08 frecce da tastiera e quattro pulsanti nell'editor foto; A-09 `hitbox` sui pulsanti piccoli degli allegati; A-10 errori con `role=alert`; A-11 `aria-invalid` sul campo vuoto; A-12 `aria-selected` solo sull'opzione scelta; A-13 una sola regione live per i toast (avvisi 7 s); A-14 niente messaggio tecnico nella schermata d'errore. Nessun test automatico: verificati con build ed e2e.
