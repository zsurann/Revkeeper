---
id: 503
title: "Recuperare i record già persi dal pull?"
labels: [wayfinder:grilling]
status: closed
blocked_by: [502]
---

## Question

Corretto il pull, i dispositivi che hanno già saltato dei record non li riceveranno più, perché il loro cursore è oltre quei record. Serve un recupero una tantum (per esempio cursore a 0 e pull completo al primo avvio dopo l'aggiornamento, che non tocca i record locali più recenti), o dall'azzeramento del 21/11 nessuno ha abbastanza dati da essere colpito?

## Risoluzione

Deciso dallo sviluppatore (23/11/2026): nessun recupero. I record eventualmente saltati prima della correzione del pull non vengono recuperati.
