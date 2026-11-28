---
id: 710
title: "Test e2e instabile: gesture.e2e.ts:168"
labels: [wayfinder:task]
status: closed
assignee: claude
parent: 700
blocked_by: [704]
---

## Question

Fallisce circa 1 volta su 3 nella suite completa, passa da solo. Trovare la causa (attese, stato condiviso) e correggerla senza saltare il test.

## Risoluzione

Causa: nella modalità Safari da browser lo swipe dal bordo in Chromium fa tornare indietro il browser stesso circa una volta su due (come Safari vero), e il test pretendeva che la schermata restasse aperta. L'app era corretta. Il test ora verifica l'invariante vera: schermata e cronologia restano allineate. 16 ripetizioni su 16 verdi; suite Chromium completa 39 passati.
