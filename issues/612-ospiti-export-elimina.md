---
id: 612
title: "Ospiti: scaricare ed eliminare i propri dati"
labels: [wayfinder:task]
status: open
parent: 600
blocked_by: [601]
---

## Question

L'informativa promette export ed eliminazione da Account (`src/Legal.tsx:41`) ma gli ospiti non li hanno; "Disattiva" toglie solo la push (`server/api.ts:609-612`). Mostrare "I tuoi dati" anche agli ospiti riusando `deleteAccount()`, o correggere la frase se l'ospite non avrà più dati sul server.

Dopo [Gli ospiti sul server](601-ospiti-e-tetti.md) gli ospiti non hanno più file sul server, ma hanno ancora i record (targa, telaio): export ed eliminazione servono comunque.
