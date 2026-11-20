---
id: 202
title: "Integrare gli intervalli e pubblicare"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: [201]
---

## Question

Aggiungere i modelli trovati a `src/data/intervals.json` con nomi e alias allineati al catalogo, test sui valori chiave (come per la Z650), prova E2E (moto nuova → voci "dal libretto") e PR.

## Resolution

Fatto. I 6 modelli della ricerca sono in `src/data/intervals.json`: Honda SH125i, SH150i e SH350i, Yamaha MT-07 2021–2024 e Tracer 7, BMW R 1300 GS. I nomi coincidono con il catalogo, quindi `findModel` li trova anche tramite gli alias ("SH 125", "MT07", "R1300GS").

Test: 33 passati. I nuovi controllano l'olio della SH125i (1.000 km, poi 6.000 km o 12 mesi) e la MT-07 presa dal libretto solo dal 2021 al 2024. La fixture dei preset ora usa una moto senza libretto, perché la MT-07 dal 2021 è nel dataset.

E2E: una Honda SH125i 2022 nuova riceve 13 voci "dal libretto" e nessuna "valore tipico"; nessun errore.
