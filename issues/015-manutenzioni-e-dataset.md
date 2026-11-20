---
id: 15
title: "Manutenzioni: preset, dataset modelli e home"
labels: [wayfinder:task]
status: closed
assignee: claude
blocked_by: []
---

## Question

Creare `data/intervals.json` con lo schema della ricerca sulla fonte degli intervalli: preset per categoria e i primi modelli verificati dai libretti ufficiali (fonte obbligatoria; nessun numero senza fonte). Alla creazione della moto si generano le voci di manutenzione (`origin` model o preset), modificabili. Home: ServiceArc, NextServiceCard e DueList come nella SPEC.

## Resolution

Fatto, tranne i modelli verificati, che sono passati a un ticket nuovo.

- `src/data/intervals.json`: 5 preset (naked, sportiva, adventure, custom, scooter) con `extends`; i valori sono **tipici, non dei costruttori** e l'app lo dice ("valore tipico, controlla il libretto"). `models` è vuoto: nessun numero senza fonte.
- `src/domain/intervals.ts`: risolve modello → preset con eredità e annullamento con `null`; corrispondenza con alias e anni; 3 test.
- Scheda moto: campo "Tipo di moto". Alla creazione la moto riceve le sue voci (`origin` model o preset).
- Home: ServiceArc sopra il contachilometri, NextServiceCard con barra e regola ("a X km o entro …, quello che arriva prima", più la stima), DueList con voci e documenti ordinati per urgenza.
- "Modifica intervalli": cambiare km e mesi (diventano `origin: user`), rimuovere, aggiungere voci libere.
- Correzioni emerse dalla prova: `firstKm` ora è il km assoluto del primo tagliando e vale solo se la moto non l'ha superato (prima una moto usata risultava subito da tagliandare); `progress` aggiunto a `nextDue`.

Verifiche: 15 test, build ok. In Chromium a 390 px: moto adventure da 23.000 km, aggiornata a 23.418, mostra "Catena tra 182 km" e il resto ordinato; voce libera aggiunta; nessun errore in console.
