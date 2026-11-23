---
id: 505
title: "Usare la data locale invece di quella UTC"
labels: [wayfinder:task]
status: closed
---

## Question

`today()` (`App.tsx`, `Services.tsx`, `Documents.tsx`) e `startDate` in `domain/bikeForm.ts` usano `toISOString().slice(0, 10)`, cioè la data UTC: in Italia tra 00:00 e 01:00 (02:00 d'estate) letture e interventi prendono la data di ieri e le scadenze si calcolano sul giorno sbagliato. Un solo `today()` locale in `src/format.ts` usato ovunque, con un test che fissa l'ora a 00:30 Europe/Rome. PR e pubblicazione.

## Risoluzione

`today()` in `src/format.ts` calcola la data nel fuso del dispositivo; usata in `App.tsx`, `Services.tsx`, `Documents.tsx` e `domain/bikeForm.ts` al posto delle copie UTC. Test `src/format.test.ts` (00:30 Europe/Rome, falliva prima). `domain/due.ts` resta in UTC: lavora su date già AAAA-MM-GG, non sull'ora corrente.
