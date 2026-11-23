---
id: 505
title: "Usare la data locale invece di quella UTC"
labels: [wayfinder:task]
status: open
---

## Question

`today()` (`App.tsx`, `Services.tsx`, `Documents.tsx`) e `startDate` in `domain/bikeForm.ts` usano `toISOString().slice(0, 10)`, cioè la data UTC: in Italia tra 00:00 e 01:00 (02:00 d'estate) letture e interventi prendono la data di ieri e le scadenze si calcolano sul giorno sbagliato. Un solo `today()` locale in `src/format.ts` usato ovunque, con un test che fissa l'ora a 00:30 Europe/Rome. PR e pubblicazione.
