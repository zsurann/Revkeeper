---
id: 506
title: "Allineare client e server sul pareggio di orario nel sync"
labels: [wayfinder:task]
status: closed
---

## Question

A parità di `updatedAt` il server sceglie il `device_id` più grande, mentre il client in `pullAll` tiene sempre la copia locale (`>=`): due dispositivi possono restare diversi per sempre. Applicare in `pullAll` la stessa regola del server, con un test. Raro ma economico. PR e pubblicazione.

## Risoluzione

`keepLocal` in `src/sync.ts`, usata da `pullAll`: vince l'orario più recente; a pari orario una copia locale già sincronizzata cede a quella del server (che ha già scelto), una modifica locale non ancora inviata vince solo se il suo `deviceId` è più grande, come farà il server al push. Test `src/sync.test.ts` (falliva prima). Nessun cambio al server.
